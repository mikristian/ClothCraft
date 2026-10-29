import { fetchWasmBytes } from './wasmTransport.js'
/** Synchronous numerical bridge; loading failure leaves the JS fallback active. */
export const RUST_AUTO_FIT_PLACEMENT_ABI_VERSION=1
const WASM_PATH='/wasm/exo_auto_fit_placement_kernel.wasm'
let kernel=null, pending=null, lastError=null
const required=['exo_placement_abi_version','exo_placement_constrain','exo_placement_result']
export const rustAutoFitPlacementStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',error:lastError})
export async function initializeRustAutoFitPlacementKernel({bytes,url=WASM_PATH}={}){
  if(kernel)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const wasm=bytes??await fetchWasmBytes(url, "Rust placement kernel HTTP ")
      const result=await WebAssembly.instantiate(wasm,{env:{exo_host_hypot3:(x,y,z)=>Math.hypot(x,y,z)}})
      const exports=result.instance?.exports??result.exports
      if(required.some(name=>typeof exports?.[name]!=='function') ||
        exports.exo_placement_abi_version()!==RUST_AUTO_FIT_PLACEMENT_ABI_VERSION)
        throw Error('Unexpected Rust placement ABI')
      kernel=exports
      lastError=null
      return true
    }catch(error){lastError=String(error?.message||error);return false}
    finally{pending=null}
  })()
  return pending
}

export function rustAutoFitPlacement(values, limits, maximum) {
  if(!kernel)return null
  kernel.exo_placement_constrain(...values,...limits,maximum)
  const r=Array.from({length:9},(_,i)=>kernel.exo_placement_result(i))
  const requested={x:r[0],y:r[1],z:r[2]}
  const applied={x:r[3],y:r[4],z:r[5]}
  // JavaScript Math.hypot(x,y,z) uses a three-argument implementation;
  // Rust's chained hypot can differ by one or more ULPs.
  return {requested,applied,
    requestedMagnitudeM:Math.hypot(requested.x,requested.y,requested.z),
    appliedMagnitudeM:Math.hypot(applied.x,applied.y,applied.z),
    correctedMagnitudeM:Math.hypot(requested.x-applied.x,requested.y-applied.y,requested.z-applied.z)}
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustAutoFitPlacementKernel()
}
