import { fetchWasmBytes } from './wasmTransport.js'
/** Browser bridge for exo-ui-kernel. No JS geometry fallback: null means unavailable. */
export const RUST_POM_ABI_VERSION = 1
const DEFAULT_URL = '/wasm/exo_ui_kernel.wasm'
let exportsRef = null
let loading = null
let lastError = null

export const rustPomKernelReady = () => exportsRef !== null
export const rustPomKernelStatus = () => ({ready: rustPomKernelReady(), abiVersion: exportsRef?.exo_pom_abi_version() ?? null, error:lastError})

/** Appearance uses the same compiled native Rust/WASM UI kernel as the POM tools. */
export function rustUiThemeExports() {
  if (!exportsRef || typeof exportsRef.exo_theme_abi_version !== 'function' || exportsRef.exo_theme_abi_version() !== 1) return null
  const functions=['exo_theme_resolve_rgb','exo_theme_full_2d_nest_visible','exo_theme_glow_enabled']
  return functions.every(name=>typeof exportsRef[name]==='function') ? exportsRef : null
}

export async function initializeRustPomKernel({bytes, url = DEFAULT_URL} = {}) {
  if (exportsRef) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const wasm = bytes ?? await fetchWasmBytes(url, "POM WASM HTTP ")
      const instance = await WebAssembly.instantiate(wasm, {})
      const api = instance.instance?.exports ?? instance.exports
      if (['exo_pom_abi_version','exo_pom_label_x','exo_pom_label_y'].some(name => typeof api?.[name] !== 'function') || api.exo_pom_abi_version() !== RUST_POM_ABI_VERSION) {
        throw new Error('Unsupported POM WASM ABI')
      }
      exportsRef = api
      lastError = null
      return true
    } catch (error) {
      lastError = String(error?.message ?? error)
      return false
    } finally { loading = null }
  })()
  return loading
}

/** a,b: {x,y} SVG coordinates; positive normalOffset goes to the left of a->b.
 * Returns {x,y} or null for degenerate/invalid inputs or unavailable WASM.
 */
export function rustPomLabelAnchor(a,b,{normalOffset=0,dx=0,dy=0}={}) {
  if (!exportsRef || !a || !b) return null
  const args=[a.x,a.y,b.x,b.y,normalOffset,dx,dy]
  if (!args.every(Number.isFinite)) return null
  const x=exportsRef.exo_pom_label_x(...args)
  const y=exportsRef.exo_pom_label_y(...args)
  return Number.isFinite(x) && Number.isFinite(y) ? {x,y} : null
}

/** Null denotes unavailable native calculation or a non-crossing segment. */
export function rustPomHorizontalCrossing(a,b,y) {
  if (!exportsRef || typeof exportsRef.exo_pom_horizontal_crossing !== 'function' || !a || !b) return null
  const args=[a.x,a.y,b.x,b.y,y]
  if (!args.every(Number.isFinite)) return null
  const crossing=exportsRef.exo_pom_horizontal_crossing(...args)
  return Number.isFinite(crossing) ? crossing : null
}
