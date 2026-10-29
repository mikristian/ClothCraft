import { fetchWasmBytes } from './wasmTransport.js'
/** Reset-preview numerical arc only; all snapshot and solver state stays in JS. */
export const RUST_PRE_DRAPE_CURVATURE_ABI_VERSION = 1
let kernel = null, pending = null, lastError = null
export const rustPreDrapeCurvatureStatus = () => ({backend:kernel ? 'rust-wasm' : 'javascript-fallback',error:lastError})
export async function initializeRustPreDrapeCurvatureKernel({bytes,url='/wasm/exo_pre_drape_curvature_kernel.wasm'}={}) {
  if (kernel) return true
  if (pending) return pending
  pending = (async () => {
    try {
      const wasm = bytes ?? await fetchWasmBytes(url, "Rust pre-drape curvature kernel HTTP ")
      const result = await WebAssembly.instantiate(wasm,{env:{exo_host_sin:Math.sin,exo_host_cos:Math.cos}})
      const exports = result.instance?.exports ?? result.exports
      if (['exo_pre_drape_abi_version','exo_pre_drape_arc','exo_pre_drape_result'].some(name=>typeof exports?.[name]!=='function') ||
          exports.exo_pre_drape_abi_version()!==RUST_PRE_DRAPE_CURVATURE_ABI_VERSION) throw Error('Unexpected Rust curvature ABI')
      kernel=exports
      lastError=null
      return true
    } catch (error) { lastError=String(error?.message||error); return false }
    finally {pending=null}
  })()
  return pending
}
export function rustPreDrapeArc(coord,center,width,radius,halfAngle,sign,towardBody) {
  if (!kernel) return null
  kernel.exo_pre_drape_arc(coord,center,width,radius,halfAngle,sign,towardBody)
  return [kernel.exo_pre_drape_result(0),kernel.exo_pre_drape_result(1)]
}
if (typeof window!=='undefined' && typeof fetch==='function' && typeof WebAssembly!=='undefined') {
  void initializeRustPreDrapeCurvatureKernel()
}
