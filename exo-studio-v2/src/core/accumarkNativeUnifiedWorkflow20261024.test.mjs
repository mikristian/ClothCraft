import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {proposeAccuMarkNativeGradedTemplateTransaction20261024 as transaction} from './accumarkNativeGradedTemplateTransaction20261024.js'
import {planAccuMarkNativeGradeMarker20261024 as markerPlan} from './accumarkNativeGradeMarkerPlan20261024.js'
import {buildAccuMarkNativeCutProofAama20261024 as cutExchange} from './accumarkNativeCutProofAama20261024.mjs'
import {parseSeamlyAamaManufacturingSemantics as receive} from './seamlyAamaManufacturingSemantics20261023.mjs'

const panel=(id,x)=>({id,name:id,fabric:'main',grain_degrees:0,
 polygon:{points:[[x,0],[x+.04,0],[x+.04,.04],[x,.04]],edges:['a','b','c','d'],
  seam_allowances:{a:0,b:0,c:0,d:0}}})
const native=()=>({revision:58,template:{name:'Native authored',panels:[panel('front',0),panel('back',.1)],seams:[]}})
const proof=()=>({format:'exo-native-cutline-proof.v1',revision:58,units:'mm',factoryApproved:false,
 blockedCount:0,generatedCount:2,panels:[
  {panelId:'front',ok:true,pointsMm:[[0,0],[40,0],[40,40],[0,40]]},
  {panelId:'back',ok:true,pointsMm:[[100,0],[140,0],[140,40],[100,40]]},
 ]})
test('one authoritative source snapshot -> all-size native proposal + physical selected grade nest and roll + independent Rust BASE CUT geometry exchange',()=>{
 const source=native(),original=structuredClone(source)
 const created=createAccuMarkNativeRuleSet(source)
 assert.equal(created.ok,true,created.reason)
 const edited=editAccuMarkNativePointRule(source,created.ruleSet,{
  panelId:'front',pointIndex:1,size:'L',dxMm:8,dyMm:0})
 assert.equal(edited.ok,true,edited.reason)
 const proposals=transaction(source,edited.ruleSet,{selectedSize:'L'})
 assert.equal(proposals.ok,true,proposals.reason)
 assert.equal(proposals.qa.length,source.template.panels.length*edited.ruleSet.sizes.length)
 assert.equal(proposals.selectedTemplate.panels[0].polygon.points[1][0],.048)
 assert.equal(proposals.nativeCommitted,false)
 assert.equal(proposals.commitEligible,false)
 assert.match(proposals.nativeImportBlocker,/revision/)
 const study=markerPlan(source,edited.ruleSet,{
  selectedSize:'L',fabricWidthCm:12,gapCm:.5,maxLengthCm:40,maxEvaluations:50,
  plyCount:8,rolls:[{rollId:'R1',usableLengthCm:100}],nap:'one-way',
  cutQuantities:{front:1,back:1}})
 assert.equal(study.ok,true,study.detail||study.code)
 assert.equal(study.project.pieces.length,2)
 assert.equal(study.project.pieces[0].points[1].x,4.8)
 assert.equal(study.rollPlan.after.feasible,true)
 assert.equal(study.factoryApproved,false)
 // Current Rust CUT proof is always for the BASE live garment, never a
 // fictional production proof for the independent L grade study above.
 const dxf=cutExchange(source,proof(),{size:'CURRENT'})
 assert.equal(dxf.ok,true,dxf.detail)
 assert.equal(dxf.sourceRevision,source.revision)
 assert.equal(dxf.size,'CURRENT')
 const independent=receive(dxf.dxf,{unit:'mm'})
 assert.equal(independent.pieces.length,2)
 assert.equal(independent.pieces[0].cutOutlineMm.points[1].x,40)
 assert.equal(dxf.gradeRulesTransferred,false)
 assert.equal(dxf.manufacturingApproved,false)
 assert.deepEqual(source,original)
})
test('a Rust physical proof is revision-bound; changing original native source blocks its CAD exchange',()=>{
 const source=native(),cut=proof()
 source.revision=59
 const refused=cutExchange(source,cut,{size:'CURRENT'})
 assert.equal(refused.ok,false)
 assert.equal(refused.manufacturingApproved,false)
})
test('grading source and manufacturing CUT proof must not be confused for sewn garments',()=>{
 const source=native(),ruleSet=createAccuMarkNativeRuleSet(source).ruleSet
 source.template.seams=[{id:'sewn',a:{panel:'front',edge:'a'},b:{panel:'back',edge:'a'}}]
 const results=markerPlan(source,ruleSet,{
  selectedSize:'L',fabricWidthCm:12,gapCm:.5,maxLengthCm:40,nap:'one-way',
  plyCount:5,rolls:[{rollId:'R1',usableLengthCm:100}],
  cutQuantities:{front:1,back:1}})
 assert.equal(results.ok,false)
 assert.equal(cutExchange(source,proof()).ok,false)
})
