import test from 'node:test'
import assert from 'node:assert/strict'
import { assembleNativeSeams } from './seamAssembly.js'

test('multipanel free-sewing staging rejects nonfinite rest lengths before pose mutation', () => {
  const particles = Array.from({length: 6}, (_, i) => ({id:i,pieceId:i<3?'front':'back',position:[i<3?0:.08,i%3===2?.1:0,i%3===1?.1:0],invMass:1}))
  const pieces = ['front','back'].map((id, n) => ({id,particleIndices:[n*3,n*3+1,n*3+2],flatVerticesM:[[0,0,0],[.1,0,0],[0,.1,0]],faces:[[0,1,2]]}))
  const payload = {particles,pieces,constraints:[],virtualSeams:[{seamId:'shoulder',sourceIndices:[0],sourceWeights:[1],targetIndices:[3],targetWeights:[1],rest:NaN}]}
  const original = structuredClone(payload.particles)
  for (const rest of [NaN,Infinity,-.01]) {
    payload.virtualSeams[0].rest=rest
    assert.throws(() => assembleNativeSeams(payload,{iterations:1}),/virtual seam rest length/)
    assert.deepEqual(payload.particles,original)
  }
})
