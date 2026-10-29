import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustGradingKernel,gradeAutomaticCoordinates,rustGradingKernelReady} from '../../src/core/rustGradingKernel.js'

const bounds={minX:-32,maxX:28,minY:-8,maxY:64}
const samples=[]
for(const offset of [-3,-2,-1,1,2,3])for(const x of [-32,-2,0,28])for(const y of [-8,0,32,64]){
  const point={x,y}
  samples.push({point,offset,expected:gradeAutomaticCoordinates(point,bounds,offset,3,1.2)})
}
const binary=readFileSync(new URL('../../public/wasm/exo_grading_kernel.wasm',import.meta.url))
assert.equal(await initializeRustGradingKernel({bytes:binary}),true)
assert.equal(rustGradingKernelReady(),true)
for(const {point,offset,expected} of samples){
  const actual=gradeAutomaticCoordinates(point,bounds,offset,3,1.2)
  for(const axis of ['x','y']) assert.ok(Math.abs(expected[axis]-actual[axis])<1e-10,JSON.stringify({point,offset,axis,expected,actual}))
}
console.log(`Rust grading WASM parity passed: ${samples.length} point/size cases`)
