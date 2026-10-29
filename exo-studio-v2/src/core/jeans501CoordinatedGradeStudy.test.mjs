import test from 'node:test'
import assert from 'node:assert/strict'
import { create501JeansTemplate } from '../data/jeans501.js'
import { gradeProject } from './grading.js'
import { inspectJeans501CoordinatedGradeStudy } from './jeans501CoordinatedGradeStudy.js'
import { inspectManufacturingReleaseReadiness } from './manufacturingReleaseReadiness.js'

test('all sewn edge lengths and shared yoke stations match across reference-only W28–W38 snapshots', () => {
  const source = create501JeansTemplate()
  const before = structuredClone(source)
  const result = inspectJeans501CoordinatedGradeStudy(source)
  assert.deepEqual(source, before)
  assert.deepEqual(result.numerical, {
    checked: 36, lengthPasses: 36, lengthFailures: 0,
    yokeEndpointChecks: 12, yokeEndpointPasses: 12,
  })
  assert.equal(result.approved, false)
  assert.equal(result.installed, false)
  assert.equal(result.adjacent.length, 12)
  assert.equal(result.seams.filter(row => row.size !== 'W32').length, 30)
  assert(result.seams.every(row => row.lengthPass && row.endpointPass))
  assert(result.seams.filter(row => row.endpointGapsCm).every(row =>
    row.endpointGapsCm.every(gap => gap < 1e-8)))
  assert(result.adjacent.filter(row => row.size !== 'W32').every(row =>
    row.cornersMovedCm.every(delta => delta > 0) &&
    (Math.abs(row.changesCm.yokeSeatEdgeCm) > 1e-8 ||
     Math.abs(row.changesCm.yokeOutseamEdgeCm) > 1e-8)))
  assert(result.adjacent.every(row => row.pomVerified === false))
  for (const size of result.sizes) {
    const snapshot = result.snapshots[size]
    const baseline = gradeProject(source, size)
    assert.deepEqual(snapshot.seams, source.seams)
    for (const piece of snapshot.pieces.filter(piece => piece.id.includes('-leg'))) {
      assert.deepEqual(piece, baseline.pieces.find(other => other.id === piece.id))
    }
    if (size === 'W32') assert.deepEqual(snapshot.pieces, source.pieces)
    assert.equal(snapshot.gradeProvenance.referenceOnly, true)
    const release = inspectManufacturingReleaseReadiness(JSON.parse(JSON.stringify(snapshot)))
    assert.equal(release.status, 'BLOCKED_NOT_APPROVED')
    assert.equal(release.factoryCertified, false)
    assert.equal(release.factoryCuttingAuthorized, false)
    assert(release.blockers.some(row => row.code === 'UNAPPROVED_GRADE_TABLE'))
    assert(release.blockers.some(row => row.code === 'REFERENCE_ONLY_PATTERN'))
  }
})

test('rejects altered sewing references and leaves malformed inputs untouched', () => {
  const missing = create501JeansTemplate()
  missing.seams = missing.seams.filter(seam => seam.id !== 'left-back-waist')
  const untouched = structuredClone(missing)
  assert.throws(() => inspectJeans501CoordinatedGradeStudy(missing), /Missing or altered sewing references/)
  assert.deepEqual(missing, untouched)
  const mismatched = create501JeansTemplate()
  mismatched.seams.find(seam => seam.id === 'right-yoke-join').b.edgeIndex = 1
  assert.throws(() => inspectJeans501CoordinatedGradeStudy(mismatched), /Missing or altered sewing references/)
})
