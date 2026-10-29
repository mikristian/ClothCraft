import { fetchWasmBytes } from './wasmTransport.js'
// The synchronous freehand fitter falls back to its established JS operation
// until the WASM module is available and its ABI verified.
let kernel=null
let loading=null
let error=null
export const rustVectorFitKernelReady=()=>Boolean(kernel)
export const rustVectorFitKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',error})
export async function initializeRustVectorFitKernel({bytes,url='/wasm/exo_vector_fit_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "Vector fit WASM HTTP ")
      const instance=await WebAssembly.instantiate(raw,{})
      const exports=instance.instance?.exports??instance.exports
      if(exports?.exo_vector_fit_abi_version?.()!==1||typeof exports.exo_segment_error_squared!=='function')
        throw new Error('Unexpected EXO Rust vector fit ABI')
      kernel=exports
      error=null
      return true
    }catch(e){error=String(e?.message||e);return false}
    finally{loading=null}
  })()
  return loading
}
export function rustSegmentErrorSquared(p,a,b){
  if(!kernel)return null
  if(!p||!a||!b||!Number.isFinite(p.x)||!Number.isFinite(p.y)||
    !Number.isFinite(a.x)||!Number.isFinite(a.y)||
    !Number.isFinite(b.x)||!Number.isFinite(b.y))return null
  const squared=kernel.exo_segment_error_squared(p.x,p.y,a.x,a.y,b.x,b.y)
  return Number.isFinite(squared)&&squared>=0?squared:null
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustVectorFitKernel()
