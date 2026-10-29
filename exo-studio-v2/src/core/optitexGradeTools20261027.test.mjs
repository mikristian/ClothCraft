import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {applyOptitexGradeTool20261027 as apply,OPTITEX_GRADE_TOOL_IDS_20261027 as ids} from './optitexGradeTools20261027.js'

const fixture=()=>({template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges:['a','b','c','d']}}]}})
const make=()=>{const snapshot=fixture(),ruleSet=createAccuMarkNativeRuleSet(snapshot).ruleSet;return {snapshot,ruleSet,panelId:'front',pointIndex:1}}
const run=(args,toolId,extra={})=>apply({...args,toolId,...extra})
const point=(r,sz,i=1)=>r.ruleSet.panels.front.pointOffsetsMm[sz][i]

test('24 precisely named tools; all six sizes and atomic original rules',()=>{
 assert.equal(ids.length,24)
 assert.equal(new Set(ids).size,24)
 for(const exact of ['set-grading-tool','paste-x-grading','paste-y-grading','paste-relatively','paste-dd-grading','show-from-base-size','grade-proportionally','move-size-by-rectangle','align-size-by-line'])assert(ids.includes(exact),exact)
 const args=make(),before=structuredClone(args.ruleSet)
 const result=run(args,'set-grading',{amountMm:5,axis:'x'})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(point(result,'XS'),[-10,0])
 assert.deepEqual(point(result,'S'),[-5,0])
 assert.deepEqual(point(result,'M'),[0,0])
 assert.deepEqual(point(result,'XXL'),[15,0])
 assert.equal(JSON.stringify(args.ruleSet),JSON.stringify(before))
 assert.equal(compileAccuMarkNativeRuleSizeRun(args.snapshot,result.ruleSet,{selectedSize:'XXL'}).ok,true)
})

test('selection and view tools do not mutate sidecar',()=>{
 const a=make()
 assert.equal(run(a,'next-point').selectedPointIndex,2)
 assert.equal(run(a,'prev-point').selectedPointIndex,0)
 assert.equal(run(a,'show-base').view.size,'M')
 assert.equal(run(a,'show-from-base-size').view.size,'M')
 const original=JSON.stringify(a.ruleSet)
 const stacked=run(a,'stack-point',{referencePointIndex:999})
 assert.equal(stacked.ok,true,stacked.reason)
 assert.deepEqual(stacked.view,{stackPointIndex:1})
 assert.equal('ruleSet' in stacked,false)
 assert.equal('ruleSet' in run(a,'show-from-base-size'),false)
 assert.equal(JSON.stringify(a.ruleSet),original)
 assert.equal(run(a,'copy-grading').clipboard.schema,'exo.grade-clipboard.v1')
 assert.equal(run(a,'grade-notch').handoff.requiresNativeNotchLink,true)
})

test('clipboard family sets, merges axes, adds relative and DD reference',()=>{
 const a=make()
 let current=run(a,'set-grading',{amountMm:3,axis:'y'}).ruleSet
 const clipboard=run({...a,ruleSet:current},'copy-grading').clipboard
 for(const toolId of ['paste-grading','paste-x','paste-y','paste-relative','paste-dd']){
  const result=run({...a,ruleSet:current},toolId,{clipboard,targetPointIndex:2,referencePointIndex:1})
  assert.equal(result.ok,true,toolId+': '+result.reason)
  assert.equal(point(result,'L',2)[1],toolId==='paste-dd'?6:toolId==='paste-x'?0:3)
  assert.deepEqual(point(result,'M',2),[0,0])
 }
})

test('set grading and single size motion support true angle',()=>{
 const a=make()
 const graded=run(a,'set-grading',{amountMm:10,angleDeg:90}).ruleSet
 assert(Math.abs(graded.panels.front.pointOffsetsMm.L[1][1]-10)<1e-9)
 const moved=run({...a,ruleSet:graded},'move-point-size',{size:'L',amountMm:4,axis:'x'})
 assert.equal(moved.ok,true,moved.reason)
 assert(Math.abs(point(moved,'L')[0]-4)<1e-9)
 assert.deepEqual(point(moved,'XL'),graded.panels.front.pointOffsetsMm.XL[1])
})

test('clear, stacking and transform tools stay within native preview',()=>{
 const a=make(),initial=run(a,'set-grading',{amountMm:10,axis:'x'}).ruleSet
 for(const toolId of ['clear-grading','angle','grade-proportionally','move-size-proportional']){
  const r=run({...a,ruleSet:initial},toolId,{angleDeg:90,amountMm:2})
  assert.equal(r.ok,true,toolId+': '+r.reason)
  assert.deepEqual(point(r,'M'),[0,0])
 }
 assert.equal(run({...a,ruleSet:initial},'stack-point').ruleSet,undefined)
})

