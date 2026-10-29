export const RUST_TANGENT_DRAG_ABI_VERSION=1
let kernel=null,loading=null,error=null
export const rustTangentDragKernelReady=()=>Boolean(kernel)
export const rustTangentDragKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',abiVersion:kernel?.exo_tangent_drag_abi_version()??null,error})
export async function initializeRustTangentDragKernel({bytes,url='/wasm/exo_tangent_drag_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Tangent drag WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const mod=await WebAssembly.instantiate(raw,{})
      const exports=mod.instance?.exports??mod.exports
      if(exports.exo_tangent_drag_abi_version?.()!==1||typeof exports.exo_tangent_drag_component!=='function')throw Error('Unexpected tangent drag WASM ABI')
      kernel=exports;error=null;return true
    }catch(e){kernel=null;error=String(e?.message??e);return false}
    finally{loading=null}
  })()
  return loading
}
export function rustTangentDragDelta(delta,side){
  if(!Array.isArray(delta)||delta.length!==2||!delta.every(Number.isFinite)||!['in','out'].includes(side))return null
  if(kernel)return delta.map(v=>kernel.exo_tangent_drag_component(v,side==='in'?0:1))
  return delta.map(v=>v/(side==='in'?-.18:.18))
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustTangentDragKernel()
