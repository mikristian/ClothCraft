import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createFabricBallGeometry as legacy} from './fixtures/fabric-ball-legacy-20261021.mjs'
import {createFabricBallGeometry as current} from '../src/core/fabricBallGeometry.js'
import {initializeRustFabricBallGeometryKernel,rustFabricBallGeometryKernelReady,rustFabricBallGeometryKernelStatus} from '../src/core/rustFabricBallGeometryKernel.js'
const cases=[{fabric:{},segments:104,rings:104},{fabric:{bend:.08,gsm:60},segments:16,rings:16},{fabric:{bend:1.8,gsm:1000},segments:32,rings:48}]
let seed=20261021
const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296
for(let i=0;i<100;i++)cases.push({fabric:{bend:random()*3-.3,gsm:random()*1500-100},segments:1+Math.floor(random()*65),rings:1+Math.floor(random()*65)})
function compare(label){
  let total=0,maxError=0,changed=0
  for(const {fabric,segments,rings} of cases){
    const expected=legacy(fabric,{segments,rings}),actual=current(fabric,{segments,rings})
    for(const key of ['position','uv','normal']){
      const a=expected.getAttribute(key).array,b=actual.getAttribute(key).array
      assert.equal(a.length,b.length,`${label}: ${key} length`)
      for(let i=0;i<a.length;i++){
        const error=Math.abs(a[i]-b[i])
        if(error>maxError)maxError=error
        if(error!==0)changed++
        assert.ok(error<=2.5e-6||Object.is(a[i],b[i]),`${label}: ${key} case ${segments}x${rings} i=${i} ${a[i]} vs ${b[i]}`)
        total++
      }
    }
    assert.deepEqual(Array.from(expected.getIndex().array),Array.from(actual.getIndex().array))
    assert.deepEqual(expected.userData,actual.userData)
    expected.dispose();actual.dispose()
  }
  console.log(JSON.stringify({label,cases:cases.length,total,maxError,changed,backend:rustFabricBallGeometryKernelStatus().backend}))
}
compare('frozen-js')
const bytes=readFileSync('public/wasm/exo_fabric_ball_geometry_kernel.wasm')
assert.equal(await initializeRustFabricBallGeometryKernel({bytes}),true)
assert.equal(rustFabricBallGeometryKernelReady(),true)
compare('rust-wasm')
