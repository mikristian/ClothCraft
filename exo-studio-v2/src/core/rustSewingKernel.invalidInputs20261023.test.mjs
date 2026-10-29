import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustSewingKernel,rustSeamLengthMetrics} from './rustSewingKernel.js'

const wasm=readFileSync(new URL('../../public/wasm/exo_sewing_kernel.wasm',import.meta.url))

test('2D sewing annotation WASM initializes with the existing compiled ABI',async()=>{
  assert.equal(await initializeRustSewingKernel({bytes:wasm}),true)
})

test('invalid physical seam lengths never produce a numeric sewing annotation',async()=>{
  assert.equal(await initializeRustSewingKernel({bytes:wasm}),true)
  for(const [first,second] of [[-2,4],[4,-2],[0,4],[4,0],[NaN,4],[4,Infinity]]){
    assert.equal(rustSeamLengthMetrics(first,second,.5,10,true,true),null,`${first}, ${second}`)
  }
})

test('invalid warning thresholds never silently disable sewing mismatch warnings',async()=>{
  assert.equal(await initializeRustSewingKernel({bytes:wasm}),true)
  for(const [lengthThreshold,ratioThreshold] of [[NaN,10],[.5,Infinity],[-1,10],[.5,-1]]){
    assert.equal(rustSeamLengthMetrics(20,21,lengthThreshold,ratioThreshold,true,true),null)
  }
})

test('valid physical sewing metrics and disabled warning switches remain unchanged',async()=>{
  assert.equal(await initializeRustSewingKernel({bytes:wasm}),true)
  const valid=rustSeamLengthMetrics(20,21,.5,10,true,true)
  assert.equal(valid.signedDifferenceCm,-1)
  assert.equal(valid.absoluteDifferenceCm,1)
  assert.ok(Math.abs(valid.differencePercent-100/21)<1e-12)
  assert.equal(valid.warning,true)
  assert.equal(rustSeamLengthMetrics(20,21,.5,10,false,false).warning,false)
})
