import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gradeRulesToCsv, parseGradeRulesCsv } from './gradeRuleCsv.js'

const piece = id => ({
  id,
  points: [
    { x: 0, y: 0, gradeRule: { enabled: true, dxPerSize: 0.75, dyPerSize: -0.25 } },
    { x: 20, y: 0 },
    { x: 20, y: 30, gradeRule: { enabled: true, dxPerSize: -0.5, dyPerSize: 0 } },
  ],
})

test('grade-rule CSV roundtrips quoted pattern identities containing CR/LF and escaped quotes', () => {
  for (const id of ['front\npanel', 'front\r\npanel', 'front\rpanel', 'front "cut"\n, panel']) {
    const original = piece(id)
    const before = structuredClone(original)
    const csv = gradeRulesToCsv(original)
    assert.deepEqual(parseGradeRulesCsv(csv, original), [
      original.points[0].gradeRule,
      null,
      original.points[2].gradeRule,
    ])
    assert.deepEqual(original, before, 'CSV interchange must not mutate the pattern')
    assert.throws(() => parseGradeRulesCsv(csv, piece(`${id} changed`)), /pattern identity/)
  }
})

test('quoted newlines do not conceal missing rows, malformed quotes or stale geometry', () => {
  const original = piece('back\n"left"')
  const csv = gradeRulesToCsv(original)
  assert.throws(() => parseGradeRulesCsv(csv.replace(',3,3,20,30,CUSTOM', ',3,3,21,30,CUSTOM'), original), /base point coordinates differ/)
  const missingRow = csv.split('\r\n')
  missingRow.splice(-2, 1)
  assert.throws(() => parseGradeRulesCsv(missingRow.join('\r\n'), original), /Expected 3 point rows/)
  assert.throws(() => parseGradeRulesCsv(csv.replace('"back', '""back'), original), /Unterminated CSV quoted field|Malformed quoted CSV field|Expected 3 point rows/)
})
