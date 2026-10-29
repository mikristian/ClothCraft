// Deterministic local source-revision binding for digital marker inspection.
// This is not a signature, independent CAD receipt, or permission to cut.
import {sha256Bytes} from './sha256Bytes.js'

const encoder = new TextEncoder()
const plain = value => value !== null && typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value))

function canonical(value, active = new Set(), depth = 0) {
  if (depth > 64) throw Error('SOURCE_NESTING_LIMIT')
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (!Array.isArray(value) && !plain(value)) throw Error('NON_JSON_SOURCE')
  if (active.has(value)) throw Error('CYCLIC_SOURCE')
  active.add(value)
  let serialized
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length ||
        !Array.from({length: value.length}, (_, i) => Object.hasOwn(value, i)).every(Boolean))
      throw Error('SPARSE_SOURCE')
    serialized = `[${value.map(v => canonical(v, active, depth + 1)).join(',')}]`
  } else {
    serialized = `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${canonical(value[key], active, depth + 1)}`).join(',')}}`
  }
  active.delete(value)
  return serialized
}

export function fingerprintIndustrialMarkerSource20261029(project) {
  try {
    if (!plain(project) || !Array.isArray(project.pieces) ||
        !project.pieces.length || !Array.isArray(project.grading?.sizes) ||
        !project.grading.sizes.length) return null
    const bytes = encoder.encode(canonical(project))
    if (bytes.length > 8_000_000) return null
    return sha256Bytes(bytes)
  } catch { return null }
}

// Local comparison only: an unkeyed digest is not an issuer signature.
// Used with fresh deterministic regeneration, never trusted on its own.
export function fingerprintIndustrialMarkerStudy20261029(study) {
  try {
    if (!plain(study)) return null
    const bytes = encoder.encode(canonical(study))
    if (bytes.length > 16_000_000) return null
    return sha256Bytes(bytes)
  } catch { return null }
}
