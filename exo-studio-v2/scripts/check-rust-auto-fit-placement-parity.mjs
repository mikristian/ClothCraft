import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {constrainAutoFitPlacement, applyAutoFitPlacement} from '../src/core/autoFitPlacement.js'
import {initializeRustAutoFitPlacementKernel, rustAutoFitPlacementStatus} from '../src/core/rustAutoFitPlacementKernel.js'

const cases = []
const edge = [undefined, null, '', '0.02', 'invalid', NaN, Infinity, -Infinity, 0, -0, -1, 1e-14, 1e-12, Number.MAX_VALUE, -Number.MAX_VALUE]
for (const value of edge) for (const limit of edge) {
  cases.push([{userPlacementDeltaX:value,userPlacementDeltaY:value,userPlacementDeltaZ:value},
    {maxX:limit,maxY:limit,maxZ:limit,maxMagnitude:limit}])
}
let seed=23
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
for(let i=0;i<2000;i++) cases.push([
  Object.fromEntries(['X','Y','Z'].map(a=>[`userPlacementDelta${a}`,(random()-.5)*8])),
  Object.fromEntries(['maxX','maxY','maxZ','maxMagnitude'].map(k=>[k,(random()-.1)*.1]))])
assert.equal(rustAutoFitPlacementStatus().backend,'javascript-fallback')
const expected=cases.map(args=>constrainAutoFitPlacement(...args))
assert.equal(await initializeRustAutoFitPlacementKernel({bytes:new Uint8Array([0])}),false)
assert.deepEqual(constrainAutoFitPlacement(...cases[0]),expected[0])
assert.equal(await initializeRustAutoFitPlacementKernel({bytes:readFileSync('public/wasm/exo_auto_fit_placement_kernel.wasm')}),true)
function compare(a,b) {
  assert.deepEqual(Object.keys(a),Object.keys(b))
  for(const key of Object.keys(a)) {
    if(typeof a[key]==='object')compare(a[key],b[key])
    else assert.ok(Object.is(a[key],b[key]),`${key}: ${a[key]} != ${b[key]} (exact 64-bit parity)`)
  }
}
cases.forEach((args,i)=>compare(constrainAutoFitPlacement(...args),expected[i]))
const position={x:1,y:2,z:3}
let copies=0
const piece={particles:[{position,previous:{copy(p){assert.equal(p,position);copies++}}}]}
const result=applyAutoFitPlacement(piece,{userPlacementDeltaX:1})
assert.equal(position.x,1+result.applied.x)
assert.equal(copies,1)
applyAutoFitPlacement(piece,{userPlacementDeltaX:1},{maxMagnitude:0})
assert.equal(copies,1)
console.log(JSON.stringify({pass:true,cases:cases.length,backend:rustAutoFitPlacementStatus().backend,failedLoadFallback:true,particleMutation:true}))
