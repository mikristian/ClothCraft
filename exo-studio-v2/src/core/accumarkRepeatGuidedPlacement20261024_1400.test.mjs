import test from 'node:test'
import assert from 'node:assert/strict'
import {repairAccuMarkRepeatPlacement20261024_1400 as repair} from './accumarkRepeatGuidedPlacement20261024_1400.js'
import {validateAccuMarkMaterialRepeatQA as validate} from './accumarkMaterialRepeatQA20261024.js'

const square=[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]
const placed=(pieceId,x,y)=>({pieceId,instance:0,size:'M',x,y,rotationDeg:0,
 outline:square.map(p=>({x:p.x+x,y:p.y+y}))})
function setup(){
 const project={pieces:[{id:'front',cutQuantity:1,marker:{nap:'one-way'}},
 {id:'back',cutQuantity:1,marker:{nap:'one-way'}}]}
 const sources=Object.fromEntries(['front','back'].map(p=>[p,{
  cutline:structuredClone(square),anchor:{x:1,y:1},group:'body',size:'M',
  shade:'A',nap:'one-way',grainAngleDeg:0,cutQuantity:1}]))
 return {project,nesting:{ok:true,placements:[placed('front',0,0),placed('back',11,10)],errors:[],unplaced:[]},
  sourcesByPieceId:sources,fabricWidthCm:25,repeatCm:{x:10,y:10},
  shadeZones:[{shade:'A',minY:0,maxY:60}],quantitiesBySize:{M:1},toleranceCm:.001}
}
const options=()=>({target:{pieceId:'back',size:'M',instance:0},maxLengthCm:60,gapCm:.5,maxCandidates:49})

test('repairs true source motif phase by translating physical CUT polygon then revalidating entire marker',()=>{
 const input=setup(),before=structuredClone(input)
 assert(validate(input).issues.some(issue=>issue.code==='REPEAT_REGISTRATION_MISMATCH'))
 const result=repair(input,options())
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.equal(result.qa.ok,true)
 assert.equal(result.nesting.placements.length,2)
 assert.deepEqual(input,before)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.nesting.manufacturingApproved,false)
 assert.equal(result.nesting.cuttingAuthorized,false)
 assert.equal(result.nesting.metrics.placed,2)
 assert.equal(result.nesting.metrics.requested,2)
 assert.equal(result.nesting.metrics.length,Math.max(...result.nesting.placements.flatMap(p=>p.outline.map(q=>q.y))))
 assert(result.nesting.metrics.efficiency>0&&result.nesting.metrics.efficiency<=1)
 const after=result.nesting.placements[1]
 assert.equal(after.x,input.nesting.placements[1].x+result.deltaCm.x)
 assert.equal(after.y,input.nesting.placements[1].y+result.deltaCm.y)
 for(let i=0;i<square.length;i++)assert.equal(after.outline[i].x,input.nesting.placements[1].outline[i].x+result.deltaCm.x)
 assert.equal(result.provenance.referencePieceId,'front')
})
test('deterministic candidate choice and source-preserving repeated runs',()=>{
 const a=repair(setup(),options()),b=repair(setup(),options())
 assert.equal(a.ok,true);assert.equal(b.ok,true)
 assert.deepEqual(a.deltaCm,b.deltaCm)
 assert.equal(repair({...setup(),nesting:a.nesting},options()).code,'REGISTRATION_ALREADY_VALID')
})
test('blocks a source mismatch instead of disguising geometry as repeat movement',()=>{
 const args=setup()
 args.sourcesByPieceId.back.cutline[2].y=2.7
 const out=repair(args,options())
 assert.equal(out.ok,false)
 assert.equal(out.code,'UNRELATED_QA_FAILURE')
})
test('cannot override shade zone or grain/nap/cut quantity rule even if phase correction is possible',()=>{
 const grain=setup();grain.sourcesByPieceId.back.grainAngleDeg=90
 assert.equal(repair(grain,options()).code,'UNRELATED_QA_FAILURE')
 const shade=setup();shade.sourcesByPieceId.back.shade='B'
 assert.equal(repair(shade,options()).code,'UNRELATED_QA_FAILURE')
 const quantity=setup();quantity.project.pieces[1].cutQuantity=2
 assert.equal(repair(quantity,options()).code,'UNRELATED_QA_FAILURE')
})
test('limited marker length and narrow roll refuse repair when only overlap would remain',()=>{
 const args=setup();args.nesting.placements[1]=placed('back',1,10);args.fabricWidthCm=3
 const o=options();o.maxLengthCm=8
 const result=repair(args,o)
 assert.equal(result.ok,false)
 assert.equal(result.code,'NO_SAFE_REPEAT_PLACEMENT')
})
test('source-authored minimum marker gap is never bypassed merely because two polygons do not intersect',()=>{
 const input=setup()
 input.fabricWidthCm=6
 input.nesting.placements[1]=placed('back',3.2,0)
 input.sourcesByPieceId.back.anchor.x=-1.2
 const optionsForGap=options()
 optionsForGap.maxLengthCm=4
 optionsForGap.gapCm=1.5
 assert.deepEqual(validate(input).issues.map(x=>x.code),['REPEAT_REGISTRATION_MISMATCH'])
 const result=repair(input,optionsForGap)
 assert.equal(result.ok,false)
 assert.equal(result.code,'NO_SAFE_REPEAT_PLACEMENT')
 optionsForGap.gapCm=.1
 assert.equal(repair(input,optionsForGap).ok,true,'Same phase repair is valid under smaller physical marker clearance')
})
test('invalid user inputs and adversarial geometry complexity fail before expensive polygon tests',()=>{
 const args=setup()
 const invalid=options();invalid.maxCandidates=500
 assert.equal(repair(args,invalid).code,'SOURCE_OR_BUDGET_REFUSED')
 const massive=setup()
 massive.nesting.placements[0].outline=Array.from({length:200},(_,i)=>({x:i,y:i}))
 assert.equal(repair(massive,options()).code,'SOURCE_OR_BUDGET_REFUSED')
})
test('accessors and cyclic inputs cannot execute or mutate source state',()=>{
 const args=setup()
 let calls=0
 Object.defineProperty(args.project.pieces[0],'malicious',{enumerable:true,get(){calls++;throw Error('getter executed')}})
 assert.equal(repair(args,options()).code,'SOURCE_OR_BUDGET_REFUSED')
 assert.equal(calls,0)
 const cyclic=setup();cyclic.extra=cyclic
 assert.equal(repair(cyclic,options()).code,'SOURCE_OR_BUDGET_REFUSED')
})
