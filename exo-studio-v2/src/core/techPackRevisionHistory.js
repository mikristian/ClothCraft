// Persist only authored specifications, never binary assets, rendered meshes or image URLs.
export const TECHPACK_REVISION_LIMIT = 20
const list = value => Array.isArray(value) ? value : []
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const scalar = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length <= 500 && !/^(?:data:|blob:|https?:\/\/)/i.test(text) ? text : null
}
const pick = (record, keys) => Object.fromEntries(keys.flatMap(key => {
  const value = scalar(object(record)[key])
  return value === null ? [] : [[key, value]]
}))
const stableRows = (value, fields, limit = 500) => list(value).slice(0, limit).map((record, index) => ({
  id: String(scalar(record?.id) ?? index), ...pick(record, fields)
}))
const pom = value => Object.fromEntries(Object.entries(object(value)).slice(0, 100)
  .map(([size, measurements]) => [size.slice(0, 80),
    stableRows(measurements, ['label', 'cm', 'toleranceCm', 'method', 'notes'])]))
const anchor = value => {
  const a = object(value)
  if (!Number.isInteger(a.triangleIndex) || a.triangleIndex < 0 ||
      !Array.isArray(a.weights) || a.weights.length !== 3 || !a.weights.every(Number.isFinite)) return null
  return {...pick(a, ['source', 'triangleIndex', 'panelId', 'objectName', 'objectIndex']),
    weights: [...a.weights],
    ...(Array.isArray(a.vertices) && a.vertices.length === 3 &&
      a.vertices.every(v => Number.isInteger(v) && v >= 0) ? {vertices: [...a.vertices]} : {})}
}
const markers = value => stableRows(value, ['label', 'title', 'detail', 'source', 'panelId', 'verified', 'reviewStatus'])
  .map((marker, index) => {
    const input = list(value)[index]
    const position = input?.position
    return {...marker, ...(anchor(input?.anchor) ? {anchor: anchor(input.anchor)} :
      Array.isArray(position) && position.length === 3 &&
      position.every(v => Number.isFinite(v) && v >= 0 && v <= 1) ? {position: [...position]} : {})}
  })
const snapshot = (source, draft, workspace) => ({
  source: pick(source, ['kind', 'name', 'revision', 'ready']),
  style: pick(draft, ['styleName', 'brand', 'sku', 'season', 'factory', 'status']),
  pom: pom(Object.keys(object(draft?.pom)).length ? draft.pom : source?.pom),
  bom: stableRows(draft?.bom, ['description', 'color', 'gsm', 'thickness', 'composition', 'supplier', 'quantity', 'unit', 'cost']),
  fabrics: stableRows(source?.fabrics, ['name', 'color', 'gsm', 'composition', 'supplier', 'quantity']),
  fabricCells: Object.fromEntries(Object.entries(object(workspace?.cells?.fabrics)).slice(0, 500)
    .map(([id, columns]) => [id.slice(0, 100),
      Object.fromEntries(Object.entries(object(columns)).filter(([key]) => /^\d{1,2}$/.test(key))
        .flatMap(([key, value]) => scalar(value) === null ? [] : [[key, scalar(value)]]))])),
  colorways: stableRows(draft?.colorways, ['name', 'code', 'hex', 'fabric', 'finish', 'notes']),
  annotations3d: markers(workspace?.interactiveMarkers),
  annotations: stableRows(workspace?.annotations?.callouts, ['type', 'component', 'instruction', 'label', 'verified', 'reviewStatus'])
})
let serial = 0
export function createTechPackCheckpoint(source = {}, draft = {}, workspace = {}, title = '') {
  const createdAt = new Date().toISOString()
  serial = (serial + 1) % 1000000
  return {id: `tp-rev-${Date.now().toString(36)}-${serial.toString(36)}`,
    createdAt, title: String(scalar(title) || 'Revision checkpoint').slice(0, 100),
    snapshot: snapshot(source, draft, workspace)}
}
export function appendTechPackCheckpoint(revisions = [], checkpoint) {
  if (!checkpoint || typeof checkpoint !== 'object' || !checkpoint.id || !checkpoint.snapshot) return list(revisions).slice(-TECHPACK_REVISION_LIMIT)
  return [...list(revisions).filter(entry => entry?.id !== checkpoint.id), checkpoint].slice(-TECHPACK_REVISION_LIMIT)
}
const labels = {style:'Style', pom:'Measurements', bom:'Bill of materials', fabrics:'Fabrics',
  fabricCells:'Fabric specifications', colorways:'Colorways', annotations3d:'3D details',
  annotations:'Construction annotations', source:'Garment source'}
const display = value => value === undefined ? '(not set)' : JSON.stringify(value)
const changes = (oldValue, newValue, path, group, result) => {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return
  if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object' &&
      !Array.isArray(oldValue) && !Array.isArray(newValue)) {
    for (const key of [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].sort())
      changes(oldValue[key], newValue[key], [...path, key], group, result)
    return
  }
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const idMap = value => new Map(value.map((entry, index) => [String(entry?.id ?? index), entry]))
    const before = idMap(oldValue), after = idMap(newValue)
    for (const id of [...new Set([...before.keys(), ...after.keys()])].sort())
      changes(before.get(id), after.get(id), [...path, id], group, result)
    return
  }
  const field = path.join(' / ')
  result.push({section: labels[group] || group, field, before: oldValue ?? null, after: newValue ?? null,
    description: `${labels[group] || group}: ${field} changed from ${display(oldValue)} to ${display(newValue)}`})
}
export function compareTechPackCheckpoints(a, b) {
  const before = object(a?.snapshot), after = object(b?.snapshot)
  const result = []
  for (const group of Object.keys(labels))
    changes(before[group], after[group], [], group, result)
  return result
}
