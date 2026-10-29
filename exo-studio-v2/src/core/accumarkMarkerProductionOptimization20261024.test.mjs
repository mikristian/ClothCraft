import test from 'node:test'
import assert from 'node:assert/strict'
import {optimizeAccuMarkMarkerProduction20261024 as optimize,compareAccuMarkMarkerRollDemand20261024 as compare} from './accumarkMarkerProductionOptimization20261024.js'
import {gradeProject} from './grading.js'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'

const rect=(id,w,h,quantity=1)=>({id,points:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],seamAllowance:0,grainAngleDeg:0,cutQuantity:quantity,marker:{nap:'one-way'}})
const project=()=>({revision:41,pieces:[rect('a',4,4),rect('b',4,4)]})
const marker=()=>({ok:true,placements:[{pieceId:'a',instance:0,x:0,y:0,rotationDeg:0},
 {pieceId:'b',instance:0,x:0,y:12,rotationDeg:0}],errors:[],unplaced:[]})
const settings={fabricWidthCm:10,maxLengthCm:25,gapCm:1}
test('optimizes complete physical polygon marker and conserves source',()=>{
 const p=project(),m=marker(),unchanged=JSON.stringify([p,m])
 const r=optimize(p,m,settings)
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.optimization.beforeLengthCm,16)
 assert.equal(r.optimization.afterLengthCm,4);assert.equal(r.optimization.savedLengthCm,12)
 assert.equal(JSON.stringify([p,m]),unchanged);assert.equal(r.manufacturingApproved,false)
 assert.equal(r.placements.length,2)
})
test('repeatable deterministic output and explicit strict candidate budget',()=>{
 const a=optimize(project(),marker(),{...settings,maxEvaluations:2}),b=optimize(project(),marker(),{...settings,maxEvaluations:2})
 assert.deepEqual(a,b);assert.equal(a.optimization.evaluations<=2,true)
 assert.equal(optimize(project(),marker(),{...settings,maxEvaluations:2001}).code,'INVALID_LIMITS')
})
test('rejects forged incomplete marker and duplicate physical instances',()=>{
 const m=marker();m.placements.pop()
 assert.equal(optimize(project(),m,settings).code,'SOURCE_BUDGET_OR_INCOMPLETE')
 const dup=marker();dup.placements[1].pieceId='a'
 assert.equal(optimize(project(),dup,settings).code,'SOURCE_MARKER_UNVERIFIED')
})
test('source physical overlap, grain, and fabric bound fail closed',()=>{
 for(const change of [m=>{m.placements[1].y=2},m=>{m.placements[1].rotationDeg=180},m=>{m.placements[1].x=9}]){
  const m=marker();change(m)
  assert.equal(optimize(project(),m,settings).code,'SOURCE_MARKER_UNVERIFIED')
 }
})
test('unsupported motif shade holes folds grading and notches refuse',()=>{
 for(const edit of [p=>p.pieces[0].marker.motif='stripe',p=>p.pieces[0].holes=[{x:1,y:1}],
  p=>p.pieces[0].fold=true,p=>p.grading={sizes:['S','M']},p=>p.pieces[0].notches=[{x:1,y:1}]]){
  const p=project();edit(p)
  assert.equal(optimize(p,marker(),settings).code,'UNSUPPORTED_PRODUCTION_CONSTRAINT')
 }
})
test('getter, inherited toJSON, cycles and hidden metadata rejected before execution',()=>{
 let called=0;const p=project()
 Object.defineProperty(p.pieces[0],'id',{get(){called++;throw Error('unsafe')}})
 assert.equal(optimize(p,marker(),settings).code,'SOURCE_REFUSED');assert.equal(called,0)
 const p2=project();p2.extra=p2
 assert.equal(optimize(p2,marker(),settings).code,'SOURCE_REFUSED')
 const p3=project();Object.defineProperty(p3.pieces[0],'secret',{value:7,enumerable:false})
 assert.equal(optimize(p3,marker(),settings).code,'SOURCE_REFUSED')
 const orig=Object.prototype.toJSON
 try{Object.prototype.toJSON=function(){called++;throw Error('inherited executed')}
  assert.equal(optimize(project(),marker(),settings).ok,true);assert.equal(called,0)
 }finally{if(orig===undefined)delete Object.prototype.toJSON;else Object.prototype.toJSON=orig}
})
test('what-if roll demand computes real ply consumption and feasible allocation',()=>{
 const p=project(),before=marker(),after=optimize(p,before,settings)
 const result=compare(p,before,after,{...settings,plyCount:10,
  rolls:[{rollId:'R1',usableLengthCm:100},{rollId:'R2',usableLengthCm:100}]})
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.before.requiredCm,160)
 assert.equal(result.after.requiredCm,40);assert.equal(result.materialSavedCm,120)
 assert.equal(result.before.rollsUsed,2);assert.equal(result.after.rollsUsed,1)
 assert.equal(result.manufacturingApproved,false)
})
test('what-if fails when a single roll cannot hold markers or roll inputs spoof',()=>{
 const p=project(),m=marker(),r=optimize(p,m,settings)
 const a=compare(p,m,r,{...settings,plyCount:3,rolls:[{rollId:'A',usableLengthCm:10}]})
 assert.equal(a.ok,true);assert.equal(a.before.feasible,false);assert.equal(a.before.unallocatedPlies,3)
 assert.equal(compare(p,m,r,{...settings,plyCount:3,rolls:[{rollId:'A',usableLengthCm:30},{rollId:'A',usableLengthCm:50}]}).code,'INVALID_ROLL_PLAN')
})
test('what-if rejects geometric forgery in proposed improved marker',()=>{
 const p=project(),bad=marker();bad.placements[1].y=0
 assert.equal(compare(p,marker(),bad,{...settings,plyCount:1,rolls:[{rollId:'A',usableLengthCm:100}]}).code,'MARKER_UNVERIFIED')
})
test('gradeProject single-size snapshot retains optional undefined without source mutation',()=>{
 const original={...project(),grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}}
 const single=gradeProject(original,'L')
 assert.equal(single.pieces[0].curves,undefined)
 const source={...single,grading:undefined}
 const before=structuredClone(source)
 const marker=nestPolygons(source,{fabricWidth:10,gap:1,maxLength:30})
 assert.equal(marker.ok,true,JSON.stringify(marker))
 const optimization=optimize(source,marker,{fabricWidthCm:10,gapCm:1,maxLengthCm:30})
 assert.equal(optimization.ok,true,JSON.stringify(optimization))
 assert.deepEqual(source,before)
 assert.equal(optimization.manufacturingApproved,false)
 const unresolved=optimize(single,marker,{fabricWidthCm:10,gapCm:1,maxLengthCm:30})
 assert.equal(unresolved.code,'UNSUPPORTED_PRODUCTION_CONSTRAINT')
})
