import { fetchWasmBytes } from './wasmTransport.js'
// Synchronous numeric adapter. Report validation and policy stay in meshQuality.js.
let kernel = null
let loading = null
let error = null
export const rustMeshQualityKernelStatus = () => ({backend: kernel ? 'rust-wasm' : 'javascript-fallback', error})
export async function initializeRustMeshQualityKernel({bytes, url='/wasm/exo_mesh_quality_kernel.wasm'}={}) {
  if (kernel) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Rust mesh quality WASM HTTP ")
      const {instance} = await WebAssembly.instantiate(raw, {env:{hypot:Math.hypot}})
      const exports = instance.exports
      if (typeof exports.exo_triangle_quality !== 'function' ||
          typeof exports.exo_mesh_quality_abi_version !== 'function' ||
          exports.exo_mesh_quality_abi_version() !== 1 || !(exports.memory instanceof WebAssembly.Memory)) {
        throw new Error('Unexpected EXO Rust mesh quality ABI')
      }
      kernel = exports
      error = null
      return true
    } catch (caught) {
      error = String(caught?.message ?? caught)
      return false
    } finally { loading = null }
  })()
  return loading
}
export function rustTriangleQuality(ax,ay,bx,by,cx,cy) {
  if (!kernel) return null
  const ptr = kernel.exo_triangle_quality(ax,ay,bx,by,cx,cy)
  return Array.from(new Float64Array(kernel.memory.buffer,ptr,4))
}
if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof fetch === 'function') {
  void initializeRustMeshQualityKernel()
}
