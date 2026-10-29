import assert from 'node:assert/strict'
import { GARMENT_TEMPLATES } from '../src/data/templates.js'
import { gradeRulesToCsv, parseGradeRulesCsv } from '../src/core/gradeRuleCsv.js'

let templates = 0, patterns = 0, checkedPoints = 0, invalidCrossPieceBlocked = 0
for (const template of GARMENT_TEMPLATES) {
  const project = template.create()
  const before = JSON.stringify(project)
  templates++
  for (const piece of project.pieces) {
    if (!piece.points?.length) continue
    const csv = gradeRulesToCsv(piece)
    const rules = parseGradeRulesCsv(csv, piece)
    assert.equal(rules.length,piece.points.length)
    for (let index = 0; index < rules.length; index++) {
      const point = piece.points[index]
      assert.deepEqual(rules[index],point.gradeRule?.enabled === true
        ? { enabled: true, dxPerSize: Number(point.gradeRule.dxPerSize), dyPerSize: Number(point.gradeRule.dyPerSize) }
        : null)
    }
    const wrong = { ...piece, id: `${piece.id}-changed` }
    assert.throws(() => parseGradeRulesCsv(csv, wrong), /pattern identity/)
    invalidCrossPieceBlocked++
    patterns++;checkedPoints += piece.points.length
  }
  assert.equal(JSON.stringify(project),before,`${template.id} garment mutated during grading CSV round trip`)
}
assert.equal(templates,10)
assert.ok(patterns>=25)
console.log(JSON.stringify({pass:true,templates,patterns,checkedPoints,invalidCrossPieceBlocked,sourceUnchanged:true}))
