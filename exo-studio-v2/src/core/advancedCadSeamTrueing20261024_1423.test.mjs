import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectAdvancedCadSeamWalk20261024_1423 as walk,proposeAdvancedCadSeamEndpointTrueing20261024_1423 as propose} from './advancedCadSeamTrueing20261024_1423.js'

const make=(length=40,other=40)=>({revision:5,grading:{baseSize:'M',sizes:['S','M','L'],widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'a',points:[{x:0,y:0},{x:length,y:0},{x:length,y:20},{x:0,y:20}]},
    {id:'b',points:[{x:0,y:0},{x:other,y:0},{x:other,y:20},{x:0,y:20}]}],
  seams:[{id:'join',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0},reverseB:false}]})

test('physical seam walk matches equal straight edges without source mutation',()=>{
  const p=make(),snapshot=structuredClone(p)
  const r=walk(p,{seamId:'join',sizes:['S','M','L']})
  assert.equal(r.ok,true,r.reason)
  assert.equal(r.results.length,3)
  assert(r.results.every(s=>s.referenceWithinTolerance&&s.rows.length===17&&s.lengthMismatchMm===0))
  assert.deepEqual(p,snapshot)
  assert.equal(r.manufacturingApproved,false)
})
test('detects signed sewing mismatch in actual millimetres',()=>{
  const r=walk(make(40,43),{seamId:'join',sizes:['M']})
  assert.equal(r.ok,true,r.reason)
  assert(Math.abs(r.results[0].signedMismatchMm+30)<1e-8)
  assert(r.results[0].issues.includes('SEAM_LENGTH_MISMATCH'))
})
test('reverse edge correspondence yields aligned rows',()=>{
  const p=make();p.pieces[1].points=[{x:40,y:0},{x:0,y:0},{x:0,y:-20},{x:40,y:-20}]
  p.seams[0].reverseB=true
  const r=walk(p,{seamId:'join',sizes:['M']})
  assert.equal(r.ok,true,r.reason)
  assert(r.results[0].rows.every(x=>x.distanceMm<1e-6))
})
test('partial straight seam intervals measure physical sewn lengths',()=>{
  const p=make();p.seams[0].a={pieceId:'a',edgeIndex:0,startT:.25,endT:.75};p.seams[0].b={pieceId:'b',edgeIndex:0,startT:.1,endT:.6}
  const r=walk(p,{seamId:'join',sizes:['M']})
  assert.equal(r.ok,true,r.reason)
  assert(Math.abs(r.results[0].lengthsMm[0]-200)<1e-7)
  assert(Math.abs(r.results[0].lengthsMm[1]-200)<1e-7)
})
test('proposes a bounded detached endpoint reconciliation and proves requested sizes',()=>{
  const p=make(40,39),before=structuredClone(p)
  const r=propose(p,{seamId:'join',sizes:['S','M','L']})
  assert.equal(r.ok,true,r.reason)
  assert.equal(r.pieceId,'b');assert.equal(r.pointIndex,1)
  assert(Math.abs(r.proposed.x-40)<1e-8)
  assert(Math.abs(r.movementMm-10)<1e-8)
  assert.equal(r.after.length,3)
  assert.equal(r.manufacturingApproved,false)
  assert.deepEqual(p,before)
})
test('blocks large endpoint changes rather than clamping',()=>{
  const r=propose(make(40,35),{seamId:'join',maxMovementMm:20})
  assert.equal(r.ok,false)
  assert.match(r.reason,/displacement/)
})
test('guard rejects attached notches, allowances and graded vertex metadata',()=>{
  const variants=[p=>p.pieces[1].notches=[{edgeIndex:0,t:.5}],p=>p.pieces[1].seamAllowance=1,p=>p.pieces[1].points[1].gradeRule={enabled:true,dxPerSize:0,dyPerSize:0}]
  for(const mutate of variants){const p=make(40,39);mutate(p);assert.equal(propose(p,{seamId:'join'}).ok,false)}
})
test('guard rejects neighboring sewing relationships',()=>{
  const p=make(40,39)
  p.seams.push({id:'neighbor',a:{pieceId:'b',edgeIndex:1},b:{pieceId:'a',edgeIndex:1}})
  assert.match(propose(p,{seamId:'join'}).reason,/Adjacent sewn/)
})
test('guard blocks curved edge trueing and curved partial interval walk',()=>{
  const p=make();p.pieces[1].curves={0:{cx:20,cy:5}}
  assert.equal(propose(p,{seamId:'join'}).ok,false)
  p.seams[0].b.startT=.1
  assert.equal(walk(p,{seamId:'join',sizes:['M']}).ok,false)
})
test('ambiguous seams, invalid intervals and corrupted coordinates fail closed',()=>{
  const variants=[p=>p.seams.push({...p.seams[0]}),p=>{p.seams[0].a.startT=.9;p.seams[0].a.endT=.2},p=>p.seams[0].a.endT=1.1,p=>p.pieces[0].points[0].x=Infinity]
  for(const mutate of variants){const p=make();mutate(p);assert.equal(walk(p,{seamId:'join'}).ok,false)}
})
test('untrusted inherited getter and cyclic source objects never pass validation',()=>{
  let invoked=false
  const p=make();Object.defineProperty(p.pieces[0].points[0],'x',{enumerable:true,get(){invoked=true;throw Error('bad')}})
  assert.equal(walk(p,{seamId:'join'}).ok,false);assert.equal(invoked,false)
  const cyclic=make();cyclic.pieces[0].self=cyclic
  assert.equal(walk(cyclic,{seamId:'join'}).ok,false)
})
