/** Read-only SVG geometry for an explicitly matched grading size run. */
import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'
const finite = Number.isFinite

function pointXY(p) {
  if (Array.isArray(p) && p.length >= 2 && finite(p[0]) && finite(p[1])) return [p[0], p[1]]
  if (p && finite(p.x) && finite(p.y)) return [p.x, p.y]
  throw new Error('Grade overlay requires finite XY coordinates')
}

function assertPolygon(polygon, label) {
  if (!polygon || !Array.isArray(polygon.points) || polygon.points.length < 3) throw new Error(`${label} requires at least three points`)
  return polygon.points.map(pointXY)
}

function unitsScale(units) {
  if (units === 'm') return 1
  if (units === 'cm') return .01
  throw new Error('Grade overlay requires explicit m or cm units')
}

/** Sample native cubic/Hermite edges in material coordinates; retain legacy indexed quadratics. */
function localPath(polygon, scale, invertY) {
  const points = assertPolygon(polygon, 'Pattern polygon')
  const toLocal = p => { const [x,y] = pointXY(p); return [x * scale, y * scale * (invertY ? -1 : 1)] }
  const list = points.map(toLocal)
  const commands = [`M${list[0].join(',')}`]
  const sampled = [list[0]]
  for (let i = 0; i < list.length; i++) {
    const next = list[(i + 1) % list.length]
    const edge = polygon.edges?.[i]
    const nativeControls = edge == null ? null : polygon.curves?.[edge]
    const knots = edge == null ? null : polygon.free_curve_points?.[edge]
    if (nativeControls != null || knots != null) {
      // Evaluate the native control pair and optional knot Hermite spans exactly
      // as the editor does, then approximate with bounded SVG line segments.
      const count = Math.max(48, ((Array.isArray(knots) ? knots.length : 0) + 1) * 48)
      for (let step = 1; step <= count; step++) {
        const sample = evaluateFreeCurve(polygon, edge, step / count)
        if (!sample || !sample.every(finite)) throw new Error(`Invalid native free curve edge ${edge}`)
        const local = toLocal(sample)
        commands.push(`L${local.join(',')}`)
        sampled.push(local)
      }
    } else if (polygon.curves?.[i] != null) {
      const curve = polygon.curves[i]
      const control = toLocal(curve.cx !== undefined ? { x:curve.cx, y:curve.cy } : curve)
      commands.push(`Q${control.join(',')} ${next.join(',')}`)
      for (let step = 1; step <= 48; step++) {
        const t = step / 48, u = 1 - t
        sampled.push([0,1].map(axis => u*u*list[i][axis]+2*u*t*control[axis]+t*t*next[axis]))
      }
    } else {commands.push(`L${next.join(',')}`);sampled.push(next)}
  }
  commands.push('Z')
  // Graded source holes are explicit closed material cutouts. A grading nest
  // preview which drew only the outer outline would silently conceal them.
  // Include each individually named rim, with the original winding, in the
  // actual geometry path and size bounds. Rust is final topology authority.
  for (const hole of polygon.holes||[]) {
    if(!Array.isArray(hole?.points)||hole.points.length<3||
      !Array.isArray(hole.edges)||hole.edges.length!==hole.points.length)
      throw new Error('Grade overlay has invalid internal hole geometry')
    const shape=hole.points.map(toLocal)
    commands.push(`M${shape[0].join(',')}`)
    for(let i=1;i<shape.length;i++)commands.push(`L${shape[i].join(',')}`)
    commands.push('Z')
    sampled.push(...shape)
  }
  // Internal lines are open cubic material guides and are NOT hole cutouts
  // or closed paths. Native Rust stores one symmetric tangent at each anchor.
  // Render their real graded position, rather than hiding them in size nests.
  for(const line of polygon.lines||[]){
    if(!Array.isArray(line?.points)||line.points.length<2||
       !Array.isArray(line.tangents)||line.tangents.length!==line.points.length)
      throw new Error('Grade overlay has invalid internal line coordinates')
    const anchors=line.points.map(toLocal), tangents=line.tangents.map(p=>{
      const [x,y]=pointXY(p)
      return [x*scale,y*scale*(invertY?-1:1)]
    })
    commands.push(`M${anchors[0].join(',')}`)
    sampled.push(anchors[0])
    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i],b=anchors[i+1],d=tangents[i],e=tangents[i+1]
      const c1=[a[0]+d[0],a[1]+d[1]],c2=[b[0]-e[0],b[1]-e[1]]
      commands.push(`C${c1.join(',')} ${c2.join(',')} ${b.join(',')}`)
      for(let step=1;step<=32;step++){
        const t=step/32,u=1-t
        sampled.push([0,1].map(axis=>u*u*u*a[axis]+3*u*u*t*c1[axis]+
          3*u*t*t*c2[axis]+t*t*t*b[axis]))
      }
    }
  }
  return {path:commands.join(' '), points:list, sampled}
}

/** Native board coordinates: positive SVG Y, metres, rotation around local panel origin. */
export function gradeOverlayPointToBoard(point, {units='m', layout=[0,0], rotationDegrees=0, boardOffset=[0,0], invertY=false}={}) {
  const [x,y] = pointXY(point)
  if (![...layout,...boardOffset,rotationDegrees].every(finite)) throw new Error('Invalid grade overlay layout')
  const scale = unitsScale(units)
  const radians = rotationDegrees * Math.PI / 180
  const a = x * scale, b = y * scale * (invertY ? -1 : 1)
  return [layout[0] + boardOffset[0] + a*Math.cos(radians)-b*Math.sin(radians),
    layout[1] + boardOffset[1] + a*Math.sin(radians)+b*Math.cos(radians)]
}

