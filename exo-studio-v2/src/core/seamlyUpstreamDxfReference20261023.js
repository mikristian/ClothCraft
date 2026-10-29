// Lossless source companion with read-only flattened drawing references.
// Upstream AAMA layer codes alone cannot establish a physical cutting/sewing contract.
const MAX_BYTES = 8 * 1024 * 1024
const UNIT_MM = Object.freeze({mm: 1, cm: 10, inch: 25.4})
const finite = (s, label) => { const n = Number(s); if (s == null || s === '' || !Number.isFinite(n)) throw Error(`Invalid ${label}`); return n }
const attr = (pairs, code) => pairs.find(x => x.code === code)?.value
const safeName = s => String(s || '').slice(0, 255)

function tokenize(source) {
  if (typeof source !== 'string' || !source.length || source.length > MAX_BYTES || source.includes('\0')) throw Error('DXF text must be nonempty and smaller than 8 MB')
  const rows = source.replace(/\r\n?/g, '\n').split('\n')
  if (rows.at(-1) === '') rows.pop()
  if (rows.length % 2) throw Error('Incomplete DXF group pair')
  const pairs = []
  for (let i = 0; i < rows.length; i += 2) {
    const code = Number(rows[i].trim())
    if (!Number.isInteger(code) || code < 0 || code > 1071) throw Error('Invalid DXF group code')
    pairs.push({code, value: rows[i + 1].trim()})
  }
  return pairs
}

function scan(pairs) {
  let section = '', waiting = false
  const records = {HEADER: [], BLOCKS: [], ENTITIES: []}
  let current = null
  for (const pair of pairs) {
    if (pair.code === 0 && pair.value === 'SECTION') {waiting = true; current = null; continue}
    if (waiting && pair.code === 2) {section = pair.value; waiting = false; continue}
    if (pair.code === 0 && pair.value === 'ENDSEC') {section = ''; current = null; continue}
    if (!records[section]) continue
    if (pair.code === 0) {current = {type: pair.value, pairs: []}; records[section].push(current)}
    else if (current) current.pairs.push(pair)
    else if (section === 'HEADER') records.HEADER.push({type: 'HEADER_VALUE', pairs: [pair]})
  }
  return records
}

function extractPolyline(records, index) {
  const header = records[index]
  const flags = Number(attr(header.pairs, 70) || 0)
  if (!Number.isInteger(flags) || (flags & 120) !== 0) throw Error('Unsupported 3D or mesh reference POLYLINE')
  const points = []
  let cursor = index + 1
  for (; cursor < records.length && records[cursor].type === 'VERTEX'; cursor++) {
    const data = records[cursor].pairs
    const x = finite(attr(data, 10), 'vertex x'), y = finite(attr(data, 20), 'vertex y')
    if (finite(attr(data, 30) ?? '0', 'vertex z') !== 0) throw Error('Non-planar upstream reference')
    if (Number(attr(data, 42) || 0) !== 0) throw Error('Unsupported curved bulge in reference')
    points.push({x, y})
  }
  if (records[cursor]?.type !== 'SEQEND') throw Error('Unterminated DXF reference POLYLINE')
  if (finite(attr(header.pairs, 30) ?? '0', 'polyline z') !== 0) throw Error('Non-planar upstream reference')
  if (points.length < 3) throw Error('Reference outline requires three vertices')
  return {points, closed: !!(flags & 1), layer: safeName(attr(header.pairs, 8) || '0'), next: cursor}
}

function readBlocks(records) {
  const blocks = new Map()
  let current = null
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    if (record.type === 'BLOCK') {
      const name = attr(record.pairs, 2)
      if (!name || blocks.has(name)) throw Error('Duplicate or missing DXF block name')
      current = {name, base: {x: finite(attr(record.pairs, 10) ?? '0', 'block x'), y: finite(attr(record.pairs, 20) ?? '0', 'block y')}, outlines: []}
      blocks.set(name, current)
    } else if (record.type === 'ENDBLK') current = null
    else if (current && record.type === 'POLYLINE') {
      const outline = extractPolyline(records, i)
      current.outlines.push(outline)
      i = outline.next
    } else if (current && record.type === 'LWPOLYLINE') {
      const pts = [], xValues = record.pairs.filter(p => p.code === 10), yValues = record.pairs.filter(p => p.code === 20)
      if (xValues.length !== yValues.length || xValues.length < 3 || record.pairs.some(p => p.code === 42 && Number(p.value) !== 0)) throw Error('Unsupported upstream lightweight outline')
      for (let j = 0; j < xValues.length; j++) pts.push({x: finite(xValues[j].value, 'outline x'), y: finite(yValues[j].value, 'outline y')})
      current.outlines.push({points: pts, closed: (Number(attr(record.pairs, 70) || 0) & 1) !== 0, layer: safeName(attr(record.pairs, 8) || '0')})
    } else if (current && !['SEQEND', 'VERTEX'].includes(record.type)) throw Error(`Unsupported entity in reference BLOCK: ${record.type}`)
  }
  return blocks
}