test('direction and rectangle tools apply signed steps on selected geometry',()=>{
 const a=make()
 for(const toolId of ['move-size-along','move-size-parallel']){
  const r=run(a,toolId,{sourcePointIndex:0,referencePointIndex:1,amountMm:6})
  assert.equal(r.ok,true,toolId+': '+r.reason)
  assert.deepEqual(point(r,'L'),toolId==='move-size-along'?[6,0]:[0,6])
 }
 const rect=run(a,'move-size-rectangle',{rectangle:{minX:190,maxX:210,minY:-10,maxY:210},amountMm:4,axis:'x'})
 assert.equal(rect.ok,true,rect.reason)
 assert.deepEqual(point(rect,'L',1),[4,0])
 assert.deepEqual(point(rect,'L',2),[4,0])
 assert.deepEqual(point(rect,'L',0),[0,0])
 const toolbar=run(a,'move-size-by-rectangle',{rectangle:{xMm:190,yMm:-10,widthMm:20,heightMm:220},amountMm:4,axis:'x'})
 assert.equal(toolbar.ok,true,toolbar.reason)
 assert.deepEqual(point(toolbar,'L',1),point(rect,'L',1))
 assert.deepEqual(point(toolbar,'L',2),point(rect,'L',2))
})

test('four align modes are implemented with group operations',()=>{
 const a=make(),shifted=run(a,'move-size-rectangle',{rectangle:{minX:190,maxX:210,minY:-10,maxY:10},amountMm:8,axis:'y'}).ruleSet
 for(const toolId of ['align-points-size','align-vertical-size','align-horizontal-size','align-size-by-line']){
  const result=run({...a,ruleSet:shifted},toolId,{pointIndices:[1,2],sourcePointIndex:0,referencePointIndex:1})
  assert.equal(typeof result.ok,'boolean',toolId)
  if(result.ok)assert.deepEqual(point(result,'M',2),[0,0])
  else {
   assert.match(result.reason,/geometry QA/)
   assert.equal('ruleSet' in result,false)
  }
 }
})

test('failed requests cannot mutate originals; invalid clipboard, coordinates, source and size are rejected',()=>{
 const a=make(),original=structuredClone(a.ruleSet)
 const bad=[
  ['unknown',{}],['set-grading',{amountMm:Infinity}],
  ['paste-grading',{clipboard:{schema:'exo.grade-clipboard.v1'}}],
  ['move-point-size',{size:'M',amountMm:4}],
  ['move-size-along',{sourcePointIndex:0,referencePointIndex:0,amountMm:5}],
  ['move-size-rectangle',{rectangle:{minX:4,minY:4,maxX:1,maxY:1},amountMm:4}],
  ['move-size-by-rectangle',{rectangle:{xMm:0,yMm:0,widthMm:-3,heightMm:12},amountMm:4}],
  ['move-size-by-rectangle',{rectangle:{xMm:1000000,yMm:0,widthMm:1,heightMm:12},amountMm:4}],
  ['align-points-size',{pointIndices:[1,1]}],
  ['set-grading',{amountMm:1e7,axis:'x'}],
 ]
 for(const [toolId,opts] of bad){const r=run(a,toolId,opts);assert.equal(r.ok,false,toolId);assert.equal('ruleSet' in r,false)}
 assert.equal(JSON.stringify(a.ruleSet),JSON.stringify(original))
 const stale=structuredClone(a.snapshot)
 stale.template.panels[0].polygon.points[0][0]=0.01
 assert.equal(run({...a,snapshot:stale},'copy-grading').ok,false)
})

