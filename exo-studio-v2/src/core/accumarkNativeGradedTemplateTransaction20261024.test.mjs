import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {proposeAccuMarkNativeGradedTemplateTransaction20261024 as propose} from './accumarkNativeGradedTemplateTransaction20261024.js'

const box=(x=0)=>({points:[[x,0],[x+.2,0],[x+.2,.3],[x,.3]],edges:['a','b','c','d']})
const fixture=()=>({revision:9,template:{panels:[{id:'front',polygon:box()},{id:'back',polygon:box(.4)}],seams:[{id:'joined',a:{panel:'front',edge:'a',range:[0,1]},b:{panel:'back',edge:'a',range:[0,1]},reverse_b:true,allow_ease:false}],material:{density:200}}})
const create=(s=fixture())=>createAccuMarkNativeRuleSet(s).ruleSet
function edit(s,r,panelId,size,index,dxMm,dyMm){const out=editAccuMarkNativePointRule(s,r,{panelId,pointIndex:index,size,dxMm,dyMm});assert.equal(out.ok,true,out.reason);return out.ruleSet}

test('all six templates and source topology preserved, native import expressly blocked',()=>{
 const s=fixture(),r=create(s),out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,true,out.reason)
 assert.deepEqual(Object.keys(out.templatesBySize),r.sizes)
 assert.equal(out.qa.length,12)
 assert.deepEqual(JSON.parse(JSON.stringify(out.originalNativeTemplate)),s.template)
 assert.deepEqual(JSON.parse(JSON.stringify(out.selectedTemplate.seams)),s.template.seams)
 assert.deepEqual(JSON.parse(JSON.stringify(out.selectedTemplate.material)),s.template.material)
 assert.equal(out.nativeCommitted,false)
 assert.equal(out.manufacturingApproved,false)
 assert.equal(out.nativeImportAvailable,false)
 assert.match(out.nativeImportBlocker,/revision/)
 assert.equal(out.commitEligible,false)
 assert.match(out.commitCondition,/atomic native operation/)
 assert.deepEqual(JSON.parse(JSON.stringify(out.proposedSnapshot.template)),s.template)
 assert.equal(out.proposedSnapshot.state,null)
 assert.equal(out.proposedSnapshot.mesh_signature,null)
})
test('unsown source may persist a six-size geometric proposal while invalid seam metadata fails closed',()=>{
 const bare=fixture();bare.template.seams=[]
 const rules=create(bare)
 const accepted=propose(bare,rules,{selectedSize:'M'})
 assert.equal(accepted.ok,true,accepted.reason)
 assert.equal(accepted.manufacturingApproved,false)
 assert.equal(accepted.nativeCommitted,false)
 assert.deepEqual(accepted.selectedTemplate.seams,[])
 const malformed=fixture();malformed.template.seams={joined:'not a native seam array'}
 const rejected=propose(malformed,create(malformed),{selectedSize:'M'})
 assert.equal(rejected.ok,false)
 assert.match(rejected.reason,/Invalid native sewn seam collection/)
})
test('mm offsets compiled to native metres independently across named sizes',()=>{
 const s=fixture();delete s.template.seams;let r=create(s)
 r=edit(s,r,'front','L',0,15,-5)
 r=edit(s,r,'back','XL',2,20,10)
 const out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,true,out.reason)
 assert.deepEqual(out.selectedTemplate.panels[0].polygon.points[0],[.015,-.005])
 assert(Math.abs(out.templatesBySize.XL.panels[1].polygon.points[2][0]-.62)<1e-12)
 assert.equal(out.templatesBySize.XL.panels[1].polygon.points[2][1],.31)
 assert.deepEqual(JSON.parse(JSON.stringify(out.templatesBySize.M.panels[0].polygon)),box())
 assert.equal(out.provenance.units,'m')
})
test('rule and source remain immutable and proposal cannot mutate originals',()=>{
 const s=fixture(),r=create(s),before=structuredClone(s),beforeRules=structuredClone(r)
 const out=propose(s,r,{selectedSize:'XS'})
 assert.equal(out.ok,true,out.reason)
 out.selectedTemplate.panels[0].polygon.points[0][0]=999
 assert.deepEqual(s,before)
 assert.equal(JSON.stringify(r),JSON.stringify(beforeRules))
})
test('stale source fingerprint is rejected',()=>{
 const s=fixture(),r=create(s)
 s.template.panels[0].polygon.points[0][0]+=.01
 assert.match(propose(s,r,{selectedSize:'L'}).reason,/Stale/)
})
test('graded cubic controls are preserved with bounded sampled boundary validation',()=>{
 const s=fixture();delete s.template.seams;s.template.panels[1].polygon.curves={a:[[.44,-.03],[.56,-.03]]}
 let r=create(s);r=edit(s,r,'back','XS',0,10,0)
 const out=propose(s,r,{selectedSize:'M'})
 assert.equal(out.ok,true,out.reason)
 assert(Math.abs(out.templatesBySize.XS.panels[1].polygon.points[0][0]-.41)<1e-12)
 assert(Math.abs(out.templatesBySize.XS.panels[1].polygon.curves.a[0][0]-(.44+2*.01/3))<1e-12)
 assert(out.qa.some(item=>item.panelId==='back'&&item.cubicBoundarySampled))
 assert.equal(out.nativeCommitted,false)
 assert.equal(out.manufacturingApproved,false)
})
test('free-curve derivatives remain blocked when graded',()=>{
 const s=fixture();delete s.template.seams;s.template.panels[0].polygon.free_curve_points={a:[{t:.5,position:[.1,-.02],derivative:[.2,0]}]}
 let r=create(s);r=edit(s,r,'front','L',0,5,0)
 const out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,false)
 assert.match(out.reason,/free-curve grading/)
 assert.equal(out.manufacturingApproved,false)
})
test('reject crossing curved boundary despite valid vertex polygon',()=>{
 const s=fixture();delete s.template.seams;s.template.panels[0].polygon.curves={a:[[.1,.45],[.1,.45]]}
 const r=create(s),out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,false)
 assert.match(out.reason,/curved boundary|Polygon edges touch/)
 assert.equal(out.nativeCommitted,false)
})
test('curved unchanged panels retain identical cubic controls when other panel changes',()=>{
 const s=fixture();delete s.template.seams;s.template.panels[1].polygon.curves={a:[[.44,-.03],[.56,-.03]]}
 let r=create(s);r=edit(s,r,'front','L',0,5,0)
 const out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,true,out.reason)
 assert.deepEqual(JSON.parse(JSON.stringify(out.selectedTemplate.panels[1].polygon.curves)),s.template.panels[1].polygon.curves)
})
test('reject geometrically reversed and collapsed graded polygons',()=>{
 const s=fixture();let r=create(s)
 r=edit(s,r,'front','XS',1,-200,0)
 assert.equal(propose(s,r,{selectedSize:'L'}).ok,false)
})
test('bad sizes or nonfinite offset fail closed',()=>{
 const s=fixture(),r=create(s)
 assert.equal(propose(s,r,{selectedSize:'NOT-A-SIZE'}).ok,false)
 r.panels.front.pointOffsetsMm.L[0][0]=Infinity
 assert.equal(propose(s,r,{selectedSize:'L'}).ok,false)
})
test('malicious getters, inherited toJSON, symbols and cyclic references are rejected safely',()=>{
 const s=fixture(),r=create(s)
 let invoked=0
 Object.defineProperty(s.template.panels[0],'trap',{enumerable:true,get(){invoked++;throw Error('getter ran')}})
 assert.equal(propose(s,r,{selectedSize:'L'}).ok,false)
 assert.equal(invoked,0)
 const clean=fixture(),original=Object.prototype.toJSON
 Object.prototype.toJSON=function(){invoked++;throw Error('inherited ran')}
 try{assert.match(propose(clean,r,{selectedSize:'L'}).reason,/serialization hooks/);assert.equal(invoked,0)}finally{
  if(original===undefined)delete Object.prototype.toJSON
  else Object.prototype.toJSON=original
 }
 clean.template.panels[0][Symbol('hidden')]=1
 assert.equal(propose(clean,r,{selectedSize:'L'}).ok,false)
 const cyclic=fixture();cyclic.template.circular=cyclic.template
 assert.equal(propose(cyclic,r,{selectedSize:'L'}).ok,false)
})
test('source unknown enumerable fields retained; hidden fields rejected',()=>{
 const s=fixture(),r=create(s)
 s.template.panels[0].productionData={notches:[{station:.2}],grain:'parallel'}
 const out=propose(s,r,{selectedSize:'L'})
 assert.equal(out.ok,true,out.reason)
 assert.deepEqual(JSON.parse(JSON.stringify(out.selectedTemplate.panels[0].productionData)),s.template.panels[0].productionData)
 Object.defineProperty(s.template,'secret',{value:'hidden',enumerable:false})
 assert.equal(propose(s,r,{selectedSize:'L'}).ok,false)
})
test('reject incomplete or permuted six-size proposal contracts',()=>{
 const s=fixture()
 for(const sizes of [['S','M','L'],['S','XS','M','L','XL','XXL']]){
  const created=createAccuMarkNativeRuleSet(s,{sizes,baseSize:'M'})
  assert.equal(created.ok,true,created.reason)
  const out=propose(s,created.ruleSet,{selectedSize:'M'})
  assert.equal(out.ok,false)
  assert.match(out.reason,/ordered XS–XXL/)
 }
})
test('reject malformed sewn range and every-size length mismatch',()=>{
 const s=fixture(),r=create(s)
 s.template.seams[0].a.range=[.3,.3]
 assert.equal(propose(s,r,{selectedSize:'M'}).ok,false)
 s.template.seams[0].a.range=[0,1]
 let modified=edit(s,r,'front','XL',1,18,0)
 const out=propose(s,modified,{selectedSize:'M'})
 assert.equal(out.ok,false)
 assert.match(out.reason,/Sewn seam/)
 assert.equal(out.manufacturingApproved,false)
})
test('unsorted free-curve knots fail even for zero offsets without cubic controls',()=>{
 const s=fixture();delete s.template.seams
 s.template.panels[0].polygon.free_curve_points={a:[{t:.8,position:[.16,0]},{t:.2,position:[.04,0]}]}
 const r=create(s),out=propose(s,r,{selectedSize:'M'})
 assert.equal(out.ok,false)
 assert.match(out.reason,/unsorted or repeated/)
})
