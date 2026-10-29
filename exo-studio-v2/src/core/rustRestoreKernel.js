export const RUST_RESTORE_ABI_VERSION=1
let kernel=null
export const rustRestoreStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback'})
export async function initializeRustRestoreKernel({bytes,url='/wasm/exo_restore_kernel.wasm'}={}){
  try{
    const data=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error('Restore WASM unavailable');return r.arrayBuffer()})
    const module=await WebAssembly.instantiate(data,{})
    const native=module.instance?.exports??module.exports
    if(native.exo_restore_abi_version?.()!==RUST_RESTORE_ABI_VERSION||typeof native.exo_restore_shape!=='function')return false
    kernel=native
    return true
  }catch{return false}
}
export function restoreShapeCode(project){
  const root=Boolean(project&&typeof project==='object'&&!Array.isArray(project))
  const pieces=Array.isArray(project?.pieces),seams=Array.isArray(project?.seams)
  if(kernel)return kernel.exo_restore_shape(Number(root),Number(pieces),Number(seams))
  return !root?1:!pieces||!seams?2:0
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustRestoreKernel()
