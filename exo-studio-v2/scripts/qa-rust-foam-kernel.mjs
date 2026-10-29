import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stepFoamCompressionState,foamPressFalloff} from '../src/core/foamCompressionModel.js'
import {initializeRustFoamKernel,rustFoamStatus} from '../src/core/rustFoamKernel.js'

const configs=[
  [{},{pressStrength:1,pressureKpa:45,depthCm:2},1/60],
  [{compressionKpa:10,recoverySeconds:0.3,densityKgM3:90,memory:.2},
    {pressStrength:.75,pressureKpa:100,depthCm:5,distanceCm:2,radiusCm:6,edgeSoftness:.35},1/75],
  [{compressionKpa:500,maxCompression:.9,dampingRatio:.12,memory:.35},
    {press:true,pressure:120,distanceCm:0,radiusCm:4,depthCm:3},.25],
  [{densityKgM3:10,recoverySeconds:5,dampingRatio:2},
    {pressStrength:0,pressureKpa:0,depthCm:9},1/240],
  [{},{pressStrength:Infinity,pressureKpa:NaN,distanceCm:7,radiusCm:3},Infinity],
]
const expected=[]
for(const [properties,command,dt] of configs){
  let state
  const frames=[]
  for(let frame=0;frame<80;frame++){
    const input=frame<24?command:{...command,pressStrength:0,press:false}
    state=stepFoamCompressionState(state,input,dt,properties)
    frames.push(state)
  }
  expected.push(frames)
}
const masks=[]
for(const radius of [0,0.001,1,4,20])
  for(const softness of [0.05,0.15,0.5,1])
    for(const distance of [-1,0,radius*.15,radius*.5,radius*.95,radius,radius*2]){
      masks.push({radius,softness,distance,value:foamPressFalloff(distance,radius,softness)})
    }

const bytes=readFileSync('public/wasm/exo_foam_kernel.wasm')
assert.equal(await initializeRustFoamKernel({bytes}),true,rustFoamStatus().error)
assert.equal(rustFoamStatus().backend,'rust-wasm')
const equal=(actual,wanted,key)=>assert.ok(Number.isFinite(actual)&&
  Math.abs(actual-wanted)<=2e-10*Math.max(1,Math.abs(wanted)),
  `${key}: Rust ${actual} versus original JS ${wanted}`)
let checks=0
for(const [i,[properties,command,dt]] of configs.entries()){
  let state
  for(let frame=0;frame<80;frame++){
    const input=frame<24?command:{...command,pressStrength:0,press:false}
    state=stepFoamCompressionState(state,input,dt,properties)
    for(const [key,value] of Object.entries(expected[i][frame])){
      equal(state[key],value,`configuration ${i} frame ${frame} ${key}`)
      checks++
    }
  }
}
for(const {radius,softness,distance,value} of masks){
  equal(foamPressFalloff(distance,radius,softness),value,'radial falloff')
  checks++
}
assert.equal(stepFoamCompressionState(undefined,{},0).compression,0)
console.log(JSON.stringify({pass:true,backend:rustFoamStatus().backend,
  checks,frames:configs.length*80,maskCases:masks.length,wasmBytes:bytes.length}))
