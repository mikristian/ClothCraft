import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {freeTangentDragDelta} from '../src/core/freeTangentDrag.js'
import {initializeRustTangentDragKernel,rustTangentDragKernelReady,rustTangentDragKernelStatus} from '../src/core/rustTangentDragKernel.js'
const original=(delta,side)=>{
  if(!Array.isArray(delta)||delta.length!==2||!delta.every(Number.isFinite)||!['in','out'].includes(side))return null
  return delta.map(value=>value/(side==='in'?-.18:.18))
}
let seed=20261020,checks=0
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const cases=[null,[],[0],[0,0],[0,-0],[-0,0],[-0,-0],[.18,-.18],[Infinity,0],[NaN,0],[1,2,3],['0',1],[1e-300,-1e-300],[Number.MAX_VALUE,-Number.MAX_VALUE]]
for(let i=0;i<2000;i++)cases.push([(rnd()-.5)*1e3,(rnd()-.5)*1e3])
for(let i=0;i<300;i++)cases.push([(rnd()-.5)*1e-9,(rnd()-.5)*1e9])
for(const delta of cases)for(const side of ['in','out','unknown',null]){
  assert.deepStrictEqual(freeTangentDragDelta(delta,side),original(delta,side));checks++
}
assert.equal(await initializeRustTangentDragKernel({bytes:readFileSync('public/wasm/exo_tangent_drag_kernel.wasm')}),true)
assert.equal(rustTangentDragKernelReady(),true)
for(const delta of cases)for(const side of ['in','out','unknown',null]){
  assert.deepStrictEqual(freeTangentDragDelta(delta,side),original(delta,side));checks++
}
console.log(JSON.stringify({pass:true,checks,backend:rustTangentDragKernelStatus().backend}))
