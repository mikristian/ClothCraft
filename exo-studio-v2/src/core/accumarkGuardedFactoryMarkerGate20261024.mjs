import { auditFactoryZipMarkerPhysicalParity20261024_1202 } from './factoryZipMarkerPhysicalParity20261024_1202.mjs'

/** Fail-closed digital geometry gate for any user-downloadable guarded factory ZIP.
 * Manifest checksums and calibration-only audits are insufficient to establish
 * source-derived cutting geometry parity. This is NOT physical factory approval.
 */
export function requireAccuMarkGuardedFactoryMarkerParity20261024(files, project) {
  const result = auditFactoryZipMarkerPhysicalParity20261024_1202(files, project)
  if (!result || result.ok !== true || !Array.isArray(result.diagnostics) ||
      result.diagnostics.length !== 0 || result.manufacturingApproved !== false ||
      result.physicalRegistrationVerified !== false) {
    const codes = Array.isArray(result?.diagnostics)
      ? result.diagnostics.slice(0, 4).map(item => String(item?.code || 'UNKNOWN').slice(0, 100)).join(', ')
      : 'INVALID_AUDIT_RESULT'
    throw Error(`Factory marker source-derived parity refused: ${codes || 'INVALID_AUDIT_RESULT'}`)
  }
  return { ok: true, manufacturingApproved: false, physicalRegistrationVerified: false }
}
