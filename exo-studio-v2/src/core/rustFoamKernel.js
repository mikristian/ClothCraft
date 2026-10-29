import { fetchWasmBytes } from './wasmTransport.js'
/** Rust physical-space foam preview integrator. Public callers keep existing
 * validation/default semantics while the numerical loop executes in WASM.
 */
export const RUST_FOAM_ABI_VERSION=1
const WASM_PATH='/wasm/exo_foam_kernel.wasm'
let kernel=null
let pending=null
let lastError=null
const required=['exo_foam_abi_version','exo_foam_falloff','exo_foam_advance',
  'exo_foam_compression','exo_foam_velocity','exo_foam_memory',
  'exo_foam_displacement_cm','exo_foam_target_compression']

export const rustFoamReady=()=>Boolean(kernel)
export const rustFoamStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_foam_abi_version()??null,error:lastError})
export async function initializeRustFoamKernel({bytes,url=WASM_PATH}={}){
  if(kernel)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const wasm=bytes??await fetchWasmBytes(url, "Rust foam kernel HTTP ")
      const result=await WebAssembly.instantiate(wasm,{})
      const exports=result.instance?.exports??result.exports
      if(required.some(name=>typeof exports?.[name]!=='function') ||
        exports.exo_foam_abi_version()!==RUST_FOAM_ABI_VERSION)
        throw Error('Unexpected Rust foam ABI')
      kernel=exports
      lastError=null
      return true
    }catch(error){lastError=String(error?.message||error);return false}
    finally{pending=null}
  })()
  return pending
}

export const rustFoamFalloff=(distance,radius,softness)=>
  kernel?kernel.exo_foam_falloff(distance,radius,softness):null

/** All scalar inputs are finite, normalized and bounded by the public API. */
export function rustFoamStep({compression,velocity,memory,strength,pressure,falloff,
  seconds,depthCm,properties:p}){
  if(!kernel)return null
  const args=[compression,velocity,memory,strength,pressure,falloff,seconds,depthCm,
    p.densityKgM3,p.compressionKpa,p.recoverySeconds,p.dampingRatio,p.maxCompression,p.memory]
  if(!args.every(Number.isFinite))return null
  kernel.exo_foam_advance(...args)
  const result={compression:kernel.exo_foam_compression(),
    velocity:kernel.exo_foam_velocity(),memory:kernel.exo_foam_memory(),
    displacementCm:kernel.exo_foam_displacement_cm(),
    targetCompression:kernel.exo_foam_target_compression()}
  return Object.values(result).every(Number.isFinite)?result:null
}

if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustFoamKernel()
}
