/** Synchronous scalar staging numerics; Three geometry and authored data remain in JS. */
export const RUST_STAGING_ABI_VERSION=1
let kernel=null,pending=null,lastError=null
export const rustStagingStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',error:lastError})
export async function initializeRustStagingKernel({bytes,url='/wasm/exo_staging_kernel.wasm'}={}){
  if(kernel)return true
  if(pending)return pending
  pending=(async()=>{try{
    const wasm=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Rust staging HTTP ${r.status}`);return r.arrayBuffer()})
    const result=await WebAssembly.instantiate(wasm,{env:{exo_host_sin:Math.sin,exo_host_cos:Math.cos}})
    const exports=result.instance?.exports??result.exports
    if(['exo_staging_abi_version','exo_staging_cylinder','exo_staging_result','exo_staging_blend'].some(n=>typeof exports?.[n]!=='function')||exports.exo_staging_abi_version()!==RUST_STAGING_ABI_VERSION)throw Error('Unexpected Rust staging ABI')
    kernel=exports;lastError=null;return true
  }catch(error){lastError=String(error?.message||error);return false}finally{pending=null}})()
  return pending
}
export function rustStagingCylinder(localX,halfWidth,scale,xOffset,zOffset,direction){
  if(!kernel)return null
  kernel.exo_staging_cylinder(localX,halfWidth,scale,xOffset,zOffset,direction)
  return [kernel.exo_staging_result(0),kernel.exo_staging_result(1)]
}
export function rustStagingBlend(a,b,t){return kernel?kernel.exo_staging_blend(a,b,t):null}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustStagingKernel()
