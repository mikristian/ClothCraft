import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gradeRulesToCsv, parseGradeRulesCsv } from './gradeRuleCsv.js'
import { gradePiece, buildSizeRun } from './grading.js'

const sizes = { sizes: ['XS', 'S', 'M', 'L', 'XL'], baseSize: 'M', widthPerSizeCm: 3, lengthPerSizeCm: 1 }
const sample = () => ({
  id: 'front, "panel"',
  points: [
    { id: 'neck', x: 0, y: 0, gradeRule: { enabled: true, dxPerSize: 0.625, dyPerSize: -0.375 } },
    { id: 'shoulder', x: 20, y: 0, gradeRule: { enabled: true, dxPerSize: -1.25, dyPerSize: 0 } },
    { id: 'hem', x: 20, y: 30 },
    { id: 'side', x: 0, y: 30 },
  ],
  internalLines: [],
})

test('spreadsheet CSV rules survive serialization and yield reversible five-size point grading', () => {
  const original = sample()
  const originalText = JSON.stringify(original)
  const csv = gradeRulesToCsv(original)
  assert.match(csv, /"front, ""panel"""/)
  const imported = parseGradeRulesCsv('\uFEFF' + csv, original)
  const restored = structuredClone(original)
  restored.points.forEach((point, index) => { point.gradeRule = imported[index] })
  const project = { pieces: [restored], grading: sizes }
  const run = buildSizeRun(project)
  assert.deepEqual(Object.keys(run), sizes.sizes)
  for (const [size, step] of [['XS', -2], ['S', -1], ['M', 0], ['L', 1], ['XL', 2]]) {
    const graded = run[size].pieces[0]
    assert.equal(graded.points[0].x, step * 0.625, `${size} neck X`)
    assert.ok(Math.abs(graded.points[0].y - step * -0.375) < 1e-10, `${size} neck Y`)
    assert.equal(graded.points[1].x, 20 - step * 1.25, `${size} shoulder X`)
    assert.equal(graded.points[1].y, 0, `${size} shoulder Y`)
    assert.deepEqual(graded.points.map(p => p.id), original.points.map(p => p.id))
    assert.deepEqual(graded.points[0].gradeRule, imported[0])
  }
  run.XL.pieces[0].points[0].gradeRule.dxPerSize = 99
  assert.equal(restored.points[0].gradeRule.dxPerSize, 0.625)
  assert.equal(JSON.stringify(original), originalText, 'CSV and grading must preserve original')
  assert.equal(gradePiece(restored, sizes, 'M').points[0].x, 0)
})

test('CSV rejects identity drift even when point count and all grading increments remain valid', () => {
  const original = sample()
  const csv = gradeRulesToCsv(original)
  const movedPoint = structuredClone(original)
  movedPoint.points[2].x += 0.0001
  assert.throws(() => parseGradeRulesCsv(csv, movedPoint), /base point coordinates differ/)
  const wrongPiece = { ...original, id: 'back, "panel"' }
  assert.throws(() => parseGradeRulesCsv(csv, wrongPiece), /pattern identity/)
  const rows = csv.trimEnd().split('\r\n')
  const swapped = [...rows]
  ;[swapped[1], swapped[2]] = [swapped[2], swapped[1]]
  assert.deepEqual(parseGradeRulesCsv(swapped.join('\r\n'), original), parseGradeRulesCsv(csv, original), 'Spreadsheet row sorting by index is supported')
  const duplicated = [...rows]
  duplicated[2] = duplicated[1]
  assert.throws(() => parseGradeRulesCsv(duplicated.join('\r\n'), original), /duplicate point index/)
})
