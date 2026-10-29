const WASM_PATH = '/wasm/exo_project_area_kernel.wasm'
let wasm = null
let pending = null
let lastError = null
export const rustProjectAreaStatus = () => ({backend:wasm?'rust-wasm':'javascript-fallback',error:lastError})
export async function initializeRustProjectAreaKernel({bytes,url=WASM_PATH}={}) {
  if(wasm)return true
  if(pending)return pending
  pending=(async()=>{
    try {
      const data=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.arrayBuffer()})
      const result=await WebAssembly.instantiate(data,{})
      const instance=result.instance?.exports??result.exports
      if(instance.exo_project_area_abi?.()!==1||!instance.memory||
         ['exo_project_area_alloc','exo_project_area_free','exo_project_area_signed'].some(k=>typeof instance[k]!=='function'))throw Error('Project area ABI mismatch')
      wasm=instance;lastError=null;return true
    }catch(e){lastError=String(e?.message||e);return false}
    finally{pending=null}
  })()
  return pending
}
export function rustSignedPolygonArea(points) {
  if(!wasm||!Array.isArray(points)||points.length<3||points.length>100000||
    points.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.y)))return null
  const bytes=points.length*16
  const ptr=wasm.exo_project_area_alloc(bytes)
  if(!ptr)return null
  try {
    const view=new DataView(wasm.memory.buffer)
    for(let i=0;i<points.length;i++){
      view.setFloat64(ptr+i*16,points[i].x,true)
      view.setFloat64(ptr+i*16+8,points[i].y,true)
    }
    const result=wasm.exo_project_area_signed(ptr,points.length)
    return Number.isFinite(result)?result:null
  }finally{wasm.exo_project_area_free(ptr,bytes)}
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustProjectAreaKernel()
