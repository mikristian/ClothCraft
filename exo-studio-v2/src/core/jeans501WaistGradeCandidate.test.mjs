import test from 'node:test'
import assert from 'node:assert/strict'
import { create501JeansTemplate } from '../data/jeans501.js'
import { inspectJeans501WaistGradeCandidate, JEANS501_WAIST_GRADE_STATUS } from './jeans501WaistGradeCandidate.js'
import { gradeProject } from './grading.js'
import { inspectManufacturingReleaseReadiness } from './manufacturingReleaseReadiness.js'

test('a source-preserving W28-W38 trial identifies unresolved shared yoke junctions', () => {
  const source = create501JeansTemplate()
  const original = structuredClone(source)
  const result = inspectJeans501WaistGradeCandidate(source)
  assert.equal(JEANS501_WAIST_GRADE_STATUS, 'PROVISIONAL_UNAPPROVED')
  assert.equal(result.approved, false)
  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.originalIndustrial.issues.filter(i => i.code === 'SEAM_LENGTH_MISMATCH').length, 30)
  assert.equal(result.originalCutlines.blockers, 0)
  assert.equal(result.rows.length, 36)
  assert.equal(result.rows.filter(row => row.disposition === 'BLOCKED').length, 10)
  assert.equal(result.rows.filter(row => row.applied).length, 20)
  assert(result.rows.filter(row => row.applied).every(row => row.errorCm < 1e-8))
  assert.deepEqual(source, original)
  const refs = new Map(source.pieces.map(piece => [piece.id, piece]))
  for (const [size, snapshot] of Object.entries(result.snapshots)) {
    assert.equal(snapshot.gradeProvenance.status, 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
    assert.equal(snapshot.gradeProvenance.sourceProjectId, source.id)
    assert.equal(snapshot.gradeProvenance.sourceTemplateId, source.templateId)
    assert.equal(snapshot.gradeProvenance.snapshotSize, size)
    assert.equal(snapshot.gradeProvenance.approved, false)
    assert.equal(snapshot.gradeProvenance.factoryCertified, false)
    assert.equal(snapshot.gradeProvenance.referenceOnly, true)
    assert.equal(snapshot.patternSource.referenceOnly, true)
    assert.deepEqual(snapshot.grading, source.grading)
    const persisted = structuredClone(JSON.parse(JSON.stringify(snapshot)))
    const release = inspectManufacturingReleaseReadiness(persisted)
    assert.equal(release.status, 'BLOCKED_NOT_APPROVED')
    assert.equal(release.factoryCertified, false)
    assert.equal(release.factoryCuttingAuthorized, false)
    assert.equal(release.bulkProductionAuthorized, false)
    assert(release.blockers.some(issue => issue.code === 'UNAPPROVED_GRADE_TABLE'))
    assert(release.blockers.some(issue => issue.code === 'REFERENCE_ONLY_PATTERN'))
    const gradedReference = new Map(gradeProject(source, size).pieces.map(piece => [piece.id, piece]))
    assert.equal(snapshot.seams.length, source.seams.length)
    assert.deepEqual(snapshot.seams, source.seams)
    for (const piece of snapshot.pieces) {
      if (piece.id.includes('-leg') || piece.id.includes('-back-pocket')) {
        assert.equal(piece.points.length, refs.get(piece.id).points.length)
        assert.deepEqual(piece.points, gradedReference.get(piece.id).points)
        assert.deepEqual(piece.curves, gradedReference.get(piece.id).curves)
      }
    }
    if (size === 'W32') assert.deepEqual(snapshot.pieces, source.pieces)
  }
  assert(result.checks.W28.industrial.issues.some(issue => issue.code === 'SEAM_LENGTH_MISMATCH'))
})

test('refuses altered or absent seam relationships, missing pieces and malformed coordinates', () => {
  const alter = callback => {
    const project = create501JeansTemplate()
    callback(project)
    assert.throws(() => inspectJeans501WaistGradeCandidate(project))
  }
  alter(project => project.seams.splice(project.seams.findIndex(seam => seam.id === 'left-yoke-join'), 1))
  alter(project => { project.seams.find(seam => seam.id === 'right-back-waist').b.edgeIndex = 1 })
  alter(project => { project.pieces = project.pieces.filter(piece => piece.id !== 'left-back-yoke') })
  alter(project => { project.pieces.find(piece => piece.id === 'left-front-waistband').points[1].x = Number.NaN })
  alter(project => { project.pieces.find(piece => piece.id === 'right-back-waistband').points[1].x += 8 })
})
