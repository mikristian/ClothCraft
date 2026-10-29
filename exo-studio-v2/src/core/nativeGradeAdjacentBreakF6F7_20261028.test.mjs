import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {setNativeGradeEvolutionTable20261028 as evolve} from './nativeGradeAdjacentBreak20261025.js'

const sizes=['XS','S','M','L','XL','XXL']
const source=()=>({template:{panels:['front','back'].map(id=>({
  id,polygon:{points:[[0,0],[.3,0],[.3,.4],[0,.4]],
    edges:['top','right','bottom','left']},
}))}})
function fixture(){
  const snapshot=source(),seed=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(seed.ok,true,seed.reason)
  return {snapshot,ruleSet:seed.ruleSet}
}
const row=(pointIndex,dx=[4,5,6,7,8],dy=[0,0,0,0,0])=>({
  pointIndex,breaks:dx.map((value,i)=>({
    fromSize:sizes[i],toSize:sizes[i+1],dxMm:value,dyMm:dy[i],
  })),
})
const offsets=(ruleSet,pointIndex)=>sizes.map(size=>
  ruleSet.panels.front.pointOffsetsMm[size][pointIndex])

test('F6/F7 complete unequal evolution tables update two real vertices atomically',()=>{
  const {snapshot,ruleSet}=fixture(),before=structuredClone(ruleSet)
  const result=evolve(snapshot,ruleSet,{panelId:'front',rows:[
    row(1),row(2,[0,1,2,3,4],[0,1,0,1,0]),
  ]})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.changedPointIndices,[1,2])
  assert.deepEqual(offsets(result.ruleSet,1),[
    [-9,0],[-5,0],[0,0],[6,0],[13,0],[21,0],
  ])
  assert.deepEqual(offsets(result.ruleSet,2),[
    [-1,-1],[-1,-1],[0,0],[2,0],[5,1],[9,1],
  ])
  assert.equal(JSON.stringify(result.ruleSet.panels.back),JSON.stringify(ruleSet.panels.back))
  assert.deepEqual(result.ruleSet.panels.front.pointOffsetsMm.M,
    ruleSet.panels.front.pointOffsetsMm.M)
  assert.equal(JSON.stringify(ruleSet),JSON.stringify(before),'Input draft was mutated')
  assert.equal(result.witness.length,2)
  assert.equal(result.nativeCommitted,false)
  assert.equal(result.manufacturingApproved,false)
  const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,result.ruleSet)
  assert.equal(compiled.ok,true,compiled.reason)
  assert.equal(Object.keys(compiled.byPanel.front.sizeRun).length,6)
})

test('all five adjacent breaks are exactly recovered from authored six-size offsets',()=>{
  const {snapshot,ruleSet}=fixture()
  const desired=row(1,[2,-3,5,-4,7],[1,2,-2,3,-1])
  const result=evolve(snapshot,ruleSet,{panelId:'front',rows:[desired]})
  assert.equal(result.ok,true,result.reason)
  const actual=offsets(result.ruleSet,1)
  for(let i=0;i<5;i++){
    assert.equal(actual[i+1][0]-actual[i][0],desired.breaks[i].dxMm)
    assert.equal(actual[i+1][1]-actual[i][1],desired.breaks[i].dyMm)
  }
  assert.deepEqual(actual[2],[0,0],'Base anchor moved')
  assert.deepEqual(result.witness[0].oldOffsetsMm,sizes.map(()=>[0,0]))
})

test('partial, duplicate, reordered, nonfinite, wrong-unit and overflow inputs fail closed',()=>{
  const {snapshot,ruleSet}=fixture(),before=structuredClone(ruleSet)
  const valid=row(1)
  const bad=[
    [],[valid,valid],
    [{...valid,pointIndex:999}],
    [{...valid,breaks:valid.breaks.slice(1)}],
    [{...valid,breaks:[valid.breaks[1],valid.breaks[0],...valid.breaks.slice(2)]}],
    [{...valid,breaks:valid.breaks.map((v,i)=>i===2?{...v,fromSize:'MISMATCH'}:v)}],
    [{...valid,breaks:valid.breaks.map((v,i)=>i===2?{...v,dxMm:Infinity}:v)}],
    [{...valid,breaks:valid.breaks.map((v,i)=>i===2?{...v,dxMm:'5'}:v)}],
    [row(1,[0,0,1e6,1e6,1e6])],
  ]
  for(const rows of bad){
    const result=evolve(snapshot,ruleSet,{panelId:'front',rows})
    assert.equal(result.ok,false,JSON.stringify(rows))
    assert.equal(result.nativeCommitted,false)
  }
  assert.equal(JSON.stringify(ruleSet),JSON.stringify(before))
})

test('stale source, unvalidated custom sizes and physically collapsed XXL fail atomically',()=>{
  const {snapshot,ruleSet}=fixture(),before=structuredClone(ruleSet)
  const stale=structuredClone(snapshot)
  stale.template.panels[0].polygon.points[0][0]=.001
  assert.equal(evolve(stale,ruleSet,{panelId:'front',rows:[row(1)]}).ok,false)
  assert.equal(evolve(snapshot,ruleSet,{panelId:'front',
    rows:[row(1,[0,0,-300,0,0])]}).ok,false)
  const custom=createAccuMarkNativeRuleSet(snapshot,{sizes:['A','B','C'],baseSize:'B'})
  assert.equal(custom.ok,true,custom.reason)
  assert.match(evolve(snapshot,custom.ruleSet,{panelId:'front',
    rows:[row(1)]}).reason,/XS–XXL/)
  assert.equal(JSON.stringify(ruleSet),JSON.stringify(before))
})
