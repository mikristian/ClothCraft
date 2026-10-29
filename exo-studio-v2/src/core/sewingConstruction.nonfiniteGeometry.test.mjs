import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateNewSeam, auditSewingConstruction } from './sewingConstruction.js'

const makeProject = () => ({
  pieces: [
    { id: 'a', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }] },
    { id: 'b', points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }] },
  ],
  seams: [],
})
const makeSeam = () => ({
  id: 'test',
  a: { pieceId: 'a', edgeIndex: 0, startT: 0, endT: 1 },
  b: { pieceId: 'b', edgeIndex: 0, startT: 0, endT: 1 },
})

test('valid finite 2D sewing geometry remains accepted', () => {
  const project = makeProject()
  const seam = makeSeam()
  assert.equal(validateNewSeam(project, seam).ok, true)
  project.seams = [seam]
  assert.equal(auditSewingConstruction(project).usableForLiveAssembly, true)
})

for (const [label, corrupt] of [
  ['NaN endpoint', p => { p.pieces[0].points[1].x = NaN }],
  ['infinite endpoint', p => { p.pieces[1].points[1].y = Infinity }],
  ['NaN Bézier control', p => { p.pieces[0].curves = { 0: { cx: NaN, cy: 10 } } }],
  ['overflowing finite coordinates', p => { p.pieces[0].points[0].x = -1e308; p.pieces[0].points[1].x = 1e308 }],
]) {
  test(`non-finite sewing edge length is rejected: ${label}`, () => {
    const project = makeProject()
    corrupt(project)
    const before = structuredClone(project)
    const seam = makeSeam()
    const result = validateNewSeam(project, seam)
    assert.equal(result.ok, false, 'invalid cutting geometry cannot create a seam')
    assert.equal(result.lengths, null)
    project.seams = [seam]
    const audit = auditSewingConstruction(project)
    assert.equal(audit.usableForLiveAssembly, false, 'invalid geometry cannot pass assembly preflight')
    assert.ok(audit.categories.invalidEndpoints > 0)
    assert.deepEqual(project.pieces, before.pieces, 'geometry must not be modified by validation')
  })
}
