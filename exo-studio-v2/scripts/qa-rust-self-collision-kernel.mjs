import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustSelfCollisionKernel, selfCollisionPairScalars, rustSelfCollisionKernelStatus} from '../src/core/rustSelfCollisionKernel.js'
const cases = []
const values = [0, -0, 1e-7, 1e-6, -1, 0.003, 2, Infinity, -Infinity, NaN]
for (const squared of values) for (const wa of values) for (const wb of values) {
  for (const [a,b] of [[0,0],[1,0],[0,1],[Infinity,0],[NaN,1]]) cases.push([0.02,squared,wa,wb,a,b])
}
for (const minimum of values) for (const squared of values) cases.push([minimum,squared,1,3,0,1])
let seed = 29
const random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 2 ** 32)
for (let i=0;i<10000;i++) cases.push([random(),random()*.01,random()*5,random()*9,Math.floor(random()*3),Math.floor(random()*3)])
// Independent expression of the original pair block, including its early exit.
function original([minimum,squared,wa,wb,a,b]) {
  const distance = Math.sqrt(Math.max(squared,1e-6))
  const penetration = minimum-distance
  if (wa+wb<=1e-6) return {distance,active:false}
  if (a!==b && wa>0 && wb>0) {
    if(a>b){wa=.9;wb=.1}else{wa=.1;wb=.9}
  }
  const total=wa+wb
  return {distance,active:true,wa,wb,sa:wa>0?-penetration*(wa/total):null,sb:wb>0?penetration*(wb/total):null}
}
const expected=cases.map(args=>selfCollisionPairScalars(...args))
for(let i=0;i<cases.length;i++) {
  const ref=original(cases[i]), p=expected[i]
  assert.deepEqual(p[0],ref.distance)
  assert.equal(Boolean(p[6]),ref.active)
  if(ref.active){assert.deepEqual(p.slice(2,4),[ref.wa,ref.wb]);if(ref.wa>0)assert.deepEqual(p[4],ref.sa);if(ref.wb>0)assert.deepEqual(p[5],ref.sb)}
}
assert.equal(await initializeRustSelfCollisionKernel({bytes:new Uint8Array([0])}),false)
assert.equal(rustSelfCollisionKernelStatus().backend,'javascript-fallback')
assert.equal(await initializeRustSelfCollisionKernel({bytes:readFileSync('public/wasm/exo_self_collision_kernel.wasm')}),true)
for(let i=0;i<cases.length;i++) assert.deepEqual(selfCollisionPairScalars(...cases[i]),expected[i],`pair ${i}`)
console.log(JSON.stringify({pass:true,pairs:cases.length,backend:rustSelfCollisionKernelStatus().backend,comparison:'exact, including NaN and signed zero'}))
