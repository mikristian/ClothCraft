#!/usr/bin/env node
/** Read-only endpoint constraint study for both 501 back-yoke joins, W28–W38. */
import assert from 'node:assert/strict'
import { create501JeansTemplate } from '../src/data/jeans501.js'
import { inspectJeans501WaistGradeCandidate } from '../src/core/jeans501WaistGradeCandidate.js'
import { edgeRangeLength } from '../src/core/project.js'

const source = create501JeansTemplate()
const sourceJSON = JSON.stringify(source)
const candidate = inspectJeans501WaistGradeCandidate(source)
const piecesFor = snapshot => new Map(snapshot.pieces.map(piece => [piece.id, piece]))
const num = value => Number(value.toFixed(9))
const length = (piece, edge) => edgeRangeLength(piece, edge)
const seamsAt = (snapshot, pieceId, vertexIndex) => snapshot.seams.flatMap(seam =>
  ['a', 'b'].flatMap(part => {
    const endpoint = seam[part]
    if (endpoint.pieceId !== pieceId) return []
    const piece = snapshot.pieces.find(item => item.id === pieceId)
    const start = endpoint.edgeIndex
    const end = (start + 1) % piece.points.length
    if (start !== vertexIndex && end !== vertexIndex) return []
    return [{ seamId: seam.id, side: part, edgeIndex: start, vertexRole: start === vertexIndex ? 'start' : 'end' }]
  }))

const rows = []
for (const size of source.grading.sizes) {
  const snapshot = candidate.snapshots[size]
  const lookup = piecesFor(snapshot)
  for (const side of ['left', 'right']) {
    const back = lookup.get(`${side}-back-leg`)
    const yoke = lookup.get(`${side}-back-yoke`)
    const target = length(back, 9)
    const before = length(yoke, 2)
    const signed = target - before
    // Yoke edge 2 runs point 2 -> point 3, with a horizontal baseline.
    const start = yoke.points[2], end = yoke.points[3]
    assert(Math.abs(start.y - end.y) < 1e-8)
    const shift = target - (start.x - end.x)
    const changedRight = structuredClone(yoke)
    changedRight.points[2].x += shift
    const changedLeft = structuredClone(yoke)
    changedLeft.points[3].x -= shift
    const rightSeatBefore = length(yoke, 1)
    const rightSeatAfter = length(changedRight, 1)
    const leftSideBefore = length(yoke, 3)
    const leftSideAfter = length(changedLeft, 3)
    const rightWaistBefore = length(yoke, 0)
    const rightWaistAfter = length(changedRight, 0)
    const leftWaistAfter = length(changedLeft, 0)
    const adjacentSeat = snapshot.seams.find(seam => seam.id === 'back-center-yoke')
    assert(adjacentSeat && adjacentSeat.a.pieceId === 'left-back-yoke' && adjacentSeat.a.edgeIndex === 1)
    const endpointRefs = [2, 3].map(index => ({
      vertexIndex: index, positionCm: yoke.points[index],
      seamReferences: seamsAt(snapshot, yoke.id, index),
      topstitchReferences: (yoke.topstitches || []).filter(stitch => [index, (index + yoke.points.length - 1) % yoke.points.length].includes(stitch.edgeIndex))
        .map(stitch => ({ id: stitch.id, edgeIndex: stitch.edgeIndex })),
    }))
    const rightJoinAfter = length(changedRight, 2)
    const leftJoinAfter = length(changedLeft, 2)
    assert(Math.abs(rightJoinAfter - target) < 1e-7)
    assert(Math.abs(leftJoinAfter - target) < 1e-7)
    const base = size === 'W32'
    rows.push({ size, side, seamId: `${side}-yoke-join`, backJoinCm: num(target), yokeJoinCm: num(before),
      signedDifferenceCm: num(signed), proposedShiftRightEndpointXCm: num(shift),
      endpointReferences: endpointRefs,
      alternatives: {
        moveRightEndpoint2X: { joinAfterCm: num(rightJoinAfter), seatEdge1BeforeCm: num(rightSeatBefore),
          seatEdge1AfterCm: num(rightSeatAfter), seatChangeCm: num(rightSeatAfter - rightSeatBefore),
          upperWaistEdge0BeforeCm: num(rightWaistBefore), upperWaistEdge0AfterCm: num(rightWaistAfter),
          upperWaistChangeCm: num(rightWaistAfter - rightWaistBefore),
          disposition: base ? 'UNCHANGED_W32_REFERENCE' : 'BLOCKED_SHARED_BACK_CENTER_YOKE_SEAM' },
        moveLeftEndpoint3X: { joinAfterCm: num(leftJoinAfter), outseamEdge3BeforeCm: num(leftSideBefore),
          outseamEdge3AfterCm: num(leftSideAfter), outseamChangeCm: num(leftSideAfter - leftSideBefore),
          upperWaistEdge0BeforeCm: num(rightWaistBefore), upperWaistEdge0AfterCm: num(leftWaistAfter),
          upperWaistChangeCm: num(leftWaistAfter - rightWaistBefore),
          disposition: base ? 'UNCHANGED_W32_REFERENCE' : 'BLOCKED_SHARED_OUTSEAM_YOKE_ENDPOINT' },
      },
      disposition: base ? 'FEASIBLE_UNCHANGED_W32_REFERENCE' : 'BLOCKED_SHARED_JUNCTION_NEEDS_APPROVED_COUPLED_REGRADING',
    })
  }
}
assert.equal(rows.length, 12)
assert.equal(rows.filter(row => row.disposition.startsWith('BLOCKED')).length, 10)
assert.equal(rows.filter(row => row.size === 'W32' && Math.abs(row.signedDifferenceCm) < 0.3).length, 2)
assert.equal(JSON.stringify(source), sourceJSON, 'Original source geometry changed')
console.log(JSON.stringify({ schema: 'exo-501-yoke-constraint-graph.v1', status: 'BLOCKED',
  approved: false, factoryCertified: false, sourcePreserved: true,
  sizes: source.grading.sizes, totalYokeCases: rows.length, unresolvedNonbaseYokeJoins: 10,
  note: 'Measured standalone endpoint translations only; these are not approved grade rules or factory seam ease.',
  rows }, null, 2))
