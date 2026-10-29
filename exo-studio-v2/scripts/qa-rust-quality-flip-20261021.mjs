import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustQualityFlipKernel,rustQualityFlipStatus,rustConvexQuad,rustQualityFlipBetter} from '../src/core/rustQualityFlipKernel.js'
let seed=0x25c02026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const cases=[]
for(let i=0;i<5000;i++){const scale=10**(random()*300-150);cases.push({points:Array.from({length:4},()=>[(random()-.5)*scale,(random()-.5)*scale]),minImprovement:(random()-.5)*3})}
for(const x of [0,-0,NaN,Infinity,-Infinity,1e-308,1e308])cases.push({points:[[0,0],[1,0],[x,1],[.5,-1]],minImprovement:.01})
for(const c of cases){c.convex=rustConvexQuad(...c.points);c.better=rustQualityFlipBetter(...c.points,c.minImprovement)}
assert.equal(rustQualityFlipStatus().backend,'javascript-fallback')
assert.equal(await initializeRustQualityFlipKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustQualityFlipKernel({bytes:readFileSync('public/wasm/exo_quality_flip_kernel.wasm')}),true)
assert.equal(rustQualityFlipStatus().backend,'rust-wasm')
cases.forEach((c,i)=>{assert.equal(rustConvexQuad(...c.points),c.convex,`convex ${i}`);assert.equal(rustQualityFlipBetter(...c.points,c.minImprovement),c.better,`quality ${i}`)})
console.log(JSON.stringify({pass:true,cases:cases.length,operations:cases.length*2,exact:true}))
