/** Synchronous ear-clipping bridge. The existing JS geometry path is used until initialization. */
const URL = '/wasm/exo_foam_triangulation_kernel.wasm'
let exports = null
let pending = null
let error = null
export const rustFoamTriangulationStatus = () => ({backend: exports ? 'rust-wasm' : 'javascript-fallback', error})
export async function initializeRustFoamTriangulationKernel({bytes, url = URL} = {}) {
  if (exports) return true
  if (pending) return pending
  pending = (async () => {
    try {
      const buffer = bytes ?? await fetch(url).then(r => {if (!r.ok) throw Error(`HTTP ${r.status}`); return r.arrayBuffer()})
      const result = await WebAssembly.instantiate(buffer, {})
      const module = result.instance?.exports ?? result.exports
      if (module.exo_foam_tri_abi_version?.() !== 1 || !module.memory ||
          ['exo_foam_tri_alloc', 'exo_foam_tri_free', 'exo_foam_tri_run'].some(key => typeof module[key] !== 'function')) throw Error('Foam triangulation ABI mismatch')
      exports = module
      error = null
      return true
    } catch (err) {error = String(err?.message || err); return false}
    finally {pending = null}
  })()
  return pending
}

export function rustFoamTriangulate(points) {
  if (!exports || !Array.isArray(points) || points.length < 3 || points.length > 5000 ||
      points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) return null
  const n = points.length, inputBytes = n * 16, outputBytes = (n - 2) * 12
  const input = exports.exo_foam_tri_alloc(inputBytes)
  const output = exports.exo_foam_tri_alloc(outputBytes)
  try {
    const view = new DataView(exports.memory.buffer)
    for (let i = 0; i < n; i++) {view.setFloat64(input + 16 * i, points[i][0], true); view.setFloat64(input + 16 * i + 8, points[i][1], true)}
    const length = exports.exo_foam_tri_run(input, n, output)
    if (length < 0) throw Error('TRIANGULATION_FAILED')
    if (length !== 3 * (n - 2)) throw Error('RUST_TRIANGULATION_ABI_ERROR')
    const result = []
    const out = new DataView(exports.memory.buffer)
    for (let i = 0; i < length; i++) result.push(out.getUint32(output + 4 * i, true))
    return result
  } finally {
    exports.exo_foam_tri_free(output, outputBytes)
    exports.exo_foam_tri_free(input, inputBytes)
  }
}

if (typeof window !== 'undefined' && typeof fetch === 'function' && typeof WebAssembly !== 'undefined') void initializeRustFoamTriangulationKernel()
