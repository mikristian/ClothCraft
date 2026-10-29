import { fetchWasmBytes } from './wasmTransport.js'
let kernel=null
let loading=null

export const rustPreflightCrossingReady=()=>kernel!==null

export async function initializeRustPreflightCrossingKernel({bytes,url='/wasm/exo_preflight_crossing_kernel.wasm'}={}) {
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const payload=bytes??await fetchWasmBytes(url, "Preflight crossing WASM HTTP ")
      const instance=await WebAssembly.instantiate(payload,{})
      const api=instance.instance?.exports??instance.exports
      if(api?.exo_preflight_crossing_abi_version?.()!==1||!api.memory||
        ['exo_preflight_crossing_alloc','exo_preflight_crossing_free','exo_preflight_crossing_check'].some(n=>typeof api[n]!=='function'))
        throw Error('Unsupported preflight crossing WASM ABI')
      kernel=api
      return true
    }catch{return false}finally{loading=null}
  })()
  return loading
}

// Null signals that the caller must run its original synchronous JS implementation.
export function rustHasCrossing(points) {
  if(!kernel||!Array.isArray(points)||points.length>1000000)return null
  const words=Math.max(1,points.length*2)
  const ptr=kernel.exo_preflight_crossing_alloc(words)
  if(!ptr)return null
  try{
    const memory=new Float64Array(kernel.memory.buffer,ptr,words)
    for(let i=0;i<points.length;i++){
      const p=points[i]
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null
      memory[2*i]=p.x
      memory[2*i+1]=p.y
    }
    const result=kernel.exo_preflight_crossing_check(ptr,points.length)
    return result<0?null:result===1
  }finally{kernel.exo_preflight_crossing_free(ptr,words)}
}
