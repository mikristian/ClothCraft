import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTemplateProject } from '../data/templates.js'
import { canonicalizeCloMaleTshirtProject } from '../data/cloMaleTshirtCanonicalization.js'
import { studyCloSmallSizeCrossingRepair } from './cloSmallSizeCrossingRepairStudy.js'

test('original source vertex mapping and actual XS/S crossing faults remain visible with manufacture blocked', () => {
  const imported = createTemplateProject('clo-male-tshirt')
  const beforeImported = structuredClone(imported)
  const { project, indexMaps } = canonicalizeCloMaleTshirtProject(imported)
  const beforeProject = structuredClone(project)
  const report = studyCloSmallSizeCrossingRepair(project)
  assert.deepEqual(imported, beforeImported)
  assert.deepEqual(project, beforeProject)
  assert.equal(report.factoryCertified, false)
  assert.equal(report.manufacturingExportAllowed, false)
  assert.equal(report.candidate.accepted, false)
  assert.equal(report.candidate.geometryChanged, false)
  assert.equal(report.baseSizePreserved, true)
  for (const row of report.results) {
    assert.equal(row.cutStitch.status, row.status)
    assert.equal(row.marksAndSeams.pieceMarkCounts.length, project.pieces.length)
    if (['XS', 'S'].includes(row.size)) {
      assert.equal(row.status, 'blocked')
      assert.equal(row.blockers, 16)
      assert.equal(row.intersections.length, 16)
      assert.equal(row.intersections.filter(hit => hit.contour === 'STITCH').length, 8)
      assert.equal(row.intersections.filter(hit => hit.contour === 'CUT').length, 8)
      for (const hit of row.intersections) {
        assert.equal(hit.type, 'crossing')
        assert(hit.canonicalEdges.every((edge, i) => indexMaps[hit.pieceId].canonicalToOriginal[edge] === hit.originalStartVertexIndices[i]))
        assert(hit.originalStartVertexIndices.every(Number.isInteger))
        assert(Number.isFinite(hit.point.x) && Number.isFinite(hit.point.y))
      }
    } else {
      assert.equal(row.status, 'pass')
      assert.equal(row.blockers, 0)
      assert.equal(row.industrial.blockers, 0)
      assert.equal(row.cutStitch.blockers, 0)
      assert.equal(row.intersections.length, 0)
    }
  }
})

test('refuses noncanonical or provenance-free projects', () => {
  const project = createTemplateProject('clo-male-tshirt')
  assert.throws(() => studyCloSmallSizeCrossingRepair(project), /requires an opt-in canonicalized/)
})
