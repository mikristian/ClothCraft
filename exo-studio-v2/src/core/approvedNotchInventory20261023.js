/** Isolated verification experiment. Trust the public key ONLY if pinned independently. */
import { createHash, verify as verifySignature } from 'node:crypto'
import { createAuthoredNotchInventoryBaseline20261023 } from './authoredNotchInventory20261023.js'

const SCHEMA = 'exo2d-approved-notch-manifest.v1'
const valid = value => typeof value === 'string' && value.length > 0 && value.trim() === value
const issue = code => ({ severity: 'blocker', code })
const canonical = manifest => JSON.stringify({schema: SCHEMA, sourceRevision: manifest.sourceRevision,
  baseSize: manifest.baseSize, sizes: manifest.sizes, pieces: manifest.pieces})
const digest = manifest => createHash('sha256').update(canonical(manifest)).digest('hex')

function validate(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      manifest.schema !== SCHEMA || !valid(manifest.sourceRevision) ||
      !Array.isArray(manifest.sizes) || !manifest.sizes.length ||
      manifest.sizes.some(s => !valid(s)) || new Set(manifest.sizes).size !== manifest.sizes.length ||
      !valid(manifest.baseSize) || !manifest.sizes.includes(manifest.baseSize) ||
      !Array.isArray(manifest.pieces) || !manifest.pieces.length) return false
  const pieces = new Set()
  let notchCount = 0
  for (const row of manifest.pieces) {
    if (!row || !valid(row.pieceId) || pieces.has(row.pieceId) ||
        !Array.isArray(row.notchIds) || row.notchIds.some(id => !valid(id)) ||
        new Set(row.notchIds).size !== row.notchIds.length) return false
    pieces.add(row.pieceId)
    notchCount += row.notchIds.length
  }
  if (!notchCount) return false
  // Canonical arrays must arrive ordered; unreviewed reordering must not alter the identity.
  if (manifest.pieces.some((row, i) => i && manifest.pieces[i - 1].pieceId >= row.pieceId)) return false
  if (manifest.pieces.some(row => row.notchIds.some((id, i) => i && row.notchIds[i - 1] >= id))) return false
  return true
}

export function createApprovedNotchManifest20261023(project, sourceRevision) {
  const captured = createAuthoredNotchInventoryBaseline20261023(project)
  if (captured.status !== 'captured' || !valid(sourceRevision)) return {
    status: 'blocked', issues: [...captured.issues, ...(!valid(sourceRevision) ? [issue('SOURCE_REVISION_REQUIRED')] : [])], manifest: null,
    factoryCertified: false, factoryCuttingAuthorized: false,
  }
  const { baseSize, sizes, pieces } = captured.baseline
  const manifest = {schema: SCHEMA, sourceRevision, baseSize, sizes, pieces}
  if (!validate(manifest)) return {status: 'blocked', issues: [issue('INVALID_MANIFEST')], manifest: null,
    factoryCertified: false, factoryCuttingAuthorized: false}
  return {status: 'draft_for_external_approval', issues: [], manifest, sha256: digest(manifest),
    signingPayload: canonical(manifest), factoryCertified: false, factoryCuttingAuthorized: false}
}

/**
 * `trustedPublicKey` must come from an independently configured, pinned source.
 * Approval requires a signature over the exact canonical manifest bytes.
 * `approval.signatureBase64` must come from a separate approver, not the garment.
 * This function authenticates the manifest only relative to the supplied key;
 * it cannot prove that the key belongs to an authorized human approver.
 */
export function verifyApprovedNotchInventory20261023(project, sourceRevision, approval, trustedPublicKey) {
  const issues = []
  const fail = code => issues.push(issue(code))
  const draft = createApprovedNotchManifest20261023(project, sourceRevision)
  if (draft.status !== 'draft_for_external_approval') issues.push(...draft.issues)
  const manifest = approval?.manifest
  if (!validate(manifest)) fail('INVALID_OR_MISSING_APPROVED_MANIFEST')
  if (!valid(approval?.sha256) || !/^[a-f0-9]{64}$/.test(approval.sha256)) fail('INVALID_APPROVAL_DIGEST')
  if (issues.length === 0 && digest(manifest) !== approval.sha256) fail('APPROVED_MANIFEST_DIGEST_MISMATCH')
  if (draft.manifest && validate(manifest)) {
    if (manifest.sourceRevision !== draft.manifest.sourceRevision) fail('SOURCE_REVISION_CHANGED')
    if (JSON.stringify(manifest.sizes) !== JSON.stringify(draft.manifest.sizes) ||
        manifest.baseSize !== draft.manifest.baseSize) fail('SIZE_RUN_CHANGED')
    if (JSON.stringify(manifest.pieces) !== JSON.stringify(draft.manifest.pieces)) fail('NOTCH_INVENTORY_CHANGED')
  }
  if (!valid(approval?.signatureBase64) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(approval.signatureBase64)) fail('MISSING_OR_INVALID_APPROVAL_SIGNATURE')
  if (!trustedPublicKey) fail('TRUSTED_APPROVER_KEY_REQUIRED')
  if (!issues.length) {
    try {
      if (!verifySignature(null, Buffer.from(canonical(manifest)), trustedPublicKey,
        Buffer.from(approval.signatureBase64, 'base64'))) fail('APPROVAL_SIGNATURE_INVALID')
    } catch { fail('APPROVAL_SIGNATURE_INVALID') }
  }
  return {status: issues.length ? 'blocked' : 'signed_inventory_identity_match', issues,
    blockers: issues.length, authenticatedAgainstSuppliedKey: issues.length === 0,
    factoryCertified: false, factoryCuttingAuthorized: false, bulkProductionAuthorized: false,
    limitation: 'Signature trust depends on an independently pinned authorized approver key and externally evidenced source revision. Notch geometry, per-size DXF, factory approval, and physical samples require separate checks.'}
}
