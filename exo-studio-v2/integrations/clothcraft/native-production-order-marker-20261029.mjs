import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {nestPolygons} from '../../src/core/accumarkPolygonNesting20261024.js'

export const nativeSourceFingerprint=project=>createHash('sha256').update(JSON.stringify({sourceTemplate:project.template,gradeRun:project.grade_run})).digest('hex')

// Canonical identity of the full observed CUT response (including every point).
// This is same-payload integrity, not native Rust attestation or a factory signature.
export function nativeCutlineFingerprint(cuts) {
  // Native responses may contain transient request/session metadata. Bind the
  // authored cutline content consumed by this adapter in its native order.
  const payload={format:cuts?.format,sizes:cuts?.sizes?.map(row=>({
    size:row.size,panels:row.panels?.map(panel=>({panel_id:panel.panel_id,cut:panel.cut}))
  }))}
  const canonical=value=>{
    if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value)
    if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value)
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
    if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)
      return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'
    throw Error('INVALID_CUTLINE_FINGERPRINT_PAYLOAD')
  }
  return createHash('sha256').update(canonical(payload)).digest('hex')
}

// Explicit, opt-in digital production order. Physical release is never inferred.
export function generateNativeOrderMarkers() {
  throw Error('VERIFIED_NATIVE_WORKSPACE_HANDOFF_REQUIRED')
}