test('every canonical grading ID executes with valid fixture input or rejects an explicit precondition',()=>{
 const a=make()
 const prepared=run(a,'set-grading-tool',{axis:'x',amountMm:4})
 assert.equal(prepared.ok,true,prepared.reason)
 const clipboard=run({...a,ruleSet:prepared.ruleSet},'copy-grading').clipboard
 const inputs={
  'prev-point':{},'next-point':{},'copy-grading':{},
  'paste-grading':{clipboard,targetPointIndex:2},
  'set-grading-tool':{axis:'x',amountMm:4},
  'paste-x-grading':{clipboard,targetPointIndex:2},
  'paste-y-grading':{clipboard,targetPointIndex:2},
  'paste-relatively':{clipboard,targetPointIndex:2},
  'paste-dd-grading':{clipboard,targetPointIndex:2,referencePointIndex:1},
  'angle':{angleDeg:90},
  'show-from-base-size':{},
  'grade-proportionally':{amountMm:2},
  'clear-grading':{},'stack-point':{},
  'move-point-size':{size:'L',axis:'x',amountMm:3},
  'move-size-along':{sourcePointIndex:0,referencePointIndex:1,amountMm:3},
  'move-size-proportional':{amountMm:2},
  'move-size-parallel':{sourcePointIndex:0,referencePointIndex:1,amountMm:3},
  'move-size-by-rectangle':{axis:'x',amountMm:3,rectangle:{xMm:190,yMm:-10,widthMm:20,heightMm:220}},
  'align-points-size':{pointIndices:[1,2]},
  'align-vertical-size':{pointIndices:[1,2]},
  'align-horizontal-size':{pointIndices:[1,2]},
  'align-size-by-line':{pointIndices:[1,2],sourcePointIndex:0,referencePointIndex:1},
  'grade-notch':{},
 }
 assert.deepEqual(Object.keys(inputs).sort(),[...ids].sort(),'Every canonical tool has its own executable test case')
 for(const toolId of ids){
  const before=JSON.stringify(prepared.ruleSet)
  const result=run({...a,ruleSet:prepared.ruleSet},toolId,inputs[toolId])
  if(!result.ok){
   assert(['align-size-by-line','align-horizontal-size','align-vertical-size'].includes(toolId),`${toolId} unexpectedly rejected: ${result.reason}`)
   assert.match(result.reason,/geometry QA/)
   assert.equal('ruleSet' in result,false)
  }
  assert.equal(JSON.stringify(prepared.ruleSet),before,`${toolId} changed the input sidecar`)
  assert.equal(result.nativeCommitted,false,`${toolId} claimed native persistence`)
  assert.equal(result.manufacturingApproved,false,`${toolId} claimed manufacturing approval`)
  if(result.ruleSet){
   assert.equal(compileAccuMarkNativeRuleSizeRun(a.snapshot,result.ruleSet,{selectedSize:'XXL'}).ok,true,`${toolId} invalid size run`)
   assert.deepEqual(result.ruleSet.panels.front.pointOffsetsMm.M,prepared.ruleSet.panels.front.pointOffsetsMm.M,`${toolId} changed base size`)
  }else assert(!result.ok||['prev-point','next-point','copy-grading','show-from-base-size','stack-point','grade-notch'].includes(toolId),`${toolId} returned neither mutation nor intentional view/copy/handoff`)
 }
})

test('repeat view operations are idempotent and preserve the complete source and base geometry',()=>{
 const a=make(),prepared=run(a,'set-grading-tool',{axis:'x',amountMm:8}).ruleSet
 const beforeSource=JSON.stringify(a.snapshot),beforeRules=JSON.stringify(prepared)
 const viewIds=['prev-point','next-point','show-from-base-size','stack-point','copy-grading','grade-notch']
 for(const toolId of viewIds){
  const args={...a,ruleSet:prepared}
  const first=run(args,toolId),second=run(args,toolId)
  assert.equal(first.ok,true,`${toolId} first: ${first.reason}`)
  assert.deepEqual(second,first,`${toolId} repeated output changed`)
  assert.equal('ruleSet' in first,false,`${toolId} returned mutable rules`)
  assert.equal(JSON.stringify(prepared),beforeRules,`${toolId} changed rules`)
 }
 assert.equal(JSON.stringify(a.snapshot),beforeSource,'Source geometry changed')
 const compiled=compileAccuMarkNativeRuleSizeRun(a.snapshot,prepared,{selectedSize:'M'})
 assert.equal(compiled.ok,true,compiled.reason)
 assert.deepEqual(compiled.byPanel.front.sizeRun.M.polygon,a.snapshot.template.panels[0].polygon,'Base polygon identity changed')
 for(const offsets of prepared.panels.front.pointOffsetsMm.M)assert.deepEqual(offsets,[0,0],'Every base vertex offset must remain zero')
})

test('clear and zero-angle operations are idempotent across all six sizes',()=>{
 const a=make(),seed=run(a,'set-grading-tool',{axis:'x',amountMm:5}).ruleSet
 const once=run({...a,ruleSet:seed},'clear-grading')
 assert.equal(once.ok,true,once.reason)
 const twice=run({...a,ruleSet:once.ruleSet},'clear-grading')
 assert.equal(twice.ok,true,twice.reason)
 assert.equal(JSON.stringify(twice.ruleSet),JSON.stringify(once.ruleSet))
 const firstAngle=run({...a,ruleSet:seed},'angle',{angleDeg:0})
 const secondAngle=run({...a,ruleSet:firstAngle.ruleSet},'angle',{angleDeg:0})
 assert.equal(firstAngle.ok,true,firstAngle.reason)
 assert.equal(secondAngle.ok,true,secondAngle.reason)
 assert.equal(JSON.stringify(firstAngle.ruleSet),JSON.stringify(seed))
 assert.equal(JSON.stringify(secondAngle.ruleSet),JSON.stringify(firstAngle.ruleSet))
})

