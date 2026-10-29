// Development-only composition of the guarded manifest ZIP and independent raw envelope audit.
// Passing these checks is never manufacturing approval or factory certification.
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {auditFactoryZipEnvelope20261024_0154} from './factoryZipEnvelope20261024_0154.mjs'

export function buildGuardedFactoryEnvelopeZip20261024_0300(project) {
  const refuse = (reason, diagnostics = []) => ({
    ok: false, reason, diagnostics, manufacturingApproved: false, factoryCertified: false,
  })
  try {
    const built = buildGuardedFactoryManifestZip20261024_0053(project)
    if (!built || built.ok !== true || !(built.bytes instanceof Uint8Array) || built.bytes.byteLength === 0) {
      return refuse(built?.reason || 'Guarded factory ZIP build refused', Array.isArray(built?.diagnostics) ? built.diagnostics : [])
    }
    const envelope = auditFactoryZipEnvelope20261024_0154(built.bytes)
    if (!envelope || envelope.ok !== true || envelope.manufacturingApproved !== false) {
      return refuse('Factory ZIP envelope audit refused', Array.isArray(envelope?.diagnostics) ? envelope.diagnostics : [])
    }
    return {
      ok: true, bytes: built.bytes, fileCount: built.fileCount,
      manufacturingApproved: false, factoryCertified: false,
    }
  } catch (error) {
    return refuse(`Factory ZIP envelope validation failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}
