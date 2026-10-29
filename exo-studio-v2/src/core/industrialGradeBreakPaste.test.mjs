import test from 'node:test'
import assert from 'node:assert/strict'
import {parseIndustrialGradeBreakPaste,formatIndustrialGradeBreakPaste} from './industrialGradeBreakPaste.js'
import {INDUSTRIAL_GRADE_MODES,convertIndustrialGradeRule,evaluateIndustrialGradeTable} from './industrialGradeRules.js'

const rule={mode:'small-large-incremental',sizes:['XS','S','M','L','XL','XXL'],baseSize:'M',
  steps:[{dx:1,dy:-.1},{dx:2,dy:.2},{dx:3,dy:.3},{dx:4,dy:.4},{dx:5,dy:.5}]}

test('copy/paste preserves every asymmetric grade break across all three rule modes',()=>{
 for(const mode of Object.values(INDUSTRIAL_GRADE_MODES)){
  const initial=convertIndustrialGradeRule(rule,mode)
  const before=structuredClone(initial)
  const result=parseIndustrialGradeBreakPaste(formatIndustrialGradeBreakPaste(initial),initial)
  assert.equal(result.count,5)
  assert.equal(result.rule.mode,mode)
  assert.deepEqual(evaluateIndustrialGradeTable(result.rule),evaluateIndustrialGradeTable(initial))
  assert.deepEqual(initial,before)
 }
})

test('two-column Excel paste updates all breaks atomically, including negative and decimal increments',()=>{
 const initial=structuredClone(rule)
 const parsed=parseIndustrialGradeBreakPaste('1\t2\n-2.5\t0.75\n0\t0\n3\t-4\n5.5\t-6',initial)
 assert.deepEqual(parsed.rule.steps[1],{dx:-2.5,dy:.75})
 assert.deepEqual(parsed.rule.steps[4],{dx:5.5,dy:-6})
 assert.deepEqual(initial,rule)
})

test('pasted size labels, partial runs, unsafe values and malformed table fail closed',()=>{
 const initial=structuredClone(rule)
 const good=formatIndustrialGradeBreakPaste(rule)
 for(const bad of [good.replace('XS\tS','XS\tM'),good.replace('1\t-0.1','12.01\t-0.1'),
  good.replace('1\t-0.1','NaN\t-0.1'),good.replace('1\t-0.1','=SUM(1,2)\t-0.1'),
  good.split('\n').slice(0,-1).join('\n'),good+'\nM\tXXL\t1\t1',
  good.replace('From\tTo\tX cm\tY cm','From\tTo\tOther\tBad').replace('XS\tS\t1\t-0.1','S\tXS\t1\t-0.1')]){
  assert.throws(()=>parseIndustrialGradeBreakPaste(bad,rule))
  assert.deepEqual(rule,initial)
 }
})
