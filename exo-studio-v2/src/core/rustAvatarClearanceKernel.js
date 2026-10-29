import { fetchWasmBytes } from './wasmTransport.js'
/** Scalar numerical clearance only. Avatar policy and THREE objects stay in JS. */
let kernel = null
let loading = null
let error = null
let calls = 0
export const rustAvatarClearanceKernelStatus = () => ({
  backend: kernel ? 'rust-wasm' : 'javascript-fallback', abiVersion: kernel ? 1 : null, calls, error,
})
export async function initializeRustAvatarClearanceKernel({bytes, url='/wasm/exo_avatar_clearance_kernel.wasm'}={}) {
  if (kernel) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Avatar clearance WASM HTTP ")
      const module = await WebAssembly.instantiate(raw, {})
      const e = module.instance?.exports ?? module.exports
      if (typeof e.exo_avatar_clearance_abi_version !== 'function' ||
          e.exo_avatar_clearance_abi_version() !== 1 ||
          typeof e.exo_ellipsoid_clearance !== 'function' ||
          typeof e.exo_capsule_clearance !== 'function') throw new Error('Unexpected avatar clearance ABI')
      kernel = e
      error = null
      return true
    } catch (caught) {
      error = String(caught?.message ?? caught)
      return false
    } finally { loading = null }
  })()
  return loading
}
function evaluate(name, args) {
  if (!kernel || !args.every(Number.isFinite)) return null
  const value = kernel[name](...args)
  calls++
  return Number.isFinite(value) ? value : null
}
export function rustEllipsoidClearance(p, c, r) {
  return evaluate('exo_ellipsoid_clearance', [p.x,p.y,p.z,c.x,c.y,c.z,r.x,r.y,r.z])
}
export function rustCapsuleClearance(p, pose) {
  const c=pose.center, a=pose.axis
  return evaluate('exo_capsule_clearance', [p.x,p.y,p.z,c.x,c.y,c.z,a.x,a.y,a.z,pose.halfLength,pose.radius])
}
if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof fetch === 'function') {
  void initializeRustAvatarClearanceKernel()
}
