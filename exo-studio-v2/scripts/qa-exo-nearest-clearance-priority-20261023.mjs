// Independent research-only QA: prioritize the nearest actual thickness
// blockers even when face iteration encounters them last. No garment writes.
import assert from 'node:assert/strict'
import test from 'node:test'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

function separatedNearPairs({reverse=false}={}){
  const particles=[],faces=[]
  for(let i=0;i<10;i++){
    const x=i*10,gap=.00095-i*.00009
    const points=[[x,0,0],[x+1,0,0],[x,1,0],
      [x+.2,.2,gap],[x+.5,.2,gap],[x+.2,.5,gap]]
    const start=particles.length
    particles.push(...points.map(position=>({position:[...position]})))
    faces.push([start,start+1,start+2],[start+3,start+4,start+5])
  }
  if(reverse)faces.reverse()
  return {particles,pieces:[{id:'cloth',
    particleIndices:particles.map((_,i)=>i),faces}]}
}

test('nearest eight witnesses retain severe late contacts, not first eight face-order contacts',()=>{
  const source=separatedNearPairs(),frozen=JSON.stringify(source)
  const out=inspectNativeIntrapanelStaticContact(source,{clearanceM:.001})
  assert.equal(out.checkedTotalPairs,190)
  assert.equal(out.nonadjacentNearClearancePairs,10)
  assert.equal(out.nearClearanceExamples.length,8)
  assert.equal(out.staticDisjointThicknessScreenClear,false)
  const distances=out.nearClearanceExamples.map(x=>x.distanceMm)
  assert.ok(distances.every((d,i)=>i===0||d>=distances[i-1]))
  for(let i=0;i<8;i++)assert.ok(Math.abs(distances[i]-(.14+i*.09))<1e-8)
  assert.ok(Math.abs(out.minimumNearClearanceMm-.14)<1e-8)
  assert.ok(out.nearClearanceExamples.every(x=>x.materialFaceEdgeHops===null))
  assert.equal(JSON.stringify(source),frozen)
})

test('face-order reversal does not change prioritized distances or violation count',()=>{
  const normal=inspectNativeIntrapanelStaticContact(separatedNearPairs())
  const reversed=separatedNearPairs({reverse:true}),frozen=JSON.stringify(reversed)
  const result=inspectNativeIntrapanelStaticContact(reversed)
  assert.equal(result.nonadjacentNearClearancePairs,normal.nonadjacentNearClearancePairs)
  assert.deepEqual(result.nearClearanceExamples.map(x=>+x.distanceMm.toFixed(8)),
    normal.nearClearanceExamples.map(x=>+x.distanceMm.toFixed(8)))
  assert.equal(result.fitCertified,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(reversed),frozen)
})

test('bounded pair budget still rejects before any partial result can be accepted',()=>{
  const source=separatedNearPairs(),frozen=JSON.stringify(source)
  assert.throws(()=>inspectNativeIntrapanelStaticContact(source,{maxPairs:189}),
    /bounded work budget/)
  assert.equal(JSON.stringify(source),frozen)
})
