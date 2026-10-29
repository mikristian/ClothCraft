import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {inspectGradedNotchSeamIntervals} from './gradedNotchIntervalAudit.js'
import {correctIndustrialGradedSeamNotches20261024 as correct} from './industrialGradedSeamCorrection20261024_1516.js'
import {edgeLength,edgePointAt} from './project.js'

const sizes=['XS','S','M','L','XL','XXL']
function fixture({curved=false,partial=false,reverse=false,tA=.35,tB=.65,grow=0,unequal=false,cache=false}={}){
 const piece=(id,top=10)=>({id,points:[{x:0,y:0},{x:top,y:0},{x:top,y:10},{x:0,y:10}],
  ...(curved?{curves:{0:{cx:top*.5,cy:-4}}}:{}),
  notches:[{id:`${id}-n`,edgeIndex:0,t:id==='a'?tA:tB,matchGroupId:'pair',matchedSeamId:'sew',type:'double',depthCm:.3}]})
 const result={pieces:[piece('a'),piece('b',unequal?11:10)],seams:[{id:'sew',a:{pieceId:'a',edgeIndex:0,...(partial?{startT:.1,endT:.9}:{})},b:{pieceId:'b',edgeIndex:0,...(partial?{startT:.1,endT:.9}:{})},reverseB:reverse}],
  grading:{sizes,baseSize:'M',widthPerSizeCm:grow,lengthPerSizeCm:0},metadata:{keep:'yes'}}
 if(cache){for(const p of result.pieces){const n=p.notches[0],point=edgePointAt(p,0,n.t).point;n.x=point.x;n.y=point.y}}
 return result
}
const args={seamId:'sew',matchGroupId:'pair',stationCm:3}
const block=(p,opts=args)=>assert.equal(correct(p,opts).ok,false)

