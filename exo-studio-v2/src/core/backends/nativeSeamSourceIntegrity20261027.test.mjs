import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativeSeamSourceIntegrity20261027 as verify} from './nativeSeamSourceIntegrity20261027.js'
import {measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'

const fixture = () => ({
  particles:[
    {pieceId:'front',position:[0,0,0]}, {pieceId:'front',position:[.1,0,0]},
    {pieceId:'back',position:[0,.01,0]}, {pieceId:'back',position:[.1,.01,0]},
  ],
  pieces:[
    {id:'front',particleIndices:[0,1],flatVerticesM:[[0,0,0],[.1,0,0]]},
    {id:'back',particleIndices:[2,3],flatVerticesM:[[0,0,0],[.1,0,0]]},
  ],
  constraints:[{type:'seam',a:0,b:2,seamId:'join'}],
  virtualSeams:[{seamId:'join',sourceIndices:[0,1],sourceWeights:[.5,.5],
    targetIndices:[2,3],targetWeights:[.5,.5]}],
})

test('valid native material mapping preserves direct and weighted seam gap measurements',()=>{
  const payload=fixture()
  assert.deepEqual(verify(payload),{valid:true,seamSamples:2,panelCount:2})
  assert.equal(measureNativeSeamResiduals(payload).maxGapMm,10)
})

test('adversarial mixed-panel virtual anchor must fail even if both weighted endpoints coincide',()=>{
  const payload=fixture()
  payload.virtualSeams[0].sourceIndices=[0,2]
  payload.virtualSeams[0].targetIndices=[0,2]
  assert.throws(()=>verify(payload),/crosses material panels/)
  assert.throws(()=>measureNativeSeamResiduals(payload),/crosses material panels/)
})

test('a swapped particle panel ID cannot claim a source-to-seam mapping',()=>{
  const payload=fixture()
  payload.particles[0].pieceId='back'
  assert.throws(()=>measureNativeSeamResiduals(payload),/identity disagrees/)
})

test('duplicated, orphaned, and out-of-range panel indices are rejected',()=>{
  for(const mutate of [
    p=>p.pieces[1].particleIndices[0]=1,
    p=>p.pieces[1].particleIndices.pop(),
    p=>p.pieces[1].particleIndices[0]=999,
  ]) {
    const payload=fixture();mutate(payload)
    assert.throws(()=>verify(payload),/mapping|owners|ownership/)
  }
})

test('reject a self-stitch and zero or negative weighted anchor mass',()=>{
  const p=fixture();p.constraints[0].b=0
  assert.throws(()=>verify(p),/itself/)
  p.constraints[0].b=2
  p.virtualSeams[0].sourceWeights=[1.1,-.1]
  assert.throws(()=>verify(p),/weights/)
  p.virtualSeams[0].sourceWeights=[0,0]
  assert.throws(()=>verify(p),/sum to one/)
})
