import { fetchWasmBytes } from './wasmTransport.js'
export const RUST_MEASUREMENT_ABI_VERSION = 1
let kernel = null
let pending = null
let error = null
export const rustMeasurementKernelReady = () => !!kernel
export const rustMeasurementKernelStatus = () => ({ backend: kernel ? 'rust-wasm' : 'javascript-fallback', error })

export async function initializeRustMeasurementKernel({ bytes, url = '/wasm/exo_measurement_kernel.wasm' } = {}) {
  if (kernel) return true
  if (pending) return pending
  pending = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Measurement WASM HTTP ")
      const instantiated = await WebAssembly.instantiate(raw, {})
      const api = instantiated.instance?.exports ?? instantiated.exports
      if (!api?.memory || api.exo_measurement_abi_version?.() !== RUST_MEASUREMENT_ABI_VERSION ||
        !['exo_measurement_alloc', 'exo_measurement_free', 'exo_measurement_spans'].every(name => typeof api[name] === 'function'))
        throw new Error('Unexpected EXO measurement WASM ABI')
      kernel = api
      error = null
      return true
    } catch (cause) { error = String(cause?.message || cause); return false }
    finally { pending = null }
  })()
  return pending
}

function javascriptSpan(points, y) {
  // Track extrema incrementally: spreading a large cutline's intersections
  // into Math.min/Math.max overflows the JS argument stack.
  let minX = Infinity, maxX = -Infinity, intersectionCount = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    if (Math.abs(a.y - b.y) < 1e-6) {
      if (Math.abs(y - a.y) < 0.2) {
        minX = Math.min(minX, a.x, b.x)
        maxX = Math.max(maxX, a.x, b.x)
        intersectionCount += 2
      }
      continue
    }
    if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue
    const t = (y - a.y) / (b.y - a.y)
    const x = a.x + (b.x - a.x) * t
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    intersectionCount++
  }
  return intersectionCount < 2 ? 0 : maxX - minX
}

/** One WASM invocation handles every requested level across all sampled pieces. */
export function measureHorizontalSpans(batches) {
  const fallback = () => batches.map(batch => batch.levels.map(y => javascriptSpan(batch.points, y)))
  if (!kernel || !batches.length) return fallback()
  let inputSize = 0, outputSize = 0
  for (const { points, levels } of batches) {
    inputSize += 2 + levels.length + points.length * 2
    outputSize += levels.length
    if (points.length < 2 || levels.length < 1 ||
      !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) ||
      !levels.every(Number.isFinite)) return fallback()
  }
  if (!outputSize || inputSize > 1_000_000 || outputSize > 1_000_000) return fallback()
  let inputPtr = 0, outputPtr = 0
  try {
    const encoded = new Float64Array(inputSize)
    let cursor = 0
    for (const { points, levels } of batches) {
      encoded[cursor++] = levels.length
      encoded[cursor++] = points.length
      for (const y of levels) encoded[cursor++] = y
      for (const point of points) { encoded[cursor++] = point.x; encoded[cursor++] = point.y }
    }
    inputPtr = kernel.exo_measurement_alloc(inputSize)
    outputPtr = kernel.exo_measurement_alloc(outputSize)
    if (!inputPtr || !outputPtr) return fallback()
    new Float64Array(kernel.memory.buffer, inputPtr, inputSize).set(encoded)
    const result = kernel.exo_measurement_spans(inputPtr, inputSize, outputPtr, outputSize)
    if (result !== 1) return fallback()
    const decoded = Float64Array.from(new Float64Array(kernel.memory.buffer, outputPtr, outputSize))
    let at = 0
    return batches.map(batch => Array.from(decoded.slice(at, at += batch.levels.length)))
  } catch (cause) {
    error = String(cause?.message || cause)
    return fallback()
  } finally {
    if (outputPtr) kernel.exo_measurement_free(outputPtr, outputSize)
    if (inputPtr) kernel.exo_measurement_free(inputPtr, inputSize)
  }
}

if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined')
  void initializeRustMeasurementKernel()
