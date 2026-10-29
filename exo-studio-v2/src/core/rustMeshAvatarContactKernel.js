import { fetchWasmBytes } from './wasmTransport.js'
let native = null
let loading = null
let error = null

export const rustMeshAvatarContactStatus = () => ({ backend: native ? 'rust-wasm' : 'javascript-fallback', error })

export async function initializeRustMeshAvatarContactKernel({ bytes, url = '/wasm/exo_mesh_avatar_contact_kernel.wasm' } = {}) {
  if (native) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const data = bytes ?? await fetchWasmBytes(url, "Mesh avatar contact WASM HTTP ")
      const result = await WebAssembly.instantiate(data, {})
      const exports = result.instance?.exports ?? result.exports
      if (['exo_mesh_contact_abi_version', 'exo_mesh_contact_intrusion', 'exo_mesh_contact_direction_scale', 'exo_mesh_contact_correction'].some(k => typeof exports?.[k] !== 'function') || exports.exo_mesh_contact_abi_version() !== 1) throw Error('Unexpected mesh contact WASM ABI')
      native = exports
      error = null
      return true
    } catch (caught) {
      error = String(caught?.message ?? caught)
      return false
    } finally { loading = null }
  })()
  return loading
}

export const meshContactIntrusion = (distance, clearance, inside) => native ? native.exo_mesh_contact_intrusion(distance, clearance, inside ? 1 : 0) : inside ? distance + clearance : clearance - distance
export const meshContactDirectionScale = (distance, inside) => native ? native.exo_mesh_contact_direction_scale(distance, inside ? 1 : 0) : distance > 1e-8 ? (inside ? -1 : 1) / distance : 0
export const meshContactCorrection = (limit, intrusion) => native ? native.exo_mesh_contact_correction(limit, intrusion) : Math.min(limit, intrusion)

if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof fetch === 'function') void initializeRustMeshAvatarContactKernel()
