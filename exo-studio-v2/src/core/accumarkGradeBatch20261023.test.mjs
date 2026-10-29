import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkGradeBatch} from './accumarkGradeBatch20261023.js'
import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable} from './industrialGradeRules.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=(xs,ys)=>({mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',steps:xs.map((dx,i)=>({dx,dy:ys[i]}))})
function fixture(){return {grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},pieces:[
  {id:'front',points:[{x:0,y:0,industrialGradeRule:rule([.1,.2,.3,.4,.5],[.3,.2,.1,-.1,-.2])},{x:20,y:0},{x:20,y:30},{x:0,y:30}]},
  {id:'back',points:[{x:100,y:0,industrialGradeRule:rule([2,3,4,5,6],[7,6,5,4,3])},{x:120,y:0},{x:120,y:30},{x:100,y:30}]},
]}}
const source={pieceId:'front',pointIndex:0}
const target={pieceId:'back',pointIndex:0}

test('atomic cross-piece transfer preserves unequal six-size XY breaks and original',()=>{
  const original=fixture(),snapshot=structuredClone(original)
  const result=applyAccuMarkGradeBatch(original,{source,targets:[target,{pieceId:'back',pointIndex:1}]})
  assert.deepEqual(original,snapshot)
  assert.deepEqual(result.validation.sizes,sizes)
  const sourceOffsets=evaluateIndustrialGradeTable(original.pieces[0].points[0].industrialGradeRule)
  for(const size of sizes){
    const graded=gradeProject(result.project,size)
    for(const index of [0,1]){
      const point=graded.pieces[1].points[index]
      assert.ok(Math.abs(point.x-(original.pieces[1].points[index].x+sourceOffsets[size].dx))<1e-9)
      assert.ok(Math.abs(point.y-(original.pieces[1].points[index].y+sourceOffsets[size].dy))<1e-9)
    }
  }
})

test('single axis preserves authored industrial movements and automatic target movements',()=>{
  const original=fixture()
  const old=evaluateIndustrialGradeTable(original.pieces[1].points[0].industrialGradeRule)
  const sourceOffsets=evaluateIndustrialGradeTable(original.pieces[0].points[0].industrialGradeRule)
  const baseline=Object.fromEntries(sizes.map(size=>[size,gradeProject(original,size).pieces[1].points[1]]))
  const x=applyAccuMarkGradeBatch(original,{source,targets:[target,{pieceId:'back',pointIndex:1}],axis:'x'})
  const y=applyAccuMarkGradeBatch(original,{source,targets:[target],axis:'y'})
  for(const size of sizes){
    const dx=evaluateIndustrialGradeTable(x.project.pieces[1].points[0].industrialGradeRule)[size]
    const dy=evaluateIndustrialGradeTable(y.project.pieces[1].points[0].industrialGradeRule)[size]
    assert.ok(Math.abs(dx.dx-sourceOffsets[size].dx)<1e-9)
    assert.ok(Math.abs(dx.dy-old[size].dy)<1e-9)
    assert.ok(Math.abs(dy.dx-old[size].dx)<1e-9)
    assert.ok(Math.abs(dy.dy-sourceOffsets[size].dy)<1e-9)
    const auto=gradeProject(x.project,size).pieces[1].points[1]
    assert.ok(Math.abs(auto.y-baseline[size].y)<1e-9)
  }
})

test('rejects duplicate targets, source target, pinned rules, and stale grading without mutation',()=>{
  const original=fixture(),snapshot=structuredClone(original)
  assert.throws(()=>applyAccuMarkGradeBatch(original,{source,targets:[target,target]}),/duplicate target/)
  assert.throws(()=>applyAccuMarkGradeBatch(original,{source,targets:[source]}),/source cannot/)
  assert.deepEqual(original,snapshot)
  const pinned=fixture();pinned.pieces[1].points[0].namedGradeRuleRef={id:'locked',version:1}
  assert.throws(()=>applyAccuMarkGradeBatch(pinned,{source,targets:[target]}),/pinned named/)
  const stale=fixture();stale.pieces[1].points[0].industrialGradeRule.sizes[0]='XXXS'
  assert.throws(()=>applyAccuMarkGradeBatch(stale,{source,targets:[target]}),/stale size/)
  const malformed=fixture();malformed.grading.sizes[2]='S'
  assert.throws(()=>applyAccuMarkGradeBatch(malformed,{source,targets:[target]}),/ordered grading size/)
  const failAfterOne=fixture();failAfterOne.pieces[1].points[2].namedGradeRuleRef='protected'
  const before=structuredClone(failAfterOne)
  assert.throws(()=>applyAccuMarkGradeBatch(failAfterOne,{source,targets:[target,{pieceId:'back',pointIndex:2}]}),/pinned named/)
  assert.deepEqual(failAfterOne,before)
})
