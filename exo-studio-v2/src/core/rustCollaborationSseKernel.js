import { fetchWasmBytes } from './wasmTransport.js'
// A complete SSE block is parsed synchronously; the stream framing and JSON
// delivery remain with the collaboration client.
export const RUST_COLLABORATION_SSE_ABI_VERSION = 1
let kernel = null
let loading = null
let error = null
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export function parseCollaborationSseBlockJs(block) {
  const lines = block.split('\n')
  return {
    type: lines.find(line => line.startsWith('event:'))?.slice(6).trim() || 'message',
    wire: lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n'),
  }
}

export const rustCollaborationSseKernelReady = () => Boolean(kernel)
export const rustCollaborationSseKernelStatus = () => ({backend: kernel ? 'rust-wasm' : 'javascript-fallback', abiVersion: kernel ? RUST_COLLABORATION_SSE_ABI_VERSION : null, error})

export async function initializeRustCollaborationSseKernel({bytes,url='/wasm/exo_collaboration_sse_kernel.wasm'}={}) {
  if (kernel) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Collaboration SSE WASM HTTP ")
      const result = await WebAssembly.instantiate(raw, {})
      const exports = result.instance?.exports ?? result.exports
      if (exports.exo_collaboration_sse_abi_version?.() !== RUST_COLLABORATION_SSE_ABI_VERSION ||
          typeof exports.exo_collaboration_sse_alloc !== 'function' ||
          typeof exports.exo_collaboration_sse_dealloc !== 'function' ||
          typeof exports.exo_collaboration_sse_parse !== 'function' ||
          typeof exports.exo_collaboration_sse_data_length !== 'function' ||
          !(exports.memory instanceof WebAssembly.Memory)) throw Error('Unexpected collaboration SSE WASM ABI')
      kernel = exports
      error = null
      return true
    } catch (cause) {
      kernel = null
      error = String(cause?.message ?? cause)
      return false
    } finally { loading = null }
  })()
  return loading
}

export function parseCollaborationSseBlock(block) {
  if (!kernel) return parseCollaborationSseBlockJs(block)
  const input = encoder.encode(block)
  const capacity = input.length + 16
  let inputPtr = 0
  let outputPtr = 0
  try {
    inputPtr = kernel.exo_collaboration_sse_alloc(input.length || 1)
    if (!inputPtr) throw Error('Unable to allocate SSE input')
    outputPtr = kernel.exo_collaboration_sse_alloc(capacity)
    if (!outputPtr) throw Error('Unable to allocate SSE output')
    new Uint8Array(kernel.memory.buffer, inputPtr, input.length).set(input)
    // Return the two lengths independently to avoid i64 BigInt ABI coupling.
    const eventLength = kernel.exo_collaboration_sse_parse(inputPtr, input.length, outputPtr, capacity)
    const dataLength = kernel.exo_collaboration_sse_data_length()
    if (!Number.isInteger(eventLength) || !Number.isInteger(dataLength) ||
        eventLength < 0 || dataLength < 0 || eventLength + dataLength > capacity) throw Error('Invalid SSE kernel result')
    const bytes = new Uint8Array(kernel.memory.buffer, outputPtr, eventLength + dataLength)
    return {type: decoder.decode(bytes.subarray(0,eventLength)), wire: decoder.decode(bytes.subarray(eventLength))}
  } catch (cause) {
    error = String(cause?.message ?? cause)
    return parseCollaborationSseBlockJs(block)
  } finally {
    // A malformed module can trap during cleanup. Never let cleanup replace
    // either a parsed event or the synchronous JS fallback.
    const activeKernel = kernel
    for (const [pointer, length] of [[outputPtr, capacity], [inputPtr, input.length || 1]]) {
      if (!pointer) continue
      try { activeKernel.exo_collaboration_sse_dealloc(pointer, length) }
      catch (cause) {
        error = `Collaboration SSE deallocation failed: ${String(cause?.message ?? cause)}`
        kernel = null
      }
    }
  }
}