test('repairs six-size straight notch correspondence atomically and preserves metadata',()=>{
 const source=fixture(),before=structuredClone(source)
 assert.equal(inspectGradedNotchSeamIntervals(source).status,'blocked')
 const result=correct(source,args)
 assert.equal(result.ok,true,result.code)
 assert.deepEqual(source,before)
 assert.deepEqual(result.project.metadata,{keep:'yes'})
 assert.deepEqual(result.validation.checkedSizes,sizes)
 assert.equal(result.validation.rows.length,6)
 assert.equal(result.validation.manufacturingApproved,false)
 assert.equal(result.validation.notchAudit.status,'pass')
 for(const size of sizes)assert(gradeProject(result.project,size).pieces.every(piece=>piece.notches[0].type==='double'))
})
test('corrects curved sew station using arclength rather than Bézier parameter',()=>{
 const result=correct(fixture({curved:true}),args)
 assert.equal(result.ok,true,result.code)
 for(const size of sizes){
  const pieces=gradeProject(result.project,size).pieces
  assert(Math.abs(pieces[0].notches[0].t-3/edgeLength(pieces[0],0))<1e-8)
  assert.equal(inspectGradedNotchSeamIntervals(result.project).status,'pass')
 }
})
test('corrects reverse side sewn from end without changing edge topology',()=>{
 const r=correct(fixture({reverse:true}),args)
 assert.equal(r.ok,true,r.code)
 assert(Math.abs(r.project.pieces[1].notches[0].t-.7)<1e-7)
 assert.equal(inspectGradedNotchSeamIntervals(r.project).status,'pass')
})
test('corrects partial sewn straight intervals with same prefix distance',()=>{
 const r=correct(fixture({partial:true}),args)
 assert.equal(r.ok,true,r.code)
 assert(Math.abs(r.project.pieces[0].notches[0].t-.4)<1e-7)
})
test('corrects partial curved intervals with fixed curve grading',()=>{
 const r=correct(fixture({partial:true,curved:true}),args)
 assert.equal(r.ok,true,r.code)
 assert.equal(r.validation.notchAudit.status,'pass')
})
test('rejects size-dependent station rule when authored sewn interval moves with size',()=>{
 const p=fixture({grow:2,partial:true})
 block(p)
})
test('rejects mismatched physical sewn length across sizes',()=>block(fixture({unequal:true})))
test('rejects source getter without executing it',()=>{
 const p=fixture();let invoked=false
 Object.defineProperty(p.pieces[0].points[0],'x',{get(){invoked=true;return 0},enumerable:true})
 block(p);assert.equal(invoked,false)
})
test('rejects unknown notch attachment metadata',()=>{
 const p=fixture();p.pieces[0].notches[0].unknownAnchor={edge:1};block(p)
})
test('rejects cached stale coordinates',()=>{
 const p=fixture({cache:true});p.pieces[0].notches[0].x=999;block(p)
})
test('updates valid cached coordinates and keeps pairs source-consistent',()=>{
 const p=fixture({cache:true});const r=correct(p,args)
 assert.equal(r.ok,true,r.code)
 for(const piece of r.project.pieces){const n=piece.notches[0],pt=edgePointAt(piece,0,n.t).point
  assert(Math.hypot(n.x-pt.x,n.y-pt.y)<1e-8)
 }
})
test('rejects duplicate seam IDs and duplicate piece IDs',()=>{
 const p=fixture();p.seams.push(structuredClone(p.seams[0]));block(p)
 const q=fixture();q.pieces.push(structuredClone(q.pieces[0]));block(q)
})
test('rejects a notch pair assigned to the wrong seam edge',()=>{
 const p=fixture();p.pieces[1].notches[0].edgeIndex=1;block(p)
})
test('rejects unsupported seam ease and overlapping sewn edges',()=>{
 const p=fixture();p.seams[0].allowEase=true;block(p)
 const q=fixture();q.seams.push({id:'other',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:2}});block(q)
})
test('rejects existing grade station that may affect another seam',()=>{
 const p=fixture();p.pieces[0].notches[0].gradeArcStation={version:1,distanceCm:2,from:'start'};block(p)
})
test('fails closed for invalid options, invalid intervals, missing notches and malformed sizes',()=>{
 block(fixture(),{...args,toleranceCm:99})
 const p=fixture();p.seams[0].a.startT=.9;p.seams[0].a.endT=.2;block(p)
 const q=fixture();q.pieces[1].notches=[];block(q)
 const z=fixture();z.grading.sizes=['M','M'];block(z)
})
test('does not move vertex geometry or existing source grade rules',()=>{
 const p=fixture();const before=structuredClone(p)
 const r=correct(p,args)
 assert.equal(r.ok,true,r.code)
 assert.deepEqual(r.project.pieces.map(x=>x.points),before.pieces.map(x=>x.points))
 assert.deepEqual(r.project.seams,before.seams)
})
test('fails closed for six independently reproduced false-success source payloads',()=>{
 for(const mutate of [
  p=>{p.pieces[0].points[0].edgeReference={edgeIndex:0}},
  p=>{p.pieces[0].topstitches={unexpected:true}},
  p=>{p.grading.unsupportedBreaks={x:999}},
  p=>{p.pieces[0].points[0].gradeRule={enabled:false,dxPerSize:99999,dyPerSize:0}},
  p=>{p.seams.push({id:'other',a:{pieceId:'a',edgeIndex:2},b:{pieceId:'b',edgeIndex:2},reverseB:true,allowEase:true})},
  p=>{p.pieces[0].notches.push({id:'unrelated',edgeIndex:1,t:.5,x:999,y:999})},
 ]){
  const p=fixture(),original=structuredClone(p);mutate(p)
  const sourceBefore=structuredClone(p),result=correct(p,args)
  assert.equal(result.ok,false,JSON.stringify(mutate.toString()))
  assert.equal(result.project,null)
  assert.deepEqual(p,sourceBefore)
  assert.deepEqual(original.pieces.length,2)
 }
})
test('rejects unknown fields on unrelated piece and unrelated seam and unknown point metadata',()=>{
 const p=fixture();p.pieces[1].unknownAttachment={edgeIndex:0};block(p)
 const q=fixture();q.seams.push({id:'other',a:{pieceId:'a',edgeIndex:2},b:{pieceId:'b',edgeIndex:2},reverseB:true,allowEase:true});block(q)
 const r=fixture();r.pieces[1].points[2].unknownPointId='ghost';block(r)
})
