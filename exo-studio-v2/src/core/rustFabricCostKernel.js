import { fetchWasmBytes } from './wasmTransport.js'
/** Batched Rust costing for already-built garment markers, with synchronous JS fallback. */
export const RUST_FABRIC_COST_ABI_VERSION = 1
const WASM_URL = '/wasm/exo_fabric_cost_kernel.wasm'
const REQUIRED = ['exo_fabric_cost_abi_version', 'exo_fabric_cost_alloc',
  'exo_fabric_cost_free', 'exo_fabric_cost_calculate']
let native = null
let loading = null
let lastError = null

export const rustFabricCostKernelReady = () => native !== null
export const rustFabricCostKernelStatus = () => ({
  backend: native ? 'rust-wasm' : 'javascript-fallback',
  abiVersion: native?.exo_fabric_cost_abi_version() ?? null, error: lastError,
})

export async function initializeRustFabricCostKernel({ bytes, url = WASM_URL } = {}) {
  if (native) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Fabric cost WASM HTTP ")
      const module = await WebAssembly.instantiate(raw, {})
      const api = module.instance?.exports ?? module.exports
      if (!api?.memory || REQUIRED.some(name => typeof api[name] !== 'function') ||
          api.exo_fabric_cost_abi_version() !== RUST_FABRIC_COST_ABI_VERSION) {
        throw new Error('Unexpected EXO fabric cost WASM ABI')
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

function round4(value) { return Number(value.toFixed(4)) }

function jsCost(rows, groups) {
  const calculated = rows.map(row => {
    const complete = row.unused === 0 && row.placed === row.requested
    const status = !complete ? 'INCOMPLETE_MARKER' : row.price === null ? 'PRICE_NOT_SET' : 'ESTIMATED'
    return { complete, status, extendedCost: status === 'ESTIMATED' ? round4(row.lengthMeters * row.price) : null }
  })
  const totals = groups.map(group => {
    const entries = calculated.slice(group.start, group.start + group.count)
    const ready = entries.length > 0 && entries.every(row => row.status === 'ESTIMATED')
    return { ready, materialCost: ready ? round4(entries.reduce((sum, row) => sum + row.extendedCost, 0)) : null }
  })
  return { calculated, totals }
}

function safeForWasm(rows, groups) {
  if (!native || !rows.length || !groups.length || rows.length * 5 > 1_000_000 ||
      groups.length * 2 > 1_000_000) return false
  for (const row of rows) {
    if (![row.lengthMeters, row.requested, row.placed, row.unused].every(Number.isFinite) ||
        row.lengthMeters < 0 || row.lengthMeters > Number.MAX_SAFE_INTEGER / 100 ||
        (row.price !== null && (!Number.isFinite(row.price) || row.price < 0))) return false
    if (row.price !== null && row.unused === 0 && row.placed === row.requested) {
      const cost = row.lengthMeters * row.price
      if (!Number.isFinite(cost) || !Number.isFinite(cost * 10000)) return false
      // Binary half-way boundaries can round differently from decimal toFixed.
      // Keep JS semantics for these rare cases.
      const scaled = cost * 10000
      if (Math.abs(scaled - Math.trunc(scaled) - 0.5) < 0.000001) return false
    }
  }
  return groups.every(group => Number.isInteger(group.start) && Number.isInteger(group.count) &&
    group.start >= 0 && group.count >= 0 && group.start + group.count <= rows.length)
}

/** One single WASM call for all fabric rows and size totals. */
export function calculateFabricCosts(rows, groups) {
  if (!safeForWasm(rows, groups)) return jsCost(rows, groups)
  const input = new Float64Array(rows.length * 5)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], offset = i * 5
    input.set([row.lengthMeters * 100, row.price ?? NaN, row.requested, row.placed, row.unused], offset)
  }
  const groupInput = new Float64Array(groups.length * 2)
  groups.forEach((group, index) => groupInput.set([group.start, group.count], index * 2))
  const lengths = [input.length, groupInput.length, rows.length * 2, groups.length * 2]
  const pointers = []
  try {
    for (const length of lengths) {
      const pointer = native.exo_fabric_cost_alloc(length)
      if (!pointer) return jsCost(rows, groups)
      pointers.push(pointer)
    }
    new Float64Array(native.memory.buffer, pointers[0], lengths[0]).set(input)
    new Float64Array(native.memory.buffer, pointers[1], lengths[1]).set(groupInput)
    const result = native.exo_fabric_cost_calculate(
      pointers[0], lengths[0], pointers[1], lengths[1], pointers[2], lengths[2], pointers[3], lengths[3])
    if (result !== 1) return jsCost(rows, groups)
    const out = Float64Array.from(new Float64Array(native.memory.buffer, pointers[2], lengths[2]))
    const totals = Float64Array.from(new Float64Array(native.memory.buffer, pointers[3], lengths[3]))
    const statuses = ['INCOMPLETE_MARKER', 'PRICE_NOT_SET', 'ESTIMATED']
    const calculated = rows.map((row, index) => {
      const status = statuses[out[index * 2 + 1]]
      if (!status) throw new Error('Invalid fabric cost status')
      return { complete: row.unused === 0 && row.placed === row.requested,
        status, extendedCost: status === 'ESTIMATED' ? out[index * 2] : null }
    })
    return { calculated, totals: groups.map((group, index) => ({
      ready: totals[index * 2] === 1,
      materialCost: totals[index * 2] === 1 ? totals[index * 2 + 1] : null,
    })) }
  } catch (error) {
    lastError = `Fabric cost WASM execution: ${String(error?.message || error)}`
    return jsCost(rows, groups)
  } finally {
    pointers.forEach((pointer, index) => native.exo_fabric_cost_free(pointer, lengths[index]))
  }
}

if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' &&
    typeof fetch === 'function') void initializeRustFabricCostKernel()
