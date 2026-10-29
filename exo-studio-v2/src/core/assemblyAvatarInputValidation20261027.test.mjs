import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeAssemblyPose} from './backends/nativeAssemblyPreflight.js'
import {clampWalk,walkKeys,walkPose,walkVertex} from './avatarWalkPreview20261025.js'

const base=()=>({
  particles:[{id:0,pieceId:'front',position:[0,0,0]},{id:1,pieceId:'front',position:[1,0,0]},
    {id:2,pieceId:'front',position:[0,1,0]}],
  pieces:[{id:'front',particleIndices:[0,1,2],flatVerticesM:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]}],
  constraints:[],
})

test('assembly preflight rejects malformed index references before geometry analysis',()=>{
  for(const index of [-1,3,0.5]){
    const payload=base()
    payload.pieces[0].particleIndices[1]=index
    assert.throws(()=>inspectNativeAssemblyPose(payload),RangeError)
  }
  const missing=base()
  missing.constraints=[{type:'seam',a:-1,b:1}]
  assert.throws(()=>inspectNativeAssemblyPose(missing),RangeError)
  const malformed=base()
  malformed.particles={length:3}
  assert.throws(()=>inspectNativeAssemblyPose(malformed),TypeError)
})

test('avatar preview bounds invalid heights and safely falls back on malformed timeline keys',()=>{
  assert.equal(clampWalk(null,.5,3),.5)
  assert.equal(clampWalk('',.5,3),.5)
  assert.deepEqual(walkKeys({keyframes:[null,{t:1,z:1,yaw:0}]}).map(k=>k.t),[0,1])
  assert.deepEqual(walkVertex(.1,.4,0,1,Number.NaN),walkVertex(.1,.4,0,1,.5))
  assert.ok(walkVertex(.1,.4,0,1,Infinity).every(Number.isFinite))
})

test('avatar timeline extends short custom key ranges with stationary endpoints',()=>{
  const keyframes=[{id:'first',t:.25,z:.2,yaw:0},{id:'last',t:.75,z:.8,yaw:90}]
  const keys=walkKeys({keyframes})
  assert.deepEqual(keys.map(key=>key.t),[0,.25,.75,1])
  assert.equal(walkPose(0,{distance:2,keyframes}).translationZ,.4)
  assert.equal(walkPose(.1,{distance:2,keyframes}).gaitWeight,0)
  assert.equal(walkPose(1,{distance:2,keyframes}).translationZ,1.6)
  assert.equal(walkPose(.9,{distance:2,keyframes}).gaitWeight,0)
  assert.equal(keyframes.length,2)
})
