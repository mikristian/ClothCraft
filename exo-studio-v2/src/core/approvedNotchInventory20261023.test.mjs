import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createTeeTemplate } from '../data/templates.js'
import {createApprovedNotchManifest20261023 as capture,
  verifyApprovedNotchInventory20261023 as check} from './approvedNotchInventory20261023.js'

const {privateKey, publicKey} = generateKeyPairSync('ed25519')
const impostor = generateKeyPairSync('ed25519')
const make = () => {
  const garment = createTeeTemplate()
  for (const piece of garment.pieces) piece.notches = []
  garment.pieces[0].notches = [{id:'left',edgeIndex:0,t:0.2},{id:'right',edgeIndex:1,t:0.8}]
  return garment
}
const approve = (garment, revision = 'git:source-123') => {
  const draft = capture(garment, revision)
  assert.equal(draft.status, 'draft_for_external_approval')
  return {manifest: structuredClone(draft.manifest), sha256: draft.sha256,
    signatureBase64: sign(null, Buffer.from(draft.signingPayload), privateKey).toString('base64')}
}
const codes = result => result.issues.map(i => i.code)

test('valid externally signed inventory matches but cannot authorize manufacturing', () => {
  const garment = make(), before = structuredClone(garment), approval = approve(garment)
  const result = check(garment,'git:source-123',approval,publicKey)
  assert.equal(result.status,'signed_inventory_identity_match')
  assert.equal(result.authenticatedAgainstSuppliedKey,true)
  assert.equal(result.factoryCertified,false)
  assert.equal(result.factoryCuttingAuthorized,false)
  assert.equal(result.bulkProductionAuthorized,false)
  assert.deepEqual(garment,before)
})

test('coordinated baseline forgery fails cryptographic signature despite recomputed SHA-256', () => {
  const garment = make(), approval = approve(garment)
  garment.pieces[0].notches.pop()
  const forged = capture(garment,'git:source-123')
  const forgedApproval = {...approval,manifest:forged.manifest,sha256:forged.sha256}
  assert(codes(check(garment,'git:source-123',forgedApproval,publicKey)).includes('APPROVAL_SIGNATURE_INVALID'))
  assert(codes(check(garment,'git:source-123',approval,publicKey)).includes('NOTCH_INVENTORY_CHANGED'))
})

test('missing approval/key, wrong key and changed revision fail closed', () => {
  const garment = make(), approval = approve(garment)
  assert(codes(check(garment,'git:source-123',undefined,publicKey)).includes('INVALID_OR_MISSING_APPROVED_MANIFEST'))
  assert(codes(check(garment,'git:source-123',approval,null)).includes('TRUSTED_APPROVER_KEY_REQUIRED'))
  assert(codes(check(garment,'git:source-123',approval,impostor.publicKey)).includes('APPROVAL_SIGNATURE_INVALID'))
  assert(codes(check(garment,'git:source-456',approval,publicKey)).includes('SOURCE_REVISION_CHANGED'))
  assert(codes(check(garment,'',approval,publicKey)).includes('SOURCE_REVISION_REQUIRED'))
})

test('missing/changed sizes and duplicate identities fail closed', () => {
  const garment = make(), approval = approve(garment)
  garment.grading.sizes.pop()
  assert(codes(check(garment,'git:source-123',approval,publicKey)).includes('SIZE_RUN_CHANGED'))
  const duplicateSize = make(), secondApproval = approve(duplicateSize)
  duplicateSize.grading.sizes.push(duplicateSize.grading.sizes[0])
  assert(codes(check(duplicateSize,'git:source-123',secondApproval,publicKey)).includes('INVALID_SIZE_RUN'))
  const duplicateNotch = make(), thirdApproval = approve(duplicateNotch)
  duplicateNotch.pieces[0].notches.push({...duplicateNotch.pieces[0].notches[0]})
  assert(codes(check(duplicateNotch,'git:source-123',thirdApproval,publicKey)).includes('INVALID_OR_DUPLICATE_NOTCH_ID'))
  const duplicatePiece = make(), fourthApproval = approve(duplicatePiece)
  duplicatePiece.pieces.push(structuredClone(duplicatePiece.pieces[0]))
  assert(codes(check(duplicatePiece,'git:source-123',fourthApproval,publicKey)).includes('INVALID_OR_DUPLICATE_PIECE_ID'))
})

test('tampered approved manifest, duplicate approved IDs, and malformed signature fail', () => {
  const garment = make(), approval = approve(garment)
  approval.manifest.pieces[0].notchIds.push(approval.manifest.pieces[0].notchIds[0])
  assert(codes(check(garment,'git:source-123',approval,publicKey)).includes('INVALID_OR_MISSING_APPROVED_MANIFEST'))
  const fresh = approve(garment)
  fresh.signatureBase64 = 'invalid!'
  assert(codes(check(garment,'git:source-123',fresh,publicKey)).includes('MISSING_OR_INVALID_APPROVAL_SIGNATURE'))
})

test('empty notch inventory cannot be approved', () => {
  const garment = make()
  for (const piece of garment.pieces) piece.notches = []
  assert.equal(capture(garment,'git:source-123').status,'blocked')
})
