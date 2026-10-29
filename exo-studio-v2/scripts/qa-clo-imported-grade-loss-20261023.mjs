import assert from 'node:assert/strict'
import { createTemplateProject } from '../src/data/templates.js'
import { canonicalizeCloMaleTshirtProject } from '../src/data/cloMaleTshirtCanonicalization.js'
import { studyCloSmallSizeGrades } from '../src/core/cloSmallSizeGradeStudy.js'
import { gradeProject } from '../src/core/grading.js'
import { inspectManufacturingReleaseReadiness } from '../src/core/manufacturingReleaseReadiness.js'
import { inspectGradedCutlines } from '../src/core/industrialCutlineQA.js'

const original = createTemplateProject('clo-male-tshirt')
const originalSnapshot = structuredClone(original)
const { project, indexMaps, removedPointCount } = canonicalizeCloMaleTshirtProject(original)
const canonicalSnapshot = structuredClone(project)
const study = studyCloSmallSizeGrades(project, { sizes: ['XS', 'S', 'M'] })
assert.equal(removedPointCount, 26)
const bySize = Object.fromEntries(study.results.map(entry => [entry.size, entry]))
assert.equal(bySize.M.blockers, 0)
assert.equal(bySize.M.pieces.length, 0)

const grading = Object.fromEntries(['XS', 'S', 'M'].map(size => [size, gradeProject(project, size)]))
const piecesBySize = Object.fromEntries(Object.entries(grading).map(([size, doc]) =>
  [size, new Map(doc.pieces.map(piece => [piece.id, piece]))]))
const reports = []
for (const size of ['XS', 'S']) {
  const row = bySize[size]
  assert.equal(row.status, 'blocked')
  assert.equal(row.blockers, 16)
  assert.equal(row.pieces.length, 8)
  assert.equal(row.pieces.reduce((total, entry) => total + entry.intersections.length, 0), 16)
  const cutlines = inspectGradedCutlines(project, { sizes: [size] })
  assert.equal(cutlines.blockers, 16)
  assert(cutlines.issues.every(issue => issue.code.includes('SELF_INTERSECTION')))
  for (const hitGroup of row.pieces) {
    const map = indexMaps[hitGroup.pieceId]
    assert(map, `unexpected crossing in ${hitGroup.pieceId}`)
    const actual = piecesBySize[size].get(hitGroup.pieceId)
    const base = piecesBySize.M.get(hitGroup.pieceId)
    for (const hit of hitGroup.intersections) {
      assert.equal(hit.type, 'crossing')
      assert(Number.isInteger(hit.sourceEdgeA) && Number.isInteger(hit.sourceEdgeB))
      const a = hit.sourceEdgeA, b = hit.sourceEdgeB
      assert(a >= 0 && a < base.points.length && b >= 0 && b < base.points.length)
      const baseSegment = edge => [base.points[edge], base.points[(edge + 1) % base.points.length]]
      const sizeSegment = edge => [actual.points[edge], actual.points[(edge + 1) % actual.points.length]]
      const vector = edge => baseSegment(edge).map((point, index) => ({
        dx: +(sizeSegment(edge)[index].x - point.x).toFixed(6),
        dy: +(sizeSegment(edge)[index].y - point.y).toFixed(6),
      }))
      const sourceEdge = edge => map.canonicalToOriginal[edge]
      reports.push({size, piece:hitGroup.pieceId, contour:hitGroup.contour,
        canonicalEdgePair:[a,b], importedOriginalStartingEdgePair:[sourceEdge(a), sourceEdge(b)],
        intersectionCm:hit.location,
        baseMEndpointsCm:[baseSegment(a),baseSegment(b)],
        gradedEndpointsCm:[sizeSegment(a),sizeSegment(b)],
        vertexMovementCm:[vector(a),vector(b)],
        cutEdgeMappingCaveat:hitGroup.contour === 'CUT' ? 'Mapped via STITCH sample ordering; verify CUT offset construction independently' : undefined})
    }
  }
  const release = inspectManufacturingReleaseReadiness(project)
  assert.equal(release.status, 'BLOCKED_NOT_APPROVED')
  assert.equal(release.factoryCertified, false)
  assert.equal(release.factoryCuttingAuthorized, false)
  assert.equal(release.bulkProductionAuthorized, false)
  assert(release.blockers.some(blocker => blocker.code === 'PHYSICAL_CUTLINE_QA'))
  assert(release.blockers.some(blocker => blocker.code === 'UNAPPROVED_IMPORTED_CANONICALIZATION'))
}
assert.deepEqual(original, originalSnapshot)
assert.deepEqual(project, canonicalSnapshot)
const pairs = Object.fromEntries(['XS','S'].map(size => [size, reports.filter(row => row.size === size)
  .map(({piece,contour,canonicalEdgePair,importedOriginalStartingEdgePair}) => ({piece,contour,canonicalEdgePair,importedOriginalStartingEdgePair}))]))
console.log(JSON.stringify({schema:'clo-imported-grade-loss-audit.v1', status:'BLOCKED',
  importedPointDuplicatesRemoved:removedPointCount, sizeBlockers:Object.fromEntries(study.results.map(r=>[r.size,r.blockers])),
  crossingSourceEdges:pairs, detail:reports,
  interpretation:'M is valid for identical canonical contour topology, while XS/S coordinates shift under generic grading. Crossing changes therefore occur with size transformation. Original import contour intent and grade rules require external confirmation; edge pair evidence alone cannot establish the intended factory shape.',
  factoryExportAssertions:'PASS: no factory certification, cutting authorization, or bulk production authorization',
  originalAndCanonicalUnmodified:true},null,2))
