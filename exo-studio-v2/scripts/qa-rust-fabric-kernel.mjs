import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  initializeRustFabricKernel,rustFabricKernelReady,rustFabricKernelStatus,
  rustBalanceRoughnessByte,rustTextureDimension,rustSwatchRepeats,rustProceduralRepeats,
} from '../src/core/rustFabricKernel.js'
import {
  fabricSwatchRepeatDimensions,fabricSwatchMapRepeats,
  fabricProceduralSwatchRepeats,balanceRoughnessByte,
} from '../src/core/fabricPbrAppearance.js'

const baseline=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min))
const balanceJs=(green,mean,contrast)=>{
  const relative=(baseline(green,0,255)-baseline(mean,0,255))/255
  return Math.round(255*baseline(.90+relative*baseline(contrast,0,1.5),.7,1))
}
const specimen=[NaN,Infinity,-Infinity,-4,0,.1,.5,1,3,9,20,40,270]
const roughness=[NaN,Infinity,-Infinity,'123',null,-5,0,12,64,96,128,191,220,255,300]
const cases=[
  [()=>fabricSwatchMapRepeats({repeatWidthCm:20,repeatHeightCm:9}),[13.5,30]],
  [()=>fabricSwatchRepeatDimensions({repeatWidthCm:.1,repeatHeightCm:9}),{repeatWidthCm:.5,repeatHeightCm:9}],
  [()=>fabricProceduralSwatchRepeats(3),[90,90]],
]
for(const [fn,expected] of cases)assert.deepEqual(fn(),expected)
assert.equal(rustFabricKernelReady(),false,'Node does not implicitly fetch browser assets')
const bytes=readFileSync('public/wasm/exo_fabric_kernel.wasm')
assert.ok(bytes.length>32)
assert.equal(await initializeRustFabricKernel({bytes}),true,rustFabricKernelStatus().error??'WASM load failed')
assert.equal(rustFabricKernelReady(),true)
assert.equal(rustFabricKernelStatus().backend,'rust-wasm')
assert.equal(rustFabricKernelStatus().abiVersion,2)
for(const value of specimen){
  const expected=Number.isFinite(value)&&value>0?Math.max(.5,value):20
  assert.equal(rustTextureDimension(value),expected,`dimension ${value}`)
  assert.equal(rustSwatchRepeats(270,value),270/expected,`repeat ${value}`)
  const tile=Number.isFinite(value)&&value>0?value:3
  assert.equal(rustProceduralRepeats(270,value),270/tile,`procedural ${value}`)
}
let balanceCases=0
for(const green of roughness)for(const mean of roughness)for(const contrast of [-1,0,.26,.44,.57,.9,1.5,NaN,Infinity]){
  assert.equal(rustBalanceRoughnessByte(green,mean,contrast),balanceJs(green,mean,contrast),
    `roughness ${green}/${mean}/${contrast}`)
  balanceCases++
}
for(const [fn,expected] of cases)assert.deepEqual(fn(),expected)
assert.deepEqual(fabricSwatchMapRepeats({repeatWidthCm:20,repeatHeightCm:9}),[13.5,30])
assert.equal(balanceRoughnessByte(123,123,.5),230)
console.log(JSON.stringify({pass:true,backend:rustFabricKernelStatus().backend,wasmBytes:bytes.length,
  dimensionCases:specimen.length,roughnessParityCases:balanceCases,previousPublicApiPreserved:true}))
