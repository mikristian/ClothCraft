import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeRulesToCsv, parseGradeRulesCsv} from './gradeRuleCsv.js'
import {createDefaultProject} from '../data/defaultProject.js'
import {INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'

test('uniform grading CSV refuses nonuniform size-break tables, without mutating base pattern', () => {
  const piece = structuredClone(createDefaultProject().pieces[0])
  const legacy = gradeRulesToCsv(piece)
  const before = structuredClone(piece)
  piece.points[0].industrialGradeRule = {
    mode: INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], baseSize: 'M',
    steps: [{dx:-.4,dy:.1},{dx:-.2,dy:.3},{dx:.5,dy:0},{dx:.7,dy:-.2},{dx:1.2,dy:-.4}],
  }
  const industrial = structuredClone(piece)
  assert.throws(() => gradeRulesToCsv(piece), /nonuniform industrial grade table/i)
  assert.throws(() => parseGradeRulesCsv(legacy, piece), /industrial size-break rule/i)
  assert.deepEqual(piece, industrial, 'refusing loss of nonuniform grades must not mutate the pattern')
  assert.deepEqual(parseGradeRulesCsv(legacy, before).length, before.points.length)
})