export function parseSeamlyUpstreamDxfReference(source, {filename = '', unit = null} = {}) {
  const pairs = tokenize(source)
  const records = scan(pairs)
  const header = records.HEADER.flatMap(row => row.pairs)
  const ins = header.findIndex(row => row.code === 9 && row.value === '$INSUNITS')
  const declared = ins >= 0 ? Number(header.slice(ins + 1).find(row => row.code === 70)?.value) : null
  if (!Object.hasOwn(UNIT_MM, unit)) throw Error('Explicit source unit required: mm, cm or inch; no unit inference for upstream AAMA DXF')
  if (declared != null && declared !== 0 && ({mm: 4, cm: 5, inch: 1})[unit] !== declared) throw Error('Declared DXF unit conflicts with selected reference scale')
  const blocks = readBlocks(records.BLOCKS)
  const inserts = records.ENTITIES.filter(row => row.type === 'INSERT')
  if (!inserts.length) throw Error('No standalone AAMA INSERT instances found')
  if (records.ENTITIES.some(row => row.type !== 'INSERT')) throw Error('Unsupported top-level DXF geometry: cannot safely flatten references')
  const outlines = []
  for (let i = 0; i < inserts.length; i++) {
    const row = inserts[i], name = attr(row.pairs, 2), block = blocks.get(name)
    if (!block) throw Error(`Missing DXF block: ${name}`)
    const sx = finite(attr(row.pairs, 41) ?? '1', 'insert scale x'), sy = finite(attr(row.pairs, 42) ?? '1', 'insert scale y')
    const rotation = finite(attr(row.pairs, 50) ?? '0', 'insert rotation') * Math.PI / 180
    if (!sx || !sy || finite(attr(row.pairs, 30) ?? '0', 'insert elevation') !== 0 || finite(attr(row.pairs, 43) ?? '1', 'insert scale z') !== 1) throw Error('Unsupported INSERT placement')
    const tx = finite(attr(row.pairs, 10) ?? '0', 'insert x'), ty = finite(attr(row.pairs, 20) ?? '0', 'insert y')
    const cs = Math.cos(rotation), sn = Math.sin(rotation)
    for (let j = 0; j < block.outlines.length; j++) {
      const outline = block.outlines[j]
      const points = outline.points.map(p => {
        const x = (p.x - block.base.x) * sx, y = (p.y - block.base.y) * sy
        return {x: (tx + x * cs - y * sn) * UNIT_MM[unit], y: (ty + x * sn + y * cs) * UNIT_MM[unit]}
      })
      outlines.push({id: `ref-${i + 1}-${j + 1}`, blockName: safeName(name), sourceLayer: outline.layer,
        sourceEntity: 'POLYLINE', instanceIndex: i, closed: outline.closed, points,
        role: 'unverified-upstream-outline', editable: false, isPhysicalCut: false, isStitchLine: false,
        manufacturingApproved: false})
    }
  }
  return {
    format: 'exo-seamly-upstream-aama-reference.v1', kind: 'seamly-aama-dxf', mode: 'reference-only', readOnly: true,
    editable: false, manufacturingApproved: false, factoryExportAllowed: false,
    filename: safeName(filename) || null, source: {originalDxfText: source, originalByteLength: new TextEncoder().encode(source).length,
      declaredInsUnits: declared, chosenUnit: unit, millimetersPerSourceUnit: UNIT_MM[unit],
      originalLayerLabels: [...new Set(outlines.map(o => o.sourceLayer))], blockNames: [...new Set(inserts.map(r => attr(r.pairs, 2)))]},
    outlines,
    semanticAssessment: {
      physicalCutKnown: false, stitchLineKnown: false, seamAllowanceKnown: false,
      diagnostic: 'The saved AAMA export has one outline each on numerical layers 1 and 8 for each inserted pattern block; these layer numbers do not independently prove physical CUT versus stitch meaning. Verify upstream exporter schema and receiving CAD and physical sample before manufacturing use.'
    }
  }
}
