import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { createTeeTemplate } from '../data/templates.js'
import {
  createApprovedNotchManifest20261023,
  verifyApprovedNotchInventory20261023,
} from './approvedNotchInventory20261023.js'

const revision = 'externally-attested:known-gap-fixture-r1'
const { privateKey, publicKey } = generateKeyPairSync('ed25519')

function fixture() {
  const garment = createTeeTemplate()
  for (const piece of garment.pieces) piece.notches = []
  garment.pieces[0].notches = [{ id: 'station-a', edgeIndex: 0, t: 0.25, type: 'single', depthCm: 0.35 }]
  garment.pieces[1].notches = [{ id: 'station-b', edgeIndex: 1, t: 0.65, type: 'double', depthCm: 0.55 }]
  const draft = createApprovedNotchManifest20261023(garment, revision)
  assert.equal(draft.status, 'draft_for_external_approval')
  const approval = {
    manifest: structuredClone(draft.manifest),
    sha256: draft.sha256,
    signatureBase64: sign(null, Buffer.from(draft.signingPayload), privateKey).toString('base64'),
  }
  return { garment, approval, originalPayload: draft.signingPayload, originalDigest: draft.sha256 }
}

function assertKnownGap(mutate, description) {
  const { garment, approval, originalPayload, originalDigest } = fixture()
  const sourceBefore = structuredClone(garment)
  mutate(garment)
  assert.notDeepEqual(garment, sourceBefore, `${description}: mutation must be real`)
  const changedBeforeCheck = structuredClone(garment)
  const draftAfter = createApprovedNotchManifest20261023(garment, revision)
  assert.equal(draftAfter.status, 'draft_for_external_approval')
  assert.equal(draftAfter.signingPayload, originalPayload, `${description}: ID-only payload unchanged`)
  assert.equal(draftAfter.sha256, originalDigest, `${description}: ID-only digest unchanged`)
  const result = verifyApprovedNotchInventory20261023(garment, revision, approval, publicKey)
  assert.equal(result.status, 'signed_inventory_identity_match', `${description}: KNOWN GAP`)
  assert.equal(result.authenticatedAgainstSuppliedKey, true)
  assert.equal(result.blockers, 0)
  assert.deepEqual(result.issues, [])
  assert.deepEqual(garment, changedBeforeCheck, `${description}: verifier must leave changed source untouched`)
  assert.equal(result.factoryCertified, false)
  assert.equal(result.factoryCuttingAuthorized, false)
  assert.equal(result.bulkProductionAuthorized, false)
}

test('KNOWN GAP: changing edgeIndex with unchanged notch IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[0].notches[0].edgeIndex = 2 }, 'edgeIndex')
})

test('KNOWN GAP: changing t with unchanged notch IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[0].notches[0].t = 0.75 }, 'fractional station t')
})

test('KNOWN GAP: changing physical notch type with unchanged IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[1].notches[0].type = 'single' }, 'physical notch type')
})

test('KNOWN GAP: changing physical depth with unchanged IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[1].notches[0].depthCm = 1.1 }, 'physical notch depth')
})

test('KNOWN GAP: moving piece contour point with unchanged IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[0].points[0].x += 3 }, 'piece contour geometry')
})

test('KNOWN GAP: changing an edge curve with unchanged IDs retains signed identity match', () => {
  assertKnownGap(p => { p.pieces[0].curves = { ...p.pieces[0].curves, 0: { cx: 4, cy: 5 } } }, 'piece curve geometry')
})
