import assert from 'node:assert/strict'
import { createDefaultProject } from '../src/data/defaultProject.js'
import { gradeRulesToCsv, parseGradeRulesCsv } from '../src/core/gradeRuleCsv.js'

const garment = createDefaultProject()
const original = JSON.stringify(garment)
const piece = structuredClone(garment.pieces[0])
piece.points[0].gradeRule = {enabled: true, dxPerSize: -1.25, dyPerSize: 0.75}
piece.points.at(-1).gradeRule = {enabled: true, dxPerSize: 0, dyPerSize: -0.5}
const text = gradeRulesToCsv(piece)
const rules = parseGradeRulesCsv(text, piece)
assert.equal(rules.length, piece.points.length)
assert.deepEqual(rules[0], piece.points[0].gradeRule)
assert.deepEqual(rules.at(-1), piece.points.at(-1).gradeRule)
assert.equal(rules[1], null)
assert.equal(JSON.stringify(garment), original, 'CSV interchange must never mutate the garment')
const line = text.split('\r\n')
const rejects = [
  line.slice(0,-2).join('\r\n'),
  text.replace(piece.id, 'WRONG-PIECE'),
  text.replace(`,${piece.points.length},1,`, `,${piece.points.length+1},1,`),
  text.replace(`,2,${piece.points[1].x},${piece.points[1].y},AUTO,,`, `,1,${piece.points[1].x},${piece.points[1].y},AUTO,,`),
  text.replace(',CUSTOM,-1.25,0.75', ',CUSTOM,NaN,0.75'),
  text.replace(',CUSTOM,-1.25,0.75', ',CUSTOM,13,0.75'),
  text.replace(',CUSTOM,-1.25,0.75', ',CUSTOM,1e309,0.75'),
  text.replace(',AUTO,,', ',CUSTOM,,0'),
  text.replace(`,1,${piece.points[0].x},${piece.points[0].y},CUSTOM`, `,1,${piece.points[0].x+1},${piece.points[0].y},CUSTOM`),
  text.replace('piece_id,point_count', 'item_id,point_count'),
  text.replace('"'+piece.id+'"', '"bad""quoted"'),
  'x'.repeat(1024*1024+1),
]
for (const [index, input] of rejects.entries())
  assert.throws(() => parseGradeRulesCsv(input, piece), undefined, `Malformed CSV scenario ${index} must be rejected`)
const quotedPiece = {...piece,id:'piece,"quoted"'}
assert.deepEqual(parseGradeRulesCsv(gradeRulesToCsv(quotedPiece), quotedPiece),rules)
const reorderedPiece = structuredClone(piece)
;[reorderedPiece.points[0], reorderedPiece.points[1]] = [reorderedPiece.points[1], reorderedPiece.points[0]]
assert.throws(() => parseGradeRulesCsv(text, reorderedPiece),/base point coordinates differ/)
console.log(JSON.stringify({pass:true,roundTripPoints:rules.length,invalidCasesRejected:rejects.length,quotedPieceId:true,garmentUnchanged:true}))
