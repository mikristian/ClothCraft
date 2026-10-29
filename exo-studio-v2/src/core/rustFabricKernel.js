import { fetchWasmBytes } from './wasmTransport.js'
/**
 * EXO Rust-first fabric math bridge.
 *
 * Native Rust and wasm32 use exactly the same lib.rs. Loading is asynchronous
 * because a browser may not yet have downloaded the .wasm when a sidebar
 * renders. Synchronous public functions therefore use a parity-tested JS
 * fallback only until the Rust module becomes available.
 */
export const RUST_FABRIC_ABI_VERSION=2
const WASM_PATH='/wasm/exo_fabric_kernel.wasm'
let rust=null
let attempted=null
let runtimeError=null

export const rustFabricKernelReady=()=>Boolean(rust)
export const rustFabricKernelStatus=()=>({
  backend:rust?'rust-wasm':'javascript-fallback',
  abiVersion:rust?rust.exo_fabric_kernel_abi_version():null,
  error:runtimeError,
})

const fallbackDimension=value=>Number.isFinite(value)&&value>0?Math.max(.5,value):20
const fallbackBound=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min))
const fallbackRoughness=(green,mean,contrast)=>{
  const relative=(fallbackBound(green,0,255)-fallbackBound(mean,0,255))/255
  const neutral=.90+relative*fallbackBound(contrast,0,1.5)
  return Math.round(255*fallbackBound(neutral,.70,1))
}

export async function initializeRustFabricKernel({bytes,url=WASM_PATH}={}){
  if(rust)return true
  if(attempted)return attempted
  attempted=(async()=>{
    try{
      const wasmBytes=bytes??await fetchWasmBytes(url, "Fabric WASM download returned ")
      const result=await WebAssembly.instantiate(wasmBytes,{})
      const exports=result.instance?.exports??result.exports
      const required=[
        'exo_fabric_kernel_abi_version',
        'exo_texture_dimension_cm',
        'exo_swatch_repeats',
        'exo_procedural_repeats',
        'exo_balance_roughness_byte',
        'exo_calibration_mass','exo_calibration_shear','exo_calibration_bending',
        'exo_calibration_friction','exo_calibration_alloc','exo_calibration_free','exo_calibration_tensile',
      ]
      if(!(exports?.memory instanceof WebAssembly.Memory)||required.some(name=>typeof exports?.[name]!=='function')||
         exports.exo_fabric_kernel_abi_version()!==RUST_FABRIC_ABI_VERSION)
        throw new Error('Unexpected EXO fabric Rust ABI')
      rust=exports
      runtimeError=null
      return true
    }catch(error){
      rust=null
      runtimeError=String(error?.message||error)
      return false
    }
  })()
  return attempted
}

export function rustTextureDimension(value){
  const n=value===null||value===undefined||value===''?NaN:Number(value)
  return rust?rust.exo_texture_dimension_cm(n):fallbackDimension(n)
}
export function rustSwatchRepeats(swatchCm,repeatCm){
  return rust?rust.exo_swatch_repeats(swatchCm,repeatCm):swatchCm/fallbackDimension(repeatCm)
}
export function rustProceduralRepeats(swatchCm,tileCm){
  return rust?rust.exo_procedural_repeats(swatchCm,tileCm):
    swatchCm/(Number.isFinite(tileCm)&&tileCm>0?tileCm:3)
}
export function rustBalanceRoughnessByte(green,mean,contrast){
  // WASM parameters coerce strings to numbers. Preserve the old public
  // Number.isFinite semantics instead: strings/objects are invalid inputs.
  const numeric=value=>Number.isFinite(value)?value:NaN
  return rust?rust.exo_balance_roughness_byte(numeric(green),numeric(mean),numeric(contrast)):
    fallbackRoughness(green,mean,contrast)
}

// Loads once in a real browser; tests and non-browser tooling remain explicit.
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function'){
  void initializeRustFabricKernel()
}

// Public calibration retains JS coercion/RangeErrors before reaching this ABI.
export function rustCalibrationScalar(operation,args,fallback){
  return rust?rust[`exo_calibration_${operation}`](...args):fallback()
}
export function rustCalibrationTensile(width,gauge,observations,fallback){
  if(!rust)return fallback()
  const count=observations.length*2+3
  const ptr=rust.exo_calibration_alloc(count)
  try{
    new Float64Array(rust.memory.buffer,ptr,count).set(observations.flat())
    if(!rust.exo_calibration_tensile(ptr,observations.length,width,gauge))
      throw new RangeError('Invalid tensile measurements')
    const output=new Float64Array(rust.memory.buffer,ptr+observations.length*16,3)
    return {stiffnessNPerM:output[0],rmsErrorNPerM:output[1],maxMeasuredStrain:output[2]}
  }finally{rust.exo_calibration_free(ptr,count)}
}
