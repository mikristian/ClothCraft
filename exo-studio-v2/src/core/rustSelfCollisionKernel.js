import { fetchWasmBytes } from './wasmTransport.js'
// Only pair scalars cross the WASM boundary. Traversal and vectors stay in JS.
let kernel = null
let loading = null
let error = null
let cachedPairView = null
let cachedPairPointer = -1
let cachedPairBuffer = null
export const rustSelfCollisionKernelStatus = () => ({backend: kernel ? 'rust-wasm' : 'javascript-fallback', error})
export async function initializeRustSelfCollisionKernel({bytes, url = '/wasm/exo_self_collision_kernel.wasm'} = {}) {
  if (kernel) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Self collision WASM HTTP ")
      const module = await WebAssembly.instantiate(raw, {})
      const exports = module.instance?.exports ?? module.exports
      if (exports.exo_self_collision_abi_version?.() !== 1 ||
          typeof exports.exo_self_collision_pair !== 'function' ||
          !(exports.memory instanceof WebAssembly.Memory)) throw new Error('Unexpected self collision ABI')
      kernel = exports
      cachedPairView = null
      cachedPairPointer = -1
      cachedPairBuffer = null
      error = null
      return true
    } catch (caught) {
      error = String(caught?.message ?? caught)
      return false
    } finally { loading = null }
  })()
  return loading
}
export function selfCollisionPairScalars(minimum, squared, wa, wb, a, b) {
  if (kernel) {
    const ptr = kernel.exo_self_collision_pair(minimum, squared, wa, wb, a, b)
    return Array.from(new Float64Array(kernel.memory.buffer, ptr, 7))
  }
  const distance = Math.sqrt(Math.max(squared, 1e-6))
  const penetration = minimum - distance
  const active = !(wa + wb <= 1e-6)
  if (active && a !== b && wa > 0 && wb > 0) {
    if (a > b) { wa = 0.9; wb = 0.1 }
    else { wa = 0.1; wb = 0.9 }
  }
  const total = wa + wb
  return [distance, penetration, wa, wb, -penetration * (wa / total), penetration * (wb / total), active ? 1 : 0]
}

// Allocation-free contact hot path. The existing array-returning public
// function remains unchanged for callers that retain results between calls.
// The owner must provide an independent seven-slot buffer and consume it
// before reusing it for another pair. Native output is copied immediately:
// Rust ABI v1 returns the same global scratch slot for every invocation.
export function selfCollisionPairScalarsInto(out, minimum, squared, wa, wb, a, b) {
  if (kernel) {
    try {
      const ptr = kernel.exo_self_collision_pair(minimum, squared, wa, wb, a, b)
      const buffer = kernel.memory.buffer
      // ABI v1 returns a single reused 7-f64 static slot. Keep one JS view
      // instead of allocating a new typed-array view per contact. Recheck
      // pointer and buffer every time because memory growth detaches views.
      if (!Number.isSafeInteger(ptr) || ptr < 0 || ptr % 8 !== 0 ||
          ptr > buffer.byteLength - 7 * Float64Array.BYTES_PER_ELEMENT) {
        throw new RangeError('Invalid self-collision WASM result pointer')
      }
      if (buffer !== cachedPairBuffer || ptr !== cachedPairPointer || !cachedPairView) {
        cachedPairView = new Float64Array(buffer, ptr, 7)
        cachedPairBuffer = buffer
        cachedPairPointer = ptr
      }
      for (let i = 0; i < 7; i += 1) out[i] = cachedPairView[i]
      return out
    } catch (caught) {
      // A pair-level WASM trap must not corrupt or stop an in-flight garment
      // frame. Disable the faulty backend before applying this pair's numeric
      // correction; fall through to the independent JS scalar policy below.
      error = `Self-collision WASM pair fallback: ${String(caught?.message ?? caught)}`
      kernel = null
      cachedPairView = null
      cachedPairPointer = -1
      cachedPairBuffer = null
    }
  }
  const distance = Math.sqrt(Math.max(squared, 1e-6))
  const penetration = minimum - distance
  const active = !(wa + wb <= 1e-6)
  if (active && a !== b && wa > 0 && wb > 0) {
    if (a > b) { wa = 0.9; wb = 0.1 }
    else { wa = 0.1; wb = 0.9 }
  }
  const total = wa + wb
  out[0] = distance
  out[1] = penetration
  out[2] = wa
  out[3] = wb
  out[4] = -penetration * (wa / total)
  out[5] = penetration * (wb / total)
  out[6] = active ? 1 : 0
  return out
}
if (typeof window !== 'undefined' && typeof fetch === 'function' && typeof WebAssembly !== 'undefined') {
  void initializeRustSelfCollisionKernel()
}
