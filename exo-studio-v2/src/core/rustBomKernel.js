/** Typed BOM serialization ABI. JS retains its public coercion/decimal rules. */
const tags = ['GarmentStudioBOM', 'Fabrics', 'Fabric', 'Pattern', 'TrimsAndConstruction', 'Trim', 'FabricCostEstimates', 'EstimatedFabricCost']
let api = null
let loading = null
export async function initializeRustBomKernel({ bytes, url = '/wasm/exo_bom_kernel.wasm' } = {}) {
  if (api) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const source = bytes ?? await fetch(url).then(r => { if (!r.ok) throw Error(r.status); return r.arrayBuffer() })
      const result = await WebAssembly.instantiate(source, {})
      const candidate = (result.instance ?? result).exports
      if (candidate.exo_bom_abi_version() !== 1 || !['exo_bom_alloc', 'exo_bom_free', 'exo_bom_export'].every(k => typeof candidate[k] === 'function') || !candidate.memory) return false
      api = candidate
      return true
    } catch { return false } finally { loading = null }
  })()
  return loading
}
export const rustBomKernelReady = () => api !== null
export function rustBomXml(root) {
  if (!api) return null
  let input = 0, output = 0, size = 0, length = 0
  try {
    const chunks = [], encoder = new TextEncoder()
    const number = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); chunks.push(b) }
    const string = value => { const text = String(value ?? ''); const b = encoder.encode(text); if (new TextDecoder().decode(b) !== text) throw Error('Non UTF-8 string'); number(b.length); chunks.push(b) }
    const node = value => {
      const tag = tags.indexOf(value.name)
      if (tag < 0) throw Error('Unknown BOM element')
      number(tag)
      const entries = Object.entries(value.attributes)
      number(entries.length)
      for (const [k, v] of entries) { string(k); string(v) }
      number(value.children.length)
      value.children.forEach(node)
    }
    node(root)
    length = chunks.reduce((sum, b) => sum + b.length, 0)
    input = api.exo_bom_alloc(length)
    const memory = new Uint8Array(api.memory.buffer)
    let offset = input
    for (const b of chunks) { memory.set(b, offset); offset += b.length }
    size = api.exo_bom_export(input, length, 0, 0)
    if (!size) return null
    output = api.exo_bom_alloc(size)
    if (api.exo_bom_export(input, length, output, size) !== size) return null
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(api.memory.buffer, output, size))
  } catch { return null } finally {
    if (output) api.exo_bom_free(output, size)
    if (input) api.exo_bom_free(input, length)
  }
}
