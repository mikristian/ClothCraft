import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'

const fixture=()=>({template:{panels:[
  {id:'FRONT',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}},
  {id:'BACK',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
    curves:{a:[[.04,-.05],[.16,-.05]]},
    free_curve_points:{b:[{t:.5,position:[.23,.15],derivative:[0,.2]}]}}}
]}})
const updated=(snap,ruleSet,edits)=>edits.reduce((set,args)=>{
  const result=editAccuMarkNativePointRule(snap,set,args)
  assert.equal(result.ok,true,result.reason)
  return result.ruleSet
},ruleSet)

test('two panels and six sizes; non-affine independent vertex change, immutable and base untouched',()=>{
  const snap=fixture(),before=structuredClone(snap)
  const made=createAccuMarkNativeRuleSet(snap)
  assert.equal(made.ok,true,made.reason)
  const initial=structuredClone(made.ruleSet)
  const rules=updated(snap,made.ruleSet,[
    {panelId:'FRONT',pointIndex:0,size:'L',dxMm:14,dyMm:-5},
    {panelId:'FRONT',pointIndex:2,size:'XL',dxMm:30,dyMm:0},
    {panelId:'BACK',pointIndex:1,size:'L',dxMm:8,dyMm:3},
  ])
  const result=compileAccuMarkNativeRuleSizeRun(snap,rules,{selectedSize:'L'})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.byPanel.FRONT.sizes,['XS','S','M','L','XL','XXL'])
  assert.deepEqual(result.byPanel.FRONT.sizeRun.M.polygon,snap.template.panels[0].polygon)
  assert.deepEqual(result.byPanel.FRONT.sizeRun.L.polygon.points[0],[.014,-.005])
  assert.deepEqual(result.byPanel.FRONT.sizeRun.L.polygon.points[2],[.2,.3])
  assert.deepEqual(result.byPanel.FRONT.sizeRun.XL.polygon.points[2],[.23,.3])
  assert(Math.abs(result.byPanel.BACK.sizeRun.L.polygon.points[1][0]-.208)<1e-12)
  assert(Math.abs(result.byPanel.BACK.sizeRun.L.polygon.points[1][1]-.003)<1e-12)
  assert.equal(result.byPanel.BACK.accuracy,'approximate')
  assert(Math.abs(result.byPanel.BACK.sizeRun.L.polygon.curves.a[1][0]-(.16+.008*2/3))<1e-12)
  assert(Math.abs(result.byPanel.BACK.sizeRun.L.polygon.curves.a[1][1]-(-.05+.003*2/3))<1e-12)
  const knot=result.byPanel.BACK.sizeRun.L.polygon.free_curve_points.b[0]
  assert(Math.abs(knot.position[0]-.234)<1e-12)
  assert(Math.abs(knot.position[1]-.1515)<1e-12)
  assert(Math.abs(knot.derivative[0]+.008)<1e-12)
  assert(Math.abs(knot.derivative[1]-.197)<1e-12)
  assert.deepEqual(snap,before)
  assert.equal(JSON.stringify(made.ruleSet),JSON.stringify(initial))
})

test('reject invalid size, stale geometry and ids, invalid offsets and holes',()=>{
  const snap=fixture(),rules=createAccuMarkNativeRuleSet(snap).ruleSet
  const base={panelId:'FRONT',pointIndex:0,size:'L',dxMm:1,dyMm:2}
  assert.match(editAccuMarkNativePointRule(snap,rules,{...base,size:'M'}).reason,/non-base/)
  assert.equal(editAccuMarkNativePointRule(snap,rules,{...base,pointIndex:99}).ok,false)
  assert.equal(editAccuMarkNativePointRule(snap,rules,{...base,dxMm:Infinity}).ok,false)
  assert.equal(editAccuMarkNativePointRule(snap,rules,{...base,size:'7XL'}).ok,false)
  assert.equal(editAccuMarkNativePointRule(snap,rules,{...base,maintainGrowths:true}).ok,false)
  snap.template.panels[0].polygon.points[0][0]=.01
  assert.match(compileAccuMarkNativeRuleSizeRun(snap,rules).reason,/Stale/)
  snap.template.panels[0].polygon.points[0][0]=0
  snap.template.panels[0].id='FRONT_NEW'
  assert.equal(compileAccuMarkNativeRuleSizeRun(snap,rules).ok,false)
  snap.template.panels[0].id='FRONT'
  snap.template.panels[0].polygon.holes=[{}]
  assert.equal(createAccuMarkNativeRuleSet(snap).ok,false)
})
