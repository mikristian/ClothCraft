import test from 'node:test'
import assert from 'node:assert/strict'
import {assembleNativeSeams} from './seamAssembly.js'
import {walkKeys,walkPose} from '../avatarWalkPreview20261025.js'

const payload=()=>({
  particles:[
    {id:0,pieceId:'front',position:[0,0,0],invMass:1},
    {id:1,pieceId:'front',position:[.2,0,0],invMass:1},
    {id:2,pieceId:'front',position:[0,.2,0],invMass:1},
  ],
  pieces:[{id:'front',particleIndices:[0,1,2],flatVerticesM:[[0,0,0],[.2,0,0],[0,.2,0]],faces:[[0,1,2]]}],
  constraints:[],
})

test('seam assembly fails closed on invalid references before solver iteration',()=>{
  for(const index of [-1,3,.5]){
    const value=payload()
    value.pieces[0].particleIndices[1]=index
    assert.throws(()=>assembleNativeSeams(value,{iterations:1}),RangeError)
  }
})

test('seam assembly guards invalid mass, options and missing contact avatar',()=>{
  const value=payload()
  for(const invalid of [-1,Infinity,NaN,'1']){
    value.particles[0].invMass=invalid
    assert.throws(()=>assembleNativeSeams(value,{iterations:0}),RangeError)
  }
  value.particles[0].invMass=1
  assert.throws(()=>assembleNativeSeams(value,{iterations:NaN}),RangeError)
  assert.throws(()=>assembleNativeSeams(value,{seamPasses:-1}),RangeError)
  assert.throws(()=>assembleNativeSeams(value,{contactConstrained:true}),TypeError)
  assert.throws(()=>assembleNativeSeams(value,{jointConstraintMode:true}),TypeError)
})

test('duplicate avatar timeline timestamps do not introduce jumps or invalid interpolation',()=>{
  const keys=walkKeys({keyframes:[{t:0,z:0,yaw:0},{t:.5,z:.3,yaw:0},{t:.5,z:.5,yaw:45},{t:1,z:1,yaw:90}]})
  assert.deepEqual(keys.map(key=>key.t),[0,.5,1])
  const pose=walkPose(.5,{distance:2,keyframes:keys})
  assert.ok(Object.values(pose).every(Number.isFinite))
  assert.equal(pose.translationZ,1)
  assert.deepEqual(walkKeys({keyframes:[{t:.5,z:0},{t:.5,z:1}]}).map(key=>key.t),[0,1])
})
