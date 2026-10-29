import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { createTeeTemplate } from '../data/templates.js'
import { createApprovedNotchManifest20261023 as capture, verifyApprovedNotchInventory20261023 as verify } from './approvedNotchInventory20261023.js'

const authorized = generateKeyPairSync('ed25519')
const attacker = generateKeyPairSync('ed25519')
const revision = 'independently-attested:revision-A'
const codes = result => result.issues.map(item => item.code)
const project = () => {
  const p = createTeeTemplate()
  for (const piece of p.pieces) piece.notches = []
  p.pieces[0].notches = [{ id: 'approved-a', edgeIndex: 0, t: 0.2 }, { id: 'approved-b', edgeIndex: 0, t: 0.7 }]
  p.pieces[1].notches = [{ id: 'approved-c', edgeIndex: 0, t: 0.4 }]
  return p
}
const payload = manifest => JSON.stringify({ schema: 'exo2d-approved-notch-manifest.v1', sourceRevision: manifest.sourceRevision, baseSize: manifest.baseSize, sizes: manifest.sizes, pieces: manifest.pieces })
const approvalFor = (p, key = authorized.privateKey) => {
  const draft = capture(p, revision)
  assert.equal(draft.status, 'draft_for_external_approval')
  return { manifest: structuredClone(draft.manifest), sha256: draft.sha256, signatureBase64: sign(null, Buffer.from(draft.signingPayload), key).toString('base64') }
}
const resign = (approval, key) => {
  const bytes = Buffer.from(payload(approval.manifest))
  approval.sha256 = createHash('sha256').update(bytes).digest('hex')
  approval.signatureBase64 = sign(null, bytes, key).toString('base64')
  return approval
}
const blocked = (result, code) => {
  assert.equal(result.status, 'blocked')
  assert(codes(result).includes(code), `expected ${code}; got ${codes(result).join(', ')}`)
  assert.equal(result.factoryCertified, false)
  assert.equal(result.factoryCuttingAuthorized, false)
  assert.equal(result.bulkProductionAuthorized, false)
}

test('authorized signature matches exact inventory but grants no manufacturing authority', () => {
  const p = project(), original = structuredClone(p)
  const actual = verify(p, revision, approvalFor(p), authorized.publicKey)
  assert.equal(actual.status, 'signed_inventory_identity_match')
  assert.equal(actual.authenticatedAgainstSuppliedKey, true)
  assert.equal(actual.factoryCertified, false)
  assert.equal(actual.factoryCuttingAuthorized, false)
  assert.equal(actual.bulkProductionAuthorized, false)
  assert.deepEqual(p, original)
})

test('forged digest and payload cannot pass authorized public key', () => {
  const p = project(), approved = approvalFor(p)
  approved.manifest.pieces[0].notchIds.pop()
  resign(approved, attacker.privateKey)
  blocked(verify(p, revision, approved, authorized.publicKey), 'NOTCH_INVENTORY_CHANGED')
  const p2 = project()
  p2.pieces[0].notches.pop()
  const matchedForgery = approvalFor(p2, attacker.privateKey)
  blocked(verify(p2, revision, matchedForgery, authorized.publicKey), 'APPROVAL_SIGNATURE_INVALID')
})

test('independent revision, size list, base size and piece/notch identity changes block', () => {
  const original = project(), approved = approvalFor(original)
  blocked(verify(original, 'independently-attested:revision-B', approved, authorized.publicKey), 'SOURCE_REVISION_CHANGED')
  const size = project(); size.grading.sizes.pop()
  blocked(verify(size, revision, approved, authorized.publicKey), 'SIZE_RUN_CHANGED')
  const base = project(); base.grading.baseSize = base.grading.sizes.find(s => s !== base.grading.baseSize)
  blocked(verify(base, revision, approved, authorized.publicKey), 'SIZE_RUN_CHANGED')
  const deletedPiece = project(); deletedPiece.pieces.splice(1, 1)
  blocked(verify(deletedPiece, revision, approved, authorized.publicKey), 'NOTCH_INVENTORY_CHANGED')
  const lostNotch = project(); lostNotch.pieces[1].notches = []
  blocked(verify(lostNotch, revision, approved, authorized.publicKey), 'NOTCH_INVENTORY_CHANGED')
  const added = project(); added.pieces[0].notches.push({id:'unexpected', edgeIndex:0, t:0.5})
  blocked(verify(added, revision, approved, authorized.publicKey), 'NOTCH_INVENTORY_CHANGED')
})

test('attacker key substituted beside attacker signed approval proves key pinning is outside verifier', () => {
  const p = project()
  const forged = approvalFor(p, attacker.privateKey)
  blocked(verify(p, revision, forged, authorized.publicKey), 'APPROVAL_SIGNATURE_INVALID')
  const accepted = verify(p, revision, forged, attacker.publicKey)
  assert.equal(accepted.status, 'signed_inventory_identity_match')
  assert.equal(accepted.authenticatedAgainstSuppliedKey, true)
  assert.equal(accepted.factoryCertified, false)
})

test('missing trusted key and no notch inventory always block', () => {
  const p = project()
  blocked(verify(p, revision, approvalFor(p), null), 'TRUSTED_APPROVER_KEY_REQUIRED')
  for (const piece of p.pieces) piece.notches = []
  assert.equal(capture(p, revision).status, 'blocked')
  blocked(verify(p, revision, approvalFor(project()), authorized.publicKey), 'EMPTY_AUTHORED_NOTCH_INVENTORY')
})

test('re-signed malicious manifest with duplicate IDs or empty notch IDs remains malformed', () => {
  const p = project()
  const duplicate = approvalFor(p)
  duplicate.manifest.pieces[0].notchIds.push(duplicate.manifest.pieces[0].notchIds[0])
  resign(duplicate, authorized.privateKey)
  blocked(verify(p, revision, duplicate, authorized.publicKey), 'INVALID_OR_MISSING_APPROVED_MANIFEST')
  const empty = approvalFor(p)
  for (const piece of empty.manifest.pieces) piece.notchIds = []
  resign(empty, authorized.privateKey)
  blocked(verify(p, revision, empty, authorized.publicKey), 'INVALID_OR_MISSING_APPROVED_MANIFEST')
})
