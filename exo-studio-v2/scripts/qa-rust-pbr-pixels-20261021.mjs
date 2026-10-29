import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {estimateFabricPbrPixels} from '../src/core/fabricPbrGenerator.js'
import {initializeRustPbrPixelsKernel,rustPbrPixelsStatus} from '../src/core/rustPbrPixelsKernel.js'

let seed=0x21a1b2c3
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const fixtures=[]
for(const [w,h] of [[2,2],[3,3],[7,5],[16,32],[21,11],[64,64],[128,64]]){
 for(const gain of [0,.1,.6,2,4,8,20]){
  const raw=new Uint8ClampedArray(w*h*4)
  for(let i=0;i<raw.length;i++)raw[i]=Math.floor(rand()*256)
  fixtures.push({image:{width:w,height:h,data:raw},gain})
 }
}
// Additional edge images: flat white, black, near-normal gradients, transparency.
for(const [w,h,v] of [[2,2,0],[3,3,255],[32,17,127],[100,80,182]]){
 const raw=new Uint8ClampedArray(w*h*4)
 for(let i=0;i<raw.length;i+=4)raw.set([v,v,v,i%8?255:0],i)
 fixtures.push({image:{width:w,height:h,data:raw},gain:2})
}
const frozen=fixtures.map(({image,gain})=>estimateFabricPbrPixels(image,{normalStrength:gain}))
assert.equal(rustPbrPixelsStatus().backend,'javascript-fallback')
assert.equal(await initializeRustPbrPixelsKernel({bytes:readFileSync('public/wasm/exo_pbr_pixels_kernel.wasm')}),true)
assert.equal(rustPbrPixelsStatus().backend,'rust-wasm')
let pixelBytes=0
for(const [i,{image,gain}] of fixtures.entries()){
 const before=new Uint8ClampedArray(image.data)
 const native=estimateFabricPbrPixels(image,{normalStrength:gain})
 assert.deepEqual(native,frozen[i],`PBR native/JS fixture ${i}`)
 assert.deepEqual(image.data,before,`PBR input was mutated ${i}`)
 pixelBytes+=native.normal.length+native.roughness.length
}
const invalid=[{width:1,height:2,data:new Uint8ClampedArray(8)},
 {width:2,height:2,data:new Uint8ClampedArray(15)}]
for(const image of invalid)assert.throws(()=>estimateFabricPbrPixels(image),/Invalid fabric image pixels/)
console.log(JSON.stringify({pass:true,backend:rustPbrPixelsStatus().backend,
  seed:'0x21a1b2c3',images:fixtures.length,comparedOutputBytes:pixelBytes,
  exactRGBAParity:true,invalidErrorParity:true,sourcePixelImmutability:true,calibratedMaterial:false}))
