import { fetchWasmBytes } from './wasmTransport.js'
/** Rust/WASM greedy fabric marker packing. The surrounding editor keeps the
 * original synchronous API and uses its JavaScript path during startup.
 */
export const RUST_MARKER_ABI_VERSION = 1
const URL = '/wasm/exo_marker_kernel.wasm'
const required = ['exo_marker_abi_version', 'exo_marker_alloc_f64',
  'exo_marker_free_f64', 'exo_marker_pack']
let native = null
let loading = null
let lastError = null

export const rustMarkerKernelReady = () => Boolean(native)
export function rustMarkerNormalizedRotation(value) {
  let rotation=Number(value||0)%360
  if(native?.exo_marker_normalized_rotation) return native.exo_marker_normalized_rotation(Number(value||0))
  if(rotation>180)rotation-=360
  if(rotation<=-180)rotation+=360
  return rotation
}
export function rustMarkerRotatePoint(point,degrees) {
  if(native?.exo_marker_rotate_x&&native?.exo_marker_rotate_y)return {
    x:native.exo_marker_rotate_x(point.x,point.y,degrees),
    y:native.exo_marker_rotate_y(point.x,point.y,degrees),
  }
  const radians=degrees*Math.PI/180,cosine=Math.cos(radians),sine=Math.sin(radians)
  return {x:point.x*cosine-point.y*sine,y:point.x*sine+point.y*cosine}
}
export const rustMarkerKernelStatus = () => ({
  backend: native ? 'rust-wasm' : 'javascript-fallback',
  abiVersion: native?.exo_marker_abi_version() ?? null,
  error: lastError,
})

export async function initializeRustMarkerKernel({ bytes, url = URL } = {}) {
  if (native) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const data = bytes ?? await fetchWasmBytes(url, "Marker WASM HTTP ")
      const instantiated = await WebAssembly.instantiate(data, {})
      const api = instantiated.instance?.exports ?? instantiated.exports
      if (!api?.memory || required.some(key => typeof api[key] !== 'function') ||
          api.exo_marker_abi_version() !== RUST_MARKER_ABI_VERSION) {
        throw new Error('Unexpected EXO marker WASM ABI')
      }
      native = api
      lastError = null
      return true
    } catch (error) {
      native = null
      lastError = String(error?.message || error)
      return false
    } finally { loading = null }
  })()
  return loading
}

/** Returns a placement (or null) for each already-sorted piece instance.
 * Returns null for the entire layout if WASM is unavailable or unsupported.
 */
export function rustMarkerPlacements(entries, fabricWidth, gap) {
  if (!native || !Array.isArray(entries) || !Number.isFinite(fabricWidth) ||
      fabricWidth <= 0 || !Number.isFinite(gap) || gap < 0) return null
  if (entries.length === 0) return []

  const encoded = []
  for (const entry of entries) {
    const options = entry?.options
    if (!Array.isArray(options) || options.length < 1 || options.length > 1000) return null
    encoded.push(options.length)
    for (const option of options) {
      if (![option?.width, option?.height].every(value => Number.isFinite(value) && value >= 0)) return null
      encoded.push(option.width, option.height)
    }
  }
  const inputSize = encoded.length
  const outputSize = entries.length * 5
  if (inputSize > 1_000_000 || outputSize > 1_000_000) return null
  let inputPtr = 0
  let outputPtr = 0
  try {
    inputPtr = native.exo_marker_alloc_f64(inputSize)
    outputPtr = native.exo_marker_alloc_f64(outputSize)
    if (!inputPtr || !outputPtr) return null
    new Float64Array(native.memory.buffer, inputPtr, inputSize).set(encoded)
    const result = native.exo_marker_pack(inputPtr, inputSize, outputPtr, outputSize,
      fabricWidth, gap)
    if (result !== 1) return null
    const values = new Float64Array(native.memory.buffer, outputPtr, outputSize)
    return entries.map((entry, index) => {
      const offset = index * 5
      const optionIndex = values[offset + 4]
      if (Number.isNaN(optionIndex)) return null
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= entry.options.length) {
        return null
      }
      return { x: values[offset], y: values[offset + 1], option: entry.options[optionIndex] }
    })
  } catch (error) {
    lastError = `Marker WASM execution: ${String(error?.message || error)}`
    return null
  } finally {
    if (outputPtr) native.exo_marker_free_f64(outputPtr, outputSize)
    if (inputPtr) native.exo_marker_free_f64(inputPtr, inputSize)
  }
}

if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' &&
    typeof fetch === 'function') void initializeRustMarkerKernel()

/** Synchronous page mapping; older WASM builds keep the JS fallback. */
export function markerPdfCoordinates(points, heightCm, startCm) {
  const fallback = () => points.map(point => ({
    x: point.x * (72 / 2.54),
    y: (heightCm - (point.y - startCm)) * (72 / 2.54),
  }))
  const len = points.length * 2
  if (!native?.exo_marker_page_coordinates || !len || len > 1_000_000) return fallback()
  let ptr = 0
  try {
    ptr = native.exo_marker_alloc_f64(len)
    if (!ptr) return fallback()
    const input = new Float64Array(native.memory.buffer, ptr, len)
    points.forEach((point, i) => { input[i * 2] = point.x; input[i * 2 + 1] = point.y })
    if (native.exo_marker_page_coordinates(ptr, len, heightCm, startCm) !== 1) return fallback()
    const output = new Float64Array(native.memory.buffer, ptr, len)
    return points.map((_, i) => ({ x: output[i * 2], y: output[i * 2 + 1] }))
  } catch (error) {
    lastError = `Marker coordinate WASM execution: ${String(error?.message || error)}`
    return fallback()
  } finally {
    if (ptr) native.exo_marker_free_f64(ptr, len)
  }
}
