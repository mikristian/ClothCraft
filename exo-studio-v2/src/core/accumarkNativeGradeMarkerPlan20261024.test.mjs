import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {planAccuMarkNativeGradeMarker20261024 as plan} from './accumarkNativeGradeMarkerPlan20261024.js'

const panel=(id,x=0)=>({id,name:id,fabric:'main',grain_degrees:0,polygon:{
 points:[[x,0],[x+.04,0],[x+.04,.04],[x,.04]],edges:['a','b','c','d'],
 seam_allowances:{a:0,b:0,c:0,d:0}}})
const source=()=>({revision:12,template:{name:'Prototype',panels:[panel('front'),panel('back')],seams:[]}})
const setup=()=>{const snap=source();const rule=createAccuMarkNativeRuleSet(snap);assert.equal(rule.ok,true);return {snap,rules:rule.ruleSet}}
const options=()=>({selectedSize:'L',fabricWidthCm:10,gapCm:1,maxLengthCm:30,plyCount:4,
 cutQuantities:{front:1,back:1},nap:'one-way',rolls:[{rollId:'R1',usableLengthCm:100}]})

test('native metres become centimetre CUT polygons, entire two panel inventory, rolls and source provenance',()=>{
 const {snap,rules}=setup(),opts=options(),unchanged=JSON.stringify([snap,rules,opts])
 const graded=editAccuMarkNativePointRule(snap,rules,{panelId:'front',pointIndex:1,size:'L',dxMm:10,dyMm:0})
 assert.equal(graded.ok,true)
 const result=plan(snap,graded.ruleSet,opts)
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.equal(result.project.pieces[0].points[1].x,5)
 assert.equal(result.marker.placements.length,2)
 assert.equal(result.rollPlan.after.feasible,true)
 assert.equal(result.sourceRevision,12)
 assert.match(result.sourceFingerprint,/^fnv1a32:/)
 assert.equal(result.factoryApproved,false)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(JSON.stringify([snap,rules,opts]),unchanged)
})
test('all instances and physical fabric bounds must fit',()=>{
 const {snap,rules}=setup()
 assert.equal(plan(snap,rules,{...options(),cutQuantities:{front:2,back:1}}).marker.placements.length,3)
 assert.equal(plan(snap,rules,{...options(),fabricWidthCm:3}).code,'NEST_INCOMPLETE')
})
test('reject missing and nonzero source seam allowances; no stitched geometry confused with CUT',()=>{
 const {snap,rules}=setup()
 delete snap.template.panels[0].polygon.seam_allowances.a
 assert.equal(plan(snap,rules,options()).code,'PHYSICAL_CUTLINE_PROOF_REQUIRED')
 snap.template.panels[0].polygon.seam_allowances.a=.01
 assert.equal(plan(snap,rules,options()).code,'PHYSICAL_CUTLINE_PROOF_REQUIRED')
})
test('sewn relationships demand size-specific cut and seam proof',()=>{
 const {snap,rules}=setup()
 snap.template.seams.push({id:'sew',a:{panel:'front',edge:'a'},b:{panel:'back',edge:'a'}})
 assert.equal(plan(snap,rules,options()).code,'SEWN_CUTLINE_PROOF_REQUIRED')
})
test('curves, holes, folds, marks and motif requirements reject physical cutting',()=>{
 for(const mutate of [p=>p.polygon.curves={a:[[0,0],[.01,.01]]},
  p=>p.polygon.holes=[[[.01,.01],[.02,.01],[.01,.02]]],
  p=>p.cut_on_fold=true,p=>p.polygon.notches={a:[{t:.3}]},
  p=>p.marker={motif:'stripe'},p=>p.polygon.lines=[{}]]){
  const {snap,rules}=setup();mutate(snap.template.panels[0])
  assert.equal(plan(snap,rules,options()).code,'UNSUPPORTED_CUT_SEMANTICS')
 }
})
test('reject missing grain, fabric, sizes and incomplete quantity inventory',()=>{
 const {snap,rules}=setup()
 snap.template.panels[0].grain_degrees=undefined
 assert.equal(plan(snap,rules,options()).code,'INVALID_NATIVE_PANEL')
 const healthy=setup()
 assert.equal(plan(healthy.snap,healthy.rules,{...options(),cutQuantities:{front:1}}).code,'MISSING_PANEL_QUANTITIES')
 assert.equal(plan(healthy.snap,healthy.rules,{...options(),selectedSize:'7XL'}).code,'INVALID_SOURCE_OR_LIMITS')
 healthy.snap.template.panels[0].fabric='other'
 assert.equal(plan(healthy.snap,healthy.rules,options()).code,'MULTI_FABRIC_REQUIRES_SEPARATE_PLANS')
})
test('stale grading fingerprint and negative grade geometry refuse',()=>{
 const {snap,rules}=setup()
 snap.template.panels[0].polygon.points[0][0]=.01
 assert.equal(plan(snap,rules,options()).code,'GRADE_RULES_REFUSED')
 const healthy=setup(),bad=editAccuMarkNativePointRule(healthy.snap,healthy.rules,
  {panelId:'front',pointIndex:1,size:'L',dxMm:-40,dyMm:0})
 assert.equal(bad.ok,true)
 assert.equal(plan(healthy.snap,bad.ruleSet,options()).code,'UNVERIFIED_GRADED_CUT')
})
test('source fingerprint varies with revision, quantity and point rules',()=>{
 const {snap,rules}=setup(),a=plan(snap,rules,options())
 assert.equal(a.ok,true)
 const b=plan({...snap,revision:13},rules,options())
 assert.equal(b.ok,true)
 assert.notEqual(a.sourceFingerprint,b.sourceFingerprint)
 const c=plan(snap,rules,{...options(),cutQuantities:{front:2,back:1}})
 assert.equal(c.ok,true)
 assert.notEqual(a.sourceFingerprint,c.sourceFingerprint)
})
test('getter, hidden metadata, inherited toJSON, cycles and sparse arrays cannot execute or vanish silently',()=>{
 let calls=0
 const {snap,rules}=setup()
 Object.defineProperty(snap.template.panels[0],'fabric',{get(){calls++;throw Error('bad')}})
 assert.equal(plan(snap,rules,options()).code,'SOURCE_REFUSED');assert.equal(calls,0)
 const secret=setup()
 Object.defineProperty(secret.snap.template.panels[0],'covert',{value:'mark',enumerable:false})
 assert.equal(plan(secret.snap,secret.rules,options()).code,'SOURCE_REFUSED')
 const original=Object.prototype.toJSON
 try{
  Object.prototype.toJSON=function(){calls++;throw Error('inherited called')}
  const cleanSnap=source()
  assert.equal(plan(cleanSnap,rules,options()).code,'UNSAFE_JSON_RUNTIME')
  assert.equal(calls,0)
 }finally{if(original===undefined)delete Object.prototype.toJSON;else Object.prototype.toJSON=original}
 const cyclic=setup();cyclic.snap.loop=cyclic.snap
 assert.equal(plan(cyclic.snap,cyclic.rules,options()).code,'SOURCE_REFUSED')
 const sparse=setup();delete sparse.snap.template.panels[0].polygon.points[1]
 assert.equal(plan(sparse.snap,sparse.rules,options()).code,'SOURCE_REFUSED')
})
test('infeasible roll inventory refuses marker success even when geometry fits',()=>{
 const {snap,rules}=setup()
 const result=plan(snap,rules,{...options(),plyCount:100,rolls:[{rollId:'S',usableLengthCm:2}]})
 assert.equal(result.ok,false,JSON.stringify(result))
 assert.equal(result.code,'ROLL_STOCK_INSUFFICIENT')
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.marker,undefined)
})
