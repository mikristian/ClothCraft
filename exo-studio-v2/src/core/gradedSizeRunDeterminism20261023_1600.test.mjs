/** Source-level EXO2D-072 witness only; not an installed-app or factory acceptance test. */
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash, generateKeyPairSync, sign} from 'node:crypto'
import {buildSizeRun, gradeProject} from './grading.js'
import {createApprovedNotchGeometryDraft20261023, verifyApprovedNotchGeometry20261023} from './approvedNotchGeometry20261023_1500.js'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const fixture = () => ({
  id: 'grade-identity-study',
  grading: {sizes: [...sizes], baseSize: 'M', widthPerSizeCm: 2, lengthPerSizeCm: 1},
  pieces: [{
    id: 'front',
    points: [{id: 'p0', x: 0, y: 0}, {id: 'p1', x: 20, y: 0},
      {id: 'p2', x: 20, y: 30}, {id: 'p3', x: 0, y: 30}],
    notches: [{id: 'n0', edgeIndex: 1, t: 0.4, type: 'single', depthCm: 0.45}],
    internalLines: [],
  }],
})
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

test('EXO2D-072 six-size grading is repeatable, ordered, and does not mutate source', () => {
  const source = fixture()
  const before = JSON.stringify(source)
  const first = buildSizeRun(source)
  const second = buildSizeRun(source)
  assert.deepEqual(Object.keys(first), sizes)
  assert.equal(digest(first), digest(second))
  assert.equal(JSON.stringify(source), before)
  for (const size of sizes) {
    assert.equal(first[size].previewSize, size)
    assert.equal(first[size].pieces[0].id, 'front')
    assert.deepEqual(first[size].pieces[0].points.map(p => p.id), ['p0','p1','p2','p3'])
    assert.equal(first[size].pieces[0].notches[0].id, 'n0')
    assert.deepEqual(first[size], gradeProject(source, size))
  }
  assert.notEqual(digest(first.XS.pieces[0].points), digest(first.XXL.pieces[0].points))
  first.XS.pieces[0].points[0].x = 999
  assert.equal(JSON.stringify(source), before)
  assert.notEqual(first.XXL.pieces[0].points[0].x, 999)
})

test('EXO2D-072 rejects ambiguous size names and stale industrial grading rules', () => {
  const duplicate = fixture()
  duplicate.grading.sizes[5] = 'XL'
  assert.throws(() => buildSizeRun(duplicate), /unique|size/i)
  const stale = fixture()
  stale.pieces[0].points[0].industrialGradeRule = {
    mode: 'small-large-incremental', sizes: ['S','M','L'], baseSize: 'M',
    steps: [{dx: 1, dy: 0}, {dx: 1, dy: 0}],
  }
  const before = JSON.stringify(stale)
  assert.throws(() => buildSizeRun(stale), /size set/i)
  assert.equal(JSON.stringify(stale), before)
})

test('prior signed authored source identity does not bind changed grading increments', () => {
  const source = fixture()
  const draft = createApprovedNotchGeometryDraft20261023(source, 'fixed-revision')
  assert.equal(draft.status, 'draft_for_external_review')
  const {privateKey, publicKey} = generateKeyPairSync('ed25519')
  const approval = {manifest: draft.manifest, sha256: draft.sha256,
    signatureBase64: sign(null, Buffer.from(draft.payload), privateKey).toString('base64')}
  const trusted = {publicKey,
    pinnedSpkiSha256: createHash('sha256').update(publicKey.export({format:'der', type:'spki'})).digest('hex')}
  const altered = fixture()
  altered.grading.widthPerSizeCm = 4
  const legacy = verifyApprovedNotchGeometry20261023(altered, 'fixed-revision', approval, trusted)
  assert.equal(legacy.status, 'authenticated_authored_source_snapshot_only')
  assert.equal(legacy.factoryCertified, false)
  assert.notEqual(digest(buildSizeRun(source).XS.pieces[0].points),
    digest(buildSizeRun(altered).XS.pieces[0].points))
  assert.equal(draft.physicalGeometryValidated, false)
})
