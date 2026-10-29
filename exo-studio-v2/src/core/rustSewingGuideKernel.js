import { fetchWasmBytes } from './wasmTransport.js'
// Keep the existing synchronous editor contract while Rust WASM loads.
export const RUST_SEWING_GUIDE_ABI_VERSION=1
let kernel=null
let loading=null
let error=null

export const rustSewingGuideKernelReady=()=>Boolean(kernel)
export const rustSewingGuideKernelStatus=()=>({
  backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_sewing_guide_abi_version()??null,error,
})

export async function initializeRustSewingGuideKernel({bytes,url='/wasm/exo_sewing_guide_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "Sewing guide WASM HTTP ")
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(exports?.exo_sewing_guide_abi_version?.()!==RUST_SEWING_GUIDE_ABI_VERSION||
        typeof exports.exo_sewing_guide_index!=='function')
        throw new Error('Unexpected EXO Rust sewing guide ABI')
      kernel=exports;error=null;return true
    }catch(caught){
      kernel=null;error=String(caught?.message??caught);return false
    }finally{loading=null}
  })()
  return loading
}

export function rustSampleSewingGuideIndices(count,emphasized=false){
  if(!Number.isSafeInteger(count)||count<=0)return []
  const size=Math.min(count,emphasized?48:12)
  if(size===1)return [0]
  // Rust computes the exact sampled index. The JS path remains available
  // during loading, for unsupported browsers, or after a failed fetch.
  if(kernel)return Array.from({length:size},(_,i)=>kernel.exo_sewing_guide_index(count,size,i))
  return Array.from({length:size},(_,i)=>Math.round(i*(count-1)/(size-1)))
}

if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustSewingGuideKernel()
}
