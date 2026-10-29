import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findBoundaryNearContacts, auditGradedBoundaryClearance } from './gradedBoundaryClearanceAudit.js'

const rectangle = () => ({ id: 'front', points: [
  { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
] })
const projectFor = piece => ({ pieces: [piece], grading: {
  sizes: ['M', 'L'], baseSize: 'M', widthPerSizeCm: 0, lengthPerSizeCm: 0,
} })

test('finds a near miss before opposite stitchline edges cross', () => {
  const piece = rectangle()
  piece.points[2].y = 0.06
  piece.points[3].y = 0.06
  const contacts = findBoundaryNearContacts(piece)
  assert.equal(contacts.length, 1)
  assert.deepEqual([contacts[0].firstEdge, contacts[0].secondEdge], [0, 2])
  assert.ok(Math.abs(contacts[0].clearanceCm - 0.06) < 1e-9)
})

test('reports newly introduced near contact without modifying source', () => {
  const piece = rectangle()
  piece.points[2].gradeRule = { enabled: true, dxPerSize: 0, dyPerSize: -9.94 }
  piece.points[3].gradeRule = { enabled: true, dxPerSize: 0, dyPerSize: -9.94 }
  const source = projectFor(piece), snapshot = structuredClone(source)
  const report = auditGradedBoundaryClearance(source)
  assert.equal(report.pass, false)
  assert.deepEqual(report.issues.map(issue => [issue.code, issue.size, issue.firstEdge, issue.secondEdge]),
    [['GRADED_BOUNDARY_NEAR_CONTACT', 'L', 0, 2]])
  assert.equal(report.inspectedPieces, 2)
  assert.deepEqual(source, snapshot)
})

test('does not attribute a pre-existing near contact to grading', () => {
  const piece = rectangle()
  piece.points[2].y = 0.06
  piece.points[3].y = 0.06
  assert.equal(auditGradedBoundaryClearance(projectFor(piece)).pass, true)
})

test('detects curved boundary near contacts with unchanged endpoints', () => {
  const piece = rectangle()
  piece.curves = { 0: { cx: 5, cy: 19.88 } }
  const contacts = findBoundaryNearContacts(piece)
  assert.ok(contacts.some(contact => contact.firstEdge === 0 && contact.secondEdge === 2))
})

test('ignores shared corners, rejects invalid tolerances and nonfinite curves', () => {
  assert.deepEqual(findBoundaryNearContacts(rectangle()), [])
  assert.throws(() => findBoundaryNearContacts(rectangle(), { minClearanceCm: 0 }), /positive and finite/)
  assert.throws(() => findBoundaryNearContacts(rectangle(), { minArcSeparationCm: -1 }), /finite and nonnegative/)
  assert.throws(() => findBoundaryNearContacts(rectangle(), { segmentsPerCurve: 1 }), /2 to 64/)
  const piece = rectangle()
  piece.curves = { 0: { cx: Infinity, cy: 1 } }
  assert.throws(() => findBoundaryNearContacts(piece), /finite/)
})

test('does not flag nearby vertices on the same smooth dense contour', () => {
  const piece = { id: 'dense', points: [
    { x: 0, y: 0 }, ...Array.from({ length: 101 }, (_, i) => ({ x: 1 + i * 0.08, y: 0 })),
    { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
  ] }
  assert.deepEqual(findBoundaryNearContacts(piece), [])
})

test('does not duplicate a proper crossing already handled by crossing QA', () => {
  const piece = rectangle()
  piece.points[2].x = -2
  assert.deepEqual(findBoundaryNearContacts(piece), [])
})

test('flags nonadjacent endpoint contact that is not a proper crossing', () => {
  const piece = rectangle()
  piece.points[2] = { x: 5, y: 0 }
  const contacts = findBoundaryNearContacts(piece)
  assert.ok(contacts.some(contact => contact.firstEdge === 0 && contact.secondEdge === 2 && contact.clearanceCm === 0))
})