/**
 * Contract: each sizeRun[size] must be real graded geometry for this panel,
 * with unchanged indexed topology and panel identity. Never silently regrade.
 * For Native board use units:'m', layout:range.layout and boardOffset:offset.
 * For PatternEditor use units/outputUnits:'cm', invertY:true and
 * layout:[layout2d.x,layout2d.y] to retain its centimetre SVG viewBox.
 */
export function buildAccuMarkGradingOverlayGeometry({
  panelId, basePolygon, sizeRun, sizes=Object.keys(sizeRun||{}), baseSize,
  selectedSize=baseSize, units='m', outputUnits='m', layout=[0,0],
  boardOffset=[0,0], rotationDegrees=0, invertY=false,
  showAllSizes=false, showVectors=false, showPointLabels=false,
}={}) {
  if (typeof panelId !== 'string' || !panelId.length) throw new Error('Grade overlay requires a panel ID')
  const authored = assertPolygon(basePolygon, 'Base panel')
  const scale = unitsScale(units), outputScale = unitsScale(outputUnits)
  if (!Array.isArray(sizes) || !sizes.length || new Set(sizes).size !== sizes.length ||
      sizes.some(size=>typeof size!=='string'||!size)) throw new Error('Invalid grading sizes')
  if (!sizes.includes(baseSize) || !sizes.includes(selectedSize)) throw new Error('Base and selected size must belong to the grading run')
  if (!sizeRun || typeof sizeRun !== 'object') throw new Error('A real size run is required')
  if (![...layout,...boardOffset,rotationDegrees].every(finite) ||
      layout.length!==2 || boardOffset.length!==2) throw new Error('Invalid overlay board placement')
  const factor = scale / outputScale
  const transform = p => {
    const [x,y] = gradeOverlayPointToBoard(p,{units,layout:layout.map(n=>n*outputScale),
      boardOffset:boardOffset.map(n=>n*outputScale),rotationDegrees,invertY})
    return [x/outputScale,y/outputScale]
  }
  const paths = sizes.map(size => {
    const record = sizeRun[size]
    if (!record || record.panelId !== panelId) throw new Error(`Grade size ${size} does not match panel ${panelId}`)
    if (record.units !== units) throw new Error(`Grade size ${size} has mismatched source units`)
    const polygon = record.polygon
    const points = assertPolygon(polygon,`Grade size ${size}`)
    if (points.length !== authored.length) throw new Error(`Grade topology mismatch at ${size}`)
    if (basePolygon.edges || polygon.edges) {
      if (JSON.stringify(basePolygon.edges||null) !== JSON.stringify(polygon.edges||null)) throw new Error(`Grade edges differ at ${size}`)
    }
    if(JSON.stringify((basePolygon.holes||[]).map(h=>h.edges))!==
       JSON.stringify((polygon.holes||[]).map(h=>h.edges)))
      throw new Error(`Graded internal hole rim identity differs at ${size}`)
    if(JSON.stringify((basePolygon.lines||[]).map(line=>line.id))!==
       JSON.stringify((polygon.lines||[]).map(line=>line.id)))
      throw new Error(`Graded internal drafting line identity differs at ${size}`)
    if (size === baseSize && points.some((point,index)=>
      Math.hypot(point[0]-authored[index][0],point[1]-authored[index][1])>1e-9)) {
      throw new Error('Base grading snapshot differs from authored panel geometry')
    }
    const sample = localPath(polygon, 1, false)
    // SVG group and bounds share the same rotation and unit transform.
    const boardPoints = points.map(transform)
    const bounds = sample.sampled.map(transform).reduce((b,[x,y])=>({minX:Math.min(b.minX,x),maxX:Math.max(b.maxX,x),minY:Math.min(b.minY,y),maxY:Math.max(b.maxY,y)}),
      {minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity})
    return {size, localPath:sample.path,points:boardPoints,bounds,
      transform:`translate(${layout[0]+boardOffset[0]} ${layout[1]+boardOffset[1]}) rotate(${rotationDegrees}) scale(${factor} ${factor*(invertY?-1:1)})`,
      visible:showAllSizes||size===selectedSize||size===baseSize}
  })
  const indexed = Object.fromEntries(paths.map(path=>[path.size,path]))
  const base=indexed[baseSize], selected=indexed[selectedSize]
  const vectors = selected.points.map((to,i)=>{
    const from=base.points[i], dx=to[0]-from[0], dy=to[1]-from[1]
    return {pointIndex:i,from,to,dx,dy,deltaCm:[dx*outputScale*100,dy*outputScale*100],
      lengthCm:Math.hypot(dx,dy)*outputScale*100}
  }).filter(v=>v.lengthCm>1e-9)
  return {panelId,sizes,baseSize,selectedSize,paths, vectors:showVectors?vectors:[],
    points:showPointLabels?selected.points.map((point,index)=>({index,point,basePoint:base.points[index]})):[],
    units:outputUnits, annotationEnabled:showVectors||showPointLabels}
}
