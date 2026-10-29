import { fetchWasmBytes } from './wasmTransport.js'
/** Numeric predicates only. Report strings and sampled physical boundaries stay in JS. */
let native = null
let loading = null
export const rustPreflightKernelReady = () => Boolean(native)
export async function initializeRustPreflightKernel({ bytes, url = '/wasm/exo_preflight_kernel.wasm' } = {}) {
  if (native) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const data = bytes ?? await fetchWasmBytes(url, "Preflight WASM HTTP ")
      const result = await WebAssembly.instantiate(data, {})
      const api = result.instance?.exports ?? result.exports
      if (api.exo_preflight_abi_version?.() !== 1 || typeof api.exo_preflight_check !== 'function' || typeof api.exo_preflight_status !== 'function') return false
      native = api
      return true
    } catch { return false }
    finally { loading = null }
  })()
  return loading
}

export function preflightStatus(blockers, warnings) {
  const status = native ? native.exo_preflight_status(blockers, warnings) : blockers ? 2 : warnings ? 1 : 0
  return ['STRUCTURAL_CHECK_PASS', 'REVIEW', 'BLOCKED'][status]
}

export function preflightCheck(op, a, b = 0, c = 0) {
  if (native) return native.exo_preflight_check(op, a, b, c) === 1
  switch (op) {
    case 0: return Number.isFinite(a)
    case 1: return Number.isInteger(a) && a >= 1 && a <= 99
    case 2: return Number.isFinite(a) && a >= 0
    case 3: return a < 0.05 || !Number.isFinite(a)
    case 4: return a < 0.1
    case 5: return Number.isInteger(a) && a >= 0 && a < b
    case 6: return Number.isFinite(a) && a >= 0 && a <= 1
    case 7: return !Number.isFinite(a) || b <= 0 || c <= 0
    case 8: return !Number.isFinite(a) || !Number.isFinite(b)
    case 9: return a !== 1
    default: return false
  }
}
if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof fetch === 'function') void initializeRustPreflightKernel()
