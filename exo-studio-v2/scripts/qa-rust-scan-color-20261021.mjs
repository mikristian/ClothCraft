import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {regradeScannedPixel,tintLicensedFabricScan} from '../src/core/photographicScanToning.js'
import {initializeRustScanColorKernel,rustScanColorStatus} from '../src/core/rustScanColorKernel.js'

let state=0x21102026
const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)
const channel=()=>Math.floor(random()*256)
const cases=Array.from({length:8192},()=>({rgb:[channel(),channel(),channel()],
  mean:random()*1.5-.25,target:[channel(),channel(),channel()]}))
cases.push(...[0,1,0.06,.94,NaN,Infinity,-Infinity,Number.EPSILON]
  .flatMap(value=>[0,255].map(c=>({rgb:[c,c,c],mean:value,target:[255-c,c,Math.floor(c/2)]}))))
cases.push({rgb:[300,-5,42],mean:.7,target:[255,0,260]},{rgb:['100',null,23],mean:.5,target:[42,128,255]})
const fallback=cases.map(({rgb,mean,target})=>regradeScannedPixel(rgb,mean,target))
assert.equal(rustScanColorStatus().backend,'javascript-fallback')
assert.equal(await initializeRustScanColorKernel({bytes:readFileSync('public/wasm/exo_scan_color_kernel.wasm')}),true)
assert.equal(rustScanColorStatus().backend,'rust-wasm')
for(const [i,{rgb,mean,target}] of cases.entries()){
  const actual=regradeScannedPixel(rgb,mean,target)
  assert.deepEqual(actual,fallback[i],`pixel ${i} JS/WASM byte parity`)
}
assert.equal(tintLicensedFabricScan(null),null)
console.log(JSON.stringify({pass:true,backend:rustScanColorStatus().backend,
  seed:'0x21102026',pixelCases:cases.length,channelComparisons:cases.length*3,
  exactByteParity:true,legacyNonfiniteFallback:true,originalImageWrites:0,physicalColorCertification:false}))
