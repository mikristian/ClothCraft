import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustMarkerKernel,markerPdfCoordinates,rustMarkerKernelStatus} from '../src/core/rustMarkerKernel.js'
let seed=0x20261021
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const cases=[]
for(let i=0;i<2000;i++){
  const points=Array.from({length:1+Math.floor(rand()*16)},()=>({x:(rand()-.5)*400,y:(rand()-.5)*1200}))
  const height=1+rand()*400,start=(rand()-.5)*800
  cases.push({points,height,start,expected:markerPdfCoordinates(points,height,start)})
}
assert.equal(rustMarkerKernelStatus().backend,'javascript-fallback')
assert.equal(await initializeRustMarkerKernel({bytes:readFileSync('public/wasm/exo_marker_kernel.wasm')}),true)
let checks=0
for(const c of cases){assert.deepEqual(markerPdfCoordinates(c.points,c.height,c.start),c.expected);checks+=c.points.length*2}
console.log(JSON.stringify({pass:true,cases:cases.length,coordinateChecks:checks,backend:rustMarkerKernelStatus().backend}))
