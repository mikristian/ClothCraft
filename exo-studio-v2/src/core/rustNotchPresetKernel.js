export const RUST_NOTCH_PRESET_ABI_VERSION=1
let kernel=null,loading=null,error=null
export const rustNotchPresetKernelReady=()=>Boolean(kernel)
export const rustNotchPresetKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',abiVersion:kernel?.exo_notch_preset_abi_version()??null,error})
export async function initializeRustNotchPresetKernel({bytes,url='/wasm/exo_notch_preset_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{try{
    const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Notch preset WASM HTTP ${r.status}`);return r.arrayBuffer()})
    const mod=await WebAssembly.instantiate(raw,{})
    const exp=mod.instance?.exports??mod.exports
    if(exp.exo_notch_preset_abi_version?.()!==1||typeof exp.exo_notch_preset_count!=='function'||typeof exp.exo_notch_preset_t!=='function')throw Error('Unexpected notch preset WASM ABI')
    kernel=exp;error=null;return true
  }catch(e){kernel=null;error=String(e?.message??e);return false}finally{loading=null}})()
  return loading
}
export function rustTeeNotchFractions(panel,eligible,hasNotches){
  if(!eligible||hasNotches)return []
  const code=panel==='front'?1:panel==='back'?2:0
  if(!code)return []
  if(kernel){const count=kernel.exo_notch_preset_count(code,1,0);return Array.from({length:count},(_,i)=>kernel.exo_notch_preset_t(code,i))}
  return code===2?[.5125,.5475]:[.53]
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustNotchPresetKernel()
