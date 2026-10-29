/** Visual optical numerical WASM. Never changes authored fabric/physics. */
export const RUST_TEXTILE_OPTICS_ABI_VERSION=1
let native=null,pending=null,error=null
const url='/wasm/exo_textile_optics_kernel.wasm'
export const rustTextileOpticsStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_textile_optics_abi_version()??null,error})
export async function initializeRustTextileOpticsKernel({bytes,wasmUrl=url}={}){
 if(native)return true
 if(pending)return pending
 pending=(async()=>{
  try{
   const raw=bytes??await fetch(wasmUrl).then(r=>{if(!r.ok)throw Error(`Textile WASM HTTP ${r.status}`);return r.arrayBuffer()})
   const instance=await WebAssembly.instantiate(raw,{env:{sin:Math.sin,cos:Math.cos,sqrt:Math.sqrt}})
   const api=instance.instance?.exports??instance.exports
   if(api.exo_textile_optics_abi_version?.()!==RUST_TEXTILE_OPTICS_ABI_VERSION||
    typeof api.exo_mesh_yarn_coverage!=='function'||typeof api.exo_optics_clamp!=='function')throw Error('Unexpected textile optics ABI')
   native=api;error=null;return true
  }catch(e){error=String(e?.message||e);return false}finally{pending=null}
 })()
 return pending
}
export function rustOpticsClamp(value,min,max){
 return native&&Number.isFinite(value)?native.exo_optics_clamp(value,min,max):Math.max(min,Math.min(max,value))
}
export function rustMeshYarnCoverage(topology,u,v){
 if(!native||![u,v].every(Number.isFinite))return null
 const type=topology==='tulle-net'?1:topology==='power-mesh'?2:topology==='athletic-mesh'?3:0
 return native.exo_mesh_yarn_coverage(type,u,v,Math.PI*2)
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustTextileOpticsKernel()