test('group alignment remains stable on repeated application and preserves the base',()=>{
 const a=make(),seed=run(a,'set-grading-tool',{axis:'y',amountMm:5}).ruleSet
 for(const id of ['align-points-size','align-vertical-size','align-horizontal-size','align-size-by-line']){
  const opts={pointIndices:[1,2],sourcePointIndex:0,referencePointIndex:1}
  const first=run({...a,ruleSet:seed},id,opts)
  const second=run({...a,ruleSet:first.ruleSet??seed},id,opts)
  if(!first.ok){
   assert.match(first.reason,/geometry QA/,`${id}: ${first.reason}`)
   assert.deepEqual(second,first)
   continue
  }
  assert.equal(second.ok,true,`${id}: ${second.reason}`)
  for(const size of seed.sizes){
   const one=first.ruleSet.panels.front.pointOffsetsMm[size]
   const two=second.ruleSet.panels.front.pointOffsetsMm[size]
   for(let i=0;i<one.length;i++)for(let axis=0;axis<2;axis++)
    assert(Math.abs(one[i][axis]-two[i][axis])<1e-8,`${id} ${size} point ${i} axis ${axis} drifted`)
  }
  assert.deepEqual(first.ruleSet.panels.front.pointOffsetsMm.M,seed.panels.front.pointOffsetsMm.M)
 }
})

test('invalid finite targets and out-of-bounds indices reject atomically',()=>{
 const a=make(),before=JSON.stringify(a.ruleSet)
 for(const targetPointIndex of [-1,4,0.5,NaN,Infinity,-Infinity,'1',null]){
  const result=run(a,'paste-grading',{targetPointIndex,clipboard:run(a,'copy-grading').clipboard})
  assert.equal(result.ok,false,`Invalid target ${String(targetPointIndex)} was accepted`)
  assert.match(result.reason,/Target point index/)
  assert.equal('ruleSet' in result,false)
 }
 for(const value of [NaN,Infinity,-Infinity,1000001]){
  const r=run(a,'set-grading-tool',{axis:'x',amountMm:value})
  assert.equal(r.ok,false,`Unsafe amount ${String(value)} accepted`)
 }
 assert.equal(JSON.stringify(a.ruleSet),before)
})

test('align-points-size copies anchor growth vectors without collapsing distinct source vertices',()=>{
 const a=make()
 const seed=run(a,'set-grading-tool',{axis:'x',amountMm:7})
 assert.equal(seed.ok,true,seed.reason)
 const aligned=run({...a,ruleSet:seed.ruleSet},'align-points-size',{pointIndices:[1,2]})
 assert.equal(aligned.ok,true,aligned.reason)
 for(const size of a.ruleSet.sizes){
  assert.deepEqual(point(aligned,size,2),point(aligned,size,1),`Unequal growth vectors in ${size}`)
  const compiled=compileAccuMarkNativeRuleSizeRun(a.snapshot,aligned.ruleSet,{selectedSize:size})
  assert.equal(compiled.ok,true,compiled.reason)
  const polygon=compiled.byPanel.front.sizeRun[size].polygon.points
  assert(Math.hypot(polygon[1][0]-polygon[2][0],polygon[1][1]-polygon[2][1])>.1,`${size} adjacent vertices collapsed`)
 }
 assert.deepEqual(aligned.ruleSet.panels.front.pointOffsetsMm.M,a.ruleSet.panels.front.pointOffsetsMm.M)
})

test('geometry QA blocks physically collapsed edges and crossing contours atomically',()=>{
 const a=make(),before=JSON.stringify(a.ruleSet)
 const collapsed=run(a,'move-point-size',{size:'L',axis:'x',amountMm:-200})
 assert.equal(collapsed.ok,false)
 assert.match(collapsed.reason,/geometry QA.*Collapsed/i)
 assert.equal('ruleSet' in collapsed,false)
 const crossing=run(a,'move-point-size',{size:'L',axis:'x',amountMm:-300})
 assert.equal(crossing.ok,false)
 assert.match(crossing.reason,/geometry QA/)
 assert.equal('ruleSet' in crossing,false)
 assert.equal(JSON.stringify(a.ruleSet),before,'Unsafe edit mutated original sidecar')
})
