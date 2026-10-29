// Seamly2D upstream VDxfEngine AAMA dialect, vdxfengine.cpp:629-780; dxiface.cpp:238-278.
// Geometry semantics are source-backed; physical approval remains a separate process.
const UNITS = Object.freeze({mm: 1, cm: 10, inch: 25.4})
const ROLES = Object.freeze({'1': 'cut', '8': 'draw', '4': 'notch', '7': 'grainline', '11': 'internalCut'})
const value = (pairs, code) => pairs.find(p => p.code === code)?.value
const number = (x, label) => { if (x == null || x === '' || !Number.isFinite(Number(x))) throw Error(`Invalid ${label}`); return Number(x) }
const optional = (pairs, code, fallback, label) => number(value(pairs, code) ?? fallback, label)
const zero3d = (pairs, codes, label) => {
  for (const code of codes) if (optional(pairs, code, '0', label) !== 0) throw Error(`Unsupported nonplanar ${label}`)
  const extrusion = [210, 220, 230].map((code, i) => optional(pairs, code, i === 2 ? '1' : '0', label))
  if (extrusion[0] !== 0 || extrusion[1] !== 0 || extrusion[2] !== 1) throw Error(`Unsupported extrusion ${label}`)
}
function tokenize(source) {
  if (typeof source !== 'string' || !source.length || new TextEncoder().encode(source).length > 8 * 1024 * 1024 || source.includes('\0')) throw Error('Expected DXF text smaller than 8 MB')
  const rows = source.replace(/\r\n?/g, '\n').split('\n'); if (rows.at(-1) === '') rows.pop()
  if (rows.length % 2) throw Error('Incomplete DXF group pair')
  return Array.from({length: rows.length / 2}, (_, i) => {
    const code = Number(rows[2 * i].trim()); if (!Number.isInteger(code) || code < 0 || code > 1071) throw Error('Invalid DXF group code')
    return {code, value: rows[2 * i + 1].trim()}
  })
}
function sections(pairs) {
  const out = {HEADER: [], BLOCKS: [], ENTITIES: []}; let section = '', pending = false, current = null
  for (const pair of pairs) {
    if (pair.code === 0 && pair.value === 'SECTION') {pending = true; current = null; continue}
    if (pending && pair.code === 2) {section = pair.value; pending = false; continue}
    if (pair.code === 0 && pair.value === 'ENDSEC') {section = ''; current = null; continue}
    if (!out[section]) continue
    if (pair.code === 0) {current = {type: pair.value, pairs: []}; out[section].push(current)}
    else if (current) current.pairs.push(pair)
    else if (section === 'HEADER') out.HEADER.push({type: 'HEADER_VALUE', pairs: [pair]})
  }
  return out
}
function polyline(records, i) {
  const record = records[i]; const layer = value(record.pairs, 8) ?? '0'
  if (!Object.hasOwn(ROLES, layer)) throw Error(`Unsupported AAMA entity layer: ${layer}`)
  const flags = optional(record.pairs, 70, '0', 'polyline flags')
  if (!Number.isInteger(flags) || (flags & ~1) !== 0) throw Error('Unsupported POLYLINE flags')
  zero3d(record.pairs, [30, 38], 'polyline')
  const points = []
  if (record.type === 'LWPOLYLINE') {
    const xs = record.pairs.filter(p => p.code === 10), ys = record.pairs.filter(p => p.code === 20)
    if (xs.length !== ys.length || !xs.length) throw Error('Invalid LWPOLYLINE vertices')
    for (let j = 0; j < xs.length; j++) points.push({x: number(xs[j].value, 'vertex x'), y: number(ys[j].value, 'vertex y')})
    if (record.pairs.some(p => [40, 41, 42].includes(p.code) && number(p.value, 'polyline width or bulge') !== 0)) throw Error('Unsupported curved or wide polyline')
    if (value(record.pairs, 90) != null && number(value(record.pairs, 90), 'vertex count') !== points.length) throw Error('Polyline vertex count mismatch')
  } else {
    let j = i + 1
    while (records[j]?.type === 'VERTEX') {
      const v = records[j].pairs
      zero3d(v, [30], 'vertex')
      if (optional(v, 42, '0', 'vertex bulge') !== 0 || optional(v, 40, '0', 'vertex width') !== 0 || optional(v, 41, '0', 'vertex width') !== 0) throw Error('Unsupported curved or wide polyline')
      points.push({x: number(value(v, 10), 'vertex x'), y: number(value(v, 20), 'vertex y')}); j++
    }
    if (records[j]?.type !== 'SEQEND') throw Error('Unterminated POLYLINE')
    i = j
  }
  if (points.length < (layer === '1' ? 3 : 2)) throw Error('Insufficient AAMA polyline vertices')
  if (layer === '4' || layer === '7') throw Error(`Unexpected polyline marking on ${layer}; expected LINE`)
  return {entity: record.type, layer, points, closed: !!(flags & 1), next: i}
}
function line(record) {
  const layer = value(record.pairs, 8) ?? '0'
  if (!Object.hasOwn(ROLES, layer)) throw Error(`Unsupported AAMA entity layer: ${layer}`)
  zero3d(record.pairs, [30, 31], 'LINE')
  if (layer !== '4' && layer !== '7') throw Error(`Unexpected LINE on layer ${layer}`)
  return {entity: 'LINE', layer, closed: false, points: [
    {x: number(value(record.pairs, 10), 'line start x'), y: number(value(record.pairs, 20), 'line start y')},
    {x: number(value(record.pairs, 11), 'line end x'), y: number(value(record.pairs, 21), 'line end y')}
  ]}
}
function blockMap(records) {
  const blocks = new Map(); let block = null
  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    if (row.type === 'BLOCK') {
      const name = value(row.pairs, 2)
      if (!name || blocks.has(name) || block) throw Error('Invalid or duplicate BLOCK')
      zero3d(row.pairs, [30], 'BLOCK base')
      block = {name, base: {x: optional(row.pairs, 10, '0', 'base x'), y: optional(row.pairs, 20, '0', 'base y')}, geometries: []}; blocks.set(name, block)
    } else if (row.type === 'ENDBLK') {
      if (!block) throw Error('Orphan ENDBLK'); block = null
    } else if (!block) {
      if (row.type !== 'SEQEND') throw Error(`Unsupported BLOCK record: ${row.type}`)
    } else if (row.type === 'POLYLINE' || row.type === 'LWPOLYLINE') {
      const geom = polyline(records, i); block.geometries.push(geom); i = geom.next
    } else if (row.type === 'LINE') block.geometries.push(line(row))
    else if (row.type === 'TEXT' || row.type === 'MTEXT') {
      // Seamly emits optional piece annotations on layer 1.
      if ((value(row.pairs, 8) ?? '0') !== '1') throw Error('Unsupported AAMA text layer')
    } else throw Error(`Unsupported BLOCK geometry: ${row.type}`)
  }
  if (block) throw Error('Unterminated DXF BLOCK')
  return blocks
}
function placement(pairs, base, unit) {
  const sx = optional(pairs, 41, '1', 'scale x'), sy = optional(pairs, 42, '1', 'scale y')
  if (sx === 0 || sy === 0 || optional(pairs, 43, '1', 'scale z') !== 1) throw Error('Unsupported INSERT scale')
  zero3d(pairs, [30], 'INSERT')
  if (optional(pairs, 70, '1', 'INSERT columns') !== 1 || optional(pairs, 71, '1', 'INSERT rows') !== 1) throw Error('Unsupported INSERT array')
  const rotation = optional(pairs, 50, '0', 'rotation degrees') * Math.PI / 180
  const tx = optional(pairs, 10, '0', 'INSERT x'), ty = optional(pairs, 20, '0', 'INSERT y')
  const cos = Math.cos(rotation), sin = Math.sin(rotation)
  return {metadata: {x: tx, y: ty, scaleX: sx, scaleY: sy, rotationDegrees: rotation * 180 / Math.PI}, point(p) {
    const x = (p.x - base.x) * sx, y = (p.y - base.y) * sy
    return {x: (tx + x * cos - y * sin) * unit, y: (ty + x * sin + y * cos) * unit}
  }}
}
function shape(geom, transform, block, index, entityIndex) {
  const points = geom.points.map(transform.point)
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw Error('Invalid transformed geometry')
  return {points, closed: geom.closed, provenance: {blockName: block.name, instanceIndex: index, entityIndex, sourceEntity: geom.entity, sourceLayer: geom.layer}}
}
/** Parse the exact Seamly2D exporter dialect. Explicit unit is mandatory because R12 AAMA may omit $INSUNITS. */
export function parseSeamlyAamaManufacturingSemantics(source, {unit = null, filename = ''} = {}) {
  if (!Object.hasOwn(UNITS, unit)) throw Error('Explicit source unit required: mm, cm or inch')
  const records = sections(tokenize(source)); const header = records.HEADER.flatMap(r => r.pairs)
  const position = header.findIndex(p => p.code === 9 && p.value === '$INSUNITS')
  const declared = position < 0 ? null : number(header.slice(position + 1).find(p => p.code === 70)?.value, 'declared DXF units')
  if (declared && declared !== {mm: 4, cm: 5, inch: 1}[unit]) throw Error('Declared units conflict with selected unit')
  const blocks = blockMap(records.BLOCKS)
  const allowed = new Set(['INSERT', 'TEXT', 'MTEXT'])
  if (records.ENTITIES.some(r => !allowed.has(r.type))) throw Error('Unsupported top-level AAMA geometry')
  if (records.ENTITIES.some(r => (r.type === 'TEXT' || r.type === 'MTEXT') && (value(r.pairs, 8) ?? '1') !== '1')) throw Error('Unsupported top-level text layer')
  const inserts = records.ENTITIES.filter(r => r.type === 'INSERT')
  if (!inserts.length) throw Error('No AAMA INSERT blocks')
  const pieces = inserts.map((row, index) => {
    const name = value(row.pairs, 2), block = blocks.get(name)
    if (!block) throw Error(`Missing DXF block: ${name}`)
    if ((value(row.pairs, 8) ?? '1') !== '1') throw Error('Unsupported INSERT layer')
    const transform = placement(row.pairs, block.base, UNITS[unit])
    const groups = {cut: [], draw: [], notch: [], grainline: [], internalCut: []}
    block.geometries.forEach((geom, entityIndex) => groups[ROLES[geom.layer]].push(shape(geom, transform, block, index, entityIndex)))
    if (groups.cut.length !== 1 || !groups.cut[0].closed) throw Error(`Ambiguous physical CUT outline for ${name}`)
    if (groups.cut[0].points.length < 3) throw Error(`Invalid physical CUT outline for ${name}`)
    if (groups.notch.some(g => g.points.length !== 2 || g.closed) || groups.grainline.length > 1 || groups.grainline.some(g => g.points.length !== 2 || g.closed) || groups.internalCut.some(g => g.points.length < 2)) throw Error(`Ambiguous manufacturing marks for ${name}`)
    const closedDraw = groups.draw.filter(g => g.closed && g.points.length >= 3)
    if (closedDraw.length > 1) throw Error(`Ambiguous DRAW contours for ${name}`)
    const diagnostics = ['Seamly layer 8 is DRAW/INK; the closed contour is a visual guide, not a verified manufacturing sewline.']
    if (!closedDraw.length) diagnostics.push('Optional layer 8 contour absent; no sewing guide inferred.')
    return {name, cutOutlineMm: groups.cut[0], sewingContourMm: closedDraw[0] ?? null,
      notches: groups.notch, grainline: groups.grainline.length === 1 ? groups.grainline[0] : null,
      internalCuts: groups.internalCut, drawPaths: groups.draw.filter(g => g !== closedDraw[0]), diagnostics,
      provenance: {sourceBlock: block.name, insertIndex: index, insertLayer: value(row.pairs, 8) ?? '1', transform: transform.metadata}, manufacturingApproved: false}
  })
  return {format: 'exo-seamly-aama-manufacturing-semantics.v1', filename, unit, millimetersPerSourceUnit: UNITS[unit], declaredInsUnits: declared,
    pieces, upstream: {exporter: 'Seamly2D VDxfEngine::ExportToAAMA', source: 'vdxfengine.cpp:629-780; dxiface.cpp:238-278', layerRoles: ROLES},
    source: {originalDxfText: source, byteLength: new TextEncoder().encode(source).length},
    manufacturingApproved: false, factoryExportAllowed: false, seamAllowanceVerified: false}
}
