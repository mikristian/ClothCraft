// Experimental source-only preflight. This is not a manufacturing certification.
const EPS = 1e-8
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const finite = v => Number.isFinite(v)
const fail = (code, detail) => ({code, detail})
const near = (a, b) => Math.abs(a - b) <= EPS
const same = (a, b) => near(a.x, b.x) && near(a.y, b.y)

function parsePairs(source) {
  if (typeof source !== 'string' || !source.trim()) throw Error('DXF source must be nonempty text')
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  if (lines.length % 2) throw Error('DXF has incomplete group-code pair')
  const pairs = []
  for (let i = 0; i < lines.length; i += 2) {
    const raw = lines[i].trim()
    if (!/^\d+$/.test(raw)) throw Error('DXF contains invalid group code at line ' + (i + 1))
    pairs.push({code: Number(raw), value: lines[i + 1].trim()})
  }
  return pairs
}
function numeric(value, label) {
  if (value === '' || !finite(Number(value))) throw Error('invalid ' + label)
  return Number(value)
}
function attrs(pairs, start, end) {
  const map = new Map()
  for (let i = start; i < end; i++) {
    const {code, value} = pairs[i]
    if (!map.has(code)) map.set(code, [])
    map.get(code).push(value)
  }
  return map
}
function one(map, code, label, required = true) {
  const entries = map.get(code) || []
  if (entries.length > 1 || (required && entries.length !== 1)) throw Error('invalid ' + label + ' multiplicity')
  return entries[0]
}
function checkZeroWidth(map, code, label, repeated = false) {
  const values=map.get(code) || []
  if (!repeated && values.length>1) throw Error('invalid '+label+' multiplicity')
  for (const value of values) {
    if (numeric(value,label)!==0) throw Error('unsupported nonzero '+label)
  }
}
function parsePolyline(pairs, begin, end) {
  let next = begin + 1
  while (next < end && pairs[next].code !== 0) next++
  const head = attrs(pairs, begin + 1, next)
  const layer = one(head, 8, 'POLYLINE layer', false) || '0'
  const flags = numeric(one(head, 70, 'POLYLINE flags', false) ?? '0', 'POLYLINE flags')
  if (layer.startsWith('CUT_')) for (const code of [40,41]) checkZeroWidth(head,code,'CUT POLYLINE default width '+code)
  if(layer.startsWith('CUT_') && one(head,66,'CUT POLYLINE vertices-follow')!=='1') throw Error('invalid CUT POLYLINE vertices-follow')
  const points = []
  let done = false
  while (next < end) {
    if (pairs[next].code !== 0) throw Error('malformed POLYLINE sequence')
    const kind = pairs[next].value
    let stop = next + 1
    while (stop < end && pairs[stop].code !== 0) stop++
    if (kind === 'SEQEND') { next = stop; done = true; break }
    if (kind !== 'VERTEX') throw Error('POLYLINE missing SEQEND')
    const a = attrs(pairs, next + 1, stop)
    if (layer.startsWith('CUT_')) {
      if (a.has(42)) throw Error('CUT vertex bulge unsupported')
      const vertexLayer=one(a,8,'CUT vertex layer',false)
      if(vertexLayer!==undefined && vertexLayer!==layer) throw Error('CUT vertex layer differs from parent')
      if (numeric(one(a, 70, 'vertex flags', false) ?? '0', 'vertex flags') !== 0) throw Error('unsupported CUT vertex flags')
      for (const code of [40,41]) checkZeroWidth(a,code,'CUT VERTEX width '+code)
      for (const [code, expected, label] of [[30,0,'z'],[38,0,'elevation'],[39,0,'thickness'],[210,0,'extrusion x'],[220,0,'extrusion y'],[230,1,'extrusion z']]) {
        const value=one(a,code,'CUT vertex '+label,false)
        if(value!==undefined && numeric(value,'CUT vertex '+label)!==expected) throw Error('nonplanar CUT vertex '+label)
      }
      points.push({x: numeric(one(a, 10, 'vertex x'), 'vertex x'), y: numeric(one(a, 20, 'vertex y'), 'vertex y')})
    }
    next = stop
  }
  if (!done) throw Error('unterminated POLYLINE')
  if (layer.startsWith('CUT_') && flags !== 1 && flags !== 129) throw Error('CUT POLYLINE must be closed planar 2D without fit, spline or mesh flags')
  return {next, contour: layer.startsWith('CUT_') ? {layer, points} : null}
}
function parseLightPolyline(pairs, begin, end) {
  const a = attrs(pairs, begin + 1, end)
  const layer = one(a, 8, 'LWPOLYLINE layer', false) || '0'
  if (!layer.startsWith('CUT_')) return null
  if (a.has(42)) throw Error('CUT bulge unsupported')
  for (const code of [40,41]) checkZeroWidth(a,code,'CUT LWPOLYLINE vertex width '+code,true)
  checkZeroWidth(a,43,'CUT LWPOLYLINE constant width 43')
  let hasVertex=false, seenWidths=new Set()
  for (let i=begin+1;i<end;i++) {
    const code=pairs[i].code
    if (code===10) { hasVertex=true; seenWidths=new Set(); continue }
    if (code!==40 && code!==41) continue
    if (!hasVertex) throw Error('CUT LWPOLYLINE width before first vertex')
    if (seenWidths.has(code)) throw Error('duplicate CUT LWPOLYLINE width on one vertex')
    seenWidths.add(code)
  }
  const flags = numeric(one(a, 70, 'LWPOLYLINE flags', false) ?? '0', 'flags')
  if (flags !== 1 && flags !== 129) throw Error('CUT LWPOLYLINE must be closed 2D without unsupported flags')
  const xs = a.get(10) || [], ys = a.get(20) || []
  if (xs.length !== ys.length || numeric(one(a, 90, 'point count'), 'point count') !== xs.length) throw Error('CUT LWPOLYLINE vertex count mismatch')
  return {layer, points: xs.map((x, i) => ({x: numeric(x, 'x'), y: numeric(ys[i], 'y')}))}
}
function parseCuts(source) {
  const pairs = parsePairs(source)
  const contours = []
  let inEntities = false, sawEntities = false, ended = false
  for (let i = 0; i < pairs.length;) {
    const p = pairs[i]
    if (p.code !== 0) { i++; continue }
    if (p.value === 'SECTION') {
      if (pairs[i + 1]?.code !== 2) throw Error('SECTION has no name')
      inEntities = pairs[i + 1].value === 'ENTITIES'
      if (inEntities) sawEntities = true
      i += 2; continue
    }
    if (p.value === 'ENDSEC') { inEntities = false; i++; continue }
    if (p.value === 'EOF') { ended = true; break }
    if (!inEntities) { i++; continue }
    let end = i + 1
    while (end < pairs.length && pairs[end].code !== 0) end++
    if (p.value === 'POLYLINE') {
      const result = parsePolyline(pairs, i, pairs.length)
      if (result.contour) contours.push(result.contour)
      i = result.next; continue
    }
    if (p.value === 'LWPOLYLINE') {
      const cut = parseLightPolyline(pairs, i, end)
      if (cut) contours.push(cut)
    } else {
      const layer = one(attrs(pairs, i + 1, end), 8, 'entity layer', false)
      if (layer?.startsWith('CUT_')) throw Error('unsupported CUT entity: ' + p.value)
    }
    i = end
  }
  if (!sawEntities || !ended) throw Error('DXF missing ENTITIES section or EOF')
  if (!contours.length) throw Error('DXF contains no physical CUT contours')
  return contours
}
function onSegment(a, b, p) {
  return Math.abs(cross(a, b, p)) < EPS && p.x >= Math.min(a.x,b.x)-EPS &&
    p.x <= Math.max(a.x,b.x)+EPS && p.y >= Math.min(a.y,b.y)-EPS && p.y <= Math.max(a.y,b.y)+EPS
}
function intersect(a,b,c,d) {
  const p = cross(a,b,c), q = cross(a,b,d), r = cross(c,d,a), s = cross(c,d,b)
  if ((p > EPS && q < -EPS || p < -EPS && q > EPS) && (r > EPS && s < -EPS || r < -EPS && s > EPS)) return true
  return onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b)
}
function validate(contour) {
  const p = contour.points
  if (p.length > 4096 || p.length < 3) throw Error('CUT polygon requires 3 to 4096 vertices')
  if (p.some(v => !finite(v.x) || !finite(v.y))) throw Error('nonfinite CUT coordinates')
  if (same(p[0], p.at(-1))) p.pop() // Explicit repeated closure is harmless.
  if (p.length < 3) throw Error('degenerate CUT polygon')
  let area = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i+1)%p.length]
    if (same(a,b)) throw Error('zero-length CUT edge')
    area += a.x*b.y-b.x*a.y
  }
  if (Math.abs(area) <= EPS) throw Error('zero-area CUT polygon')
  for (let i = 0; i < p.length; i++) for (let j = i+1; j < p.length; j++) {
    if (j === i+1 || (i === 0 && j === p.length-1)) continue
    if (intersect(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length])) throw Error('self-intersecting CUT polygon')
  }
  return contour
}
function horizontalIntervals(poly, y) {
  const xs = []
  for (let i = 0; i < poly.length; i++) {
    const a=poly[i], b=poly[(i+1)%poly.length]
    if ((a.y < y && b.y > y) || (b.y < y && a.y > y)) xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y))
  }
  xs.sort((a,b)=>a-b)
  if (xs.length%2) throw Error('invalid polygon scanline')
  const intervals=[]
  for(let i=0;i<xs.length;i+=2) if(xs[i+1]-xs[i]>EPS) intervals.push([xs[i],xs[i+1]])
  return intervals
}
function overlap(a,b) {
  const ya=a.map(p=>p.y), yb=b.map(p=>p.y)
  const levels=[...ya,...yb]
  // Split at crossings too: the ordering of scanline edges can change there.
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) {
    const p=a[i], q=a[(i+1)%a.length], r=b[j], s=b[(j+1)%b.length]
    const den=(q.x-p.x)*(s.y-r.y)-(q.y-p.y)*(s.x-r.x)
    if(Math.abs(den)<=EPS) continue
    const t=((r.x-p.x)*(s.y-r.y)-(r.y-p.y)*(s.x-r.x))/den
    const u=((r.x-p.x)*(q.y-p.y)-(r.y-p.y)*(q.x-p.x))/den
    if(t>0 && t<1 && u>0 && u<1) levels.push(p.y+t*(q.y-p.y))
  }
  levels.sort((x,y)=>x-y)
  for(let i=1;i<levels.length;i++) {
    if(levels[i]-levels[i-1]<=EPS) continue
    const y=(levels[i]+levels[i-1])/2
    const ia=horizontalIntervals(a,y), ib=horizontalIntervals(b,y)
    for(const x of ia) for(const z of ib) if(Math.min(x[1],z[1])-Math.max(x[0],z[0])>EPS) return true
  }
  return false
}
export function preflightPhysicalCutOverlap20261023_2000(dxf) {
  try {
    const contours=parseCuts(dxf).map(validate)
    const layers = new Set()
    for (const contour of contours) {
      if (layers.has(contour.layer)) throw Error('duplicate physical CUT layer: ' + contour.layer)
      layers.add(contour.layer)
    }
    const overlaps=[]
    for(let i=0;i<contours.length;i++) for(let j=i+1;j<contours.length;j++) {
      if(overlap(contours[i].points,contours[j].points)) overlaps.push({
        firstIndex:i,secondIndex:j,firstLayer:contours[i].layer,secondLayer:contours[j].layer,
        code:'PHYSICAL_CUT_INTERIOR_OVERLAP'
      })
    }
    return {ok:overlaps.length===0,contourCount:contours.length,overlaps,
      diagnostics:overlaps.map(o=>fail(o.code, o.firstLayer+' intersects '+o.secondLayer)),
      manufacturingApproved:false}
  } catch(error) {
    return {ok:false,contourCount:0,overlaps:[],diagnostics:[fail('INVALID_CUT_DXF',String(error.message))],manufacturingApproved:false}
  }
}
