import test from 'node:test'
import assert from 'node:assert/strict'
import {screenNativeSleeveDisjointSweptContactResearch20261025 as screen} from
  '../src/core/backends/nativeSleeveDisjointSweptContactResearch20261025.js'

const fixture = (stationaryX=.1414213562373095) => {
  const points = [
    [.2,0,0], [.2,.1,0], [.2,0,.1],
    [stationaryX,-.05,-.18], [stationaryX,.15,-.18], [stationaryX,-.05,-.1],
  ]
  return {pieces:[{id:'sleeve-right',particleIndices:[0,1,2,3,4,5],
    faces:[[0,1,2],[3,4,5]]}],
  particles:points.map(position=>({pieceId:'sleeve-right',position}))}
}
const hinge = {axisOriginM:[0,0,0],axisUnit:[0,1,0],
  startRadians:0,endRadians:Math.PI/2,movingVertices:[0,1,2]}

test('prescribed rotation crosses a disjoint stationary triangle between endpoints',()=>{
  const payload=fixture(), snapshot=JSON.stringify(payload)
  const r=screen(payload,'sleeve-right',hinge,[0,0,0],{maxDepth:10})
  assert.equal(r.disjointIntervalClear,false)
  assert.equal(r.blocker?.reason,'sampled-contact')
  assert.ok(r.blocker.fraction>0 && r.blocker.fraction<1)
  assert.equal(r.disjointPairs,1)
  assert.equal(r.adjacentPairsNotCertified,0)
  assert.equal(r.prunedSweptBounds + r.rootCheckedPairs,1)
  assert.equal(r.rootCheckedPairs,1)
  assert.equal(r.deformableCCDCertified,false)
  assert.equal(r.safeToAutoApply,false)
  assert.equal(JSON.stringify(payload),snapshot)
})

test('distant faces clear only the scoped disjoint rigid interval',()=>{
  const r=screen(fixture(2),'sleeve-right',hinge,[0,0,0])
  assert.equal(r.disjointIntervalClear,true)
  assert.equal(r.disjointPairs,1)
  assert.equal(r.prunedSweptBounds,1)
  assert.equal(r.rootCheckedPairs,0)
  assert.equal(r.distanceEvaluations,0)
  assert.equal(r.adjacentFaceSweptContactCertified,false)
  assert.equal(r.physicalAcceptance,false)
})

test('material neighbors are counted but never certified by disjoint interval',()=>{
  const payload=fixture(2)
  payload.pieces[0].faces[1]=[1,3,4]
  const r=screen(payload,'sleeve-right',hinge,[0,0,0])
  assert.equal(r.adjacentPairsNotCertified,1)
  assert.equal(r.disjointPairs,0)
  assert.equal(r.rootCheckedPairs,0)
  assert.equal(r.adjacentFaceSweptContactCertified,false)
})

test('malformed hinge, faces, ownership and budgets fail closed',()=>{
  const base=fixture()
  assert.throws(()=>screen(base,'sleeve-right',hinge,[0,0,0],
    {maxFacePairs:0}),/budget/i)
  const badFace=structuredClone(base)
  badFace.pieces[0].faces[1]=[0,1,2]
  assert.throws(()=>screen(badFace,'sleeve-right',hinge,[0,0,0]),/duplicate/i)
  const badOwner=structuredClone(base)
  badOwner.particles[2].pieceId='front'
  assert.throws(()=>screen(badOwner,'sleeve-right',hinge,[0,0,0]),/ownership/i)
  const badHinge={...hinge,movingVertices:[0,1,1]}
  assert.throws(()=>screen(base,'sleeve-right',badHinge,[0,0,0]),/moving/i)
  assert.throws(()=>screen(base,'sleeve-right',hinge,[NaN,0,0]),/inputs/i)
})
