import { fetchWasmBytes } from './wasmTransport.js'
// Browser WASM keeps the synchronous sewing editor contract intact. The
// Javascript calculation remains the compatibility path until WASM loads.
export const RUST_SEAM_INTERVAL_ABI_VERSION=1
let kernel=null
let loading=null
let error=null
export const rustSeamIntervalKernelReady=()=>Boolean(kernel)
export const rustSeamIntervalKernelStatus=()=>({
  backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_seam_interval_abi_version()??null,error,
})
export async function initializeRustSeamIntervalKernel({bytes,url='/wasm/exo_seam_interval_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "Seam interval WASM HTTP ")
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(exports?.exo_seam_interval_abi_version?.()!==RUST_SEAM_INTERVAL_ABI_VERSION||
        typeof exports.exo_seam_interval_valid!=='function'||
        typeof exports.exo_seam_intervals_overlap!=='function')
        throw new Error('Unexpected EXO Rust seam interval ABI')
      kernel=exports;error=null;return true
    }catch(caught){
      kernel=null;error=String(caught?.message??caught);return false
    }finally{loading=null}
  })()
  return loading
}
export function rustSeamIntervalValid(start,end){
  return kernel?kernel.exo_seam_interval_valid(start,end)===1:
    Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end<=1&&start<end
}
export function rustSeamIntervalsOverlap(aStart,aEnd,bStart,bEnd,epsilon=1e-5){
  // Negative tolerance can make separated seam intervals appear overlapping.
  // Reject it consistently before either the WASM or JavaScript path runs.
  if(!Number.isFinite(epsilon)||epsilon<0)return false
  if(kernel)return kernel.exo_seam_intervals_overlap(aStart,aEnd,bStart,bEnd,epsilon)===1
  return rustSeamIntervalValid(aStart,aEnd)&&rustSeamIntervalValid(bStart,bEnd)&&
    Math.min(aEnd,bEnd)-Math.max(aStart,bStart)>epsilon
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustSeamIntervalKernel()
}
