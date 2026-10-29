import { fetchWasmBytes } from './wasmTransport.js'
/** W09 isolated optional Verlet batch. Caller supplies the existing per-piece damping/gravity.
 * Returns false without mutations whenever native dispatch cannot safely commit.
 */
export const RUST_VERLET_ABI_VERSION = 1
export const RUST_VERLET_MAX_PARTICLES = 1_000_000
let native = null
let pending = null
let error = null
let batches = 0
let particlesCommitted = 0

export function rustVerletStatus() {
  return {backend: native ? 'rust-wasm' : 'javascript-fallback', error, batches, particlesCommitted}
}

export async function initializeRustVerletKernel({bytes,url='/wasm/exo_verlet_kernel.wasm'}={}) {
  if (native) return true
  if (pending) return pending
  pending = (async () => {
    try {
      const input = bytes ?? await fetchWasmBytes(url, "Verlet WASM HTTP ")
      const result = await WebAssembly.instantiate(input,{})
      const exports = result.instance?.exports ?? result.exports
      const names = ['exo_verlet_abi_version','exo_verlet_alloc','exo_verlet_dealloc','exo_verlet_integrate']
      if (names.some(name => typeof exports?.[name] !== 'function') ||
        !(exports.memory instanceof WebAssembly.Memory) ||
        exports.exo_verlet_abi_version() !== RUST_VERLET_ABI_VERSION)
        throw Error('Unexpected Verlet WASM ABI')
      native = exports
      error = null
      return true
    } catch (cause) {
      error = String(cause?.message ?? cause)
      return false
    } finally { pending = null }
  })()
  return pending
}

/** Exact existing physics.js reference, usable by callers after false dispatch. */
export function integrateVerletJs(particles, damping, gravityStep) {
  for (const particle of particles) {
    if (particle.invMass <= 0) continue
    const velocity = particle.position.clone().sub(particle.previous).multiplyScalar(damping)
    particle.previous.copy(particle.position)
    particle.position.add(velocity)
    particle.position.y -= gravityStep
  }
}

export function integrateRustVerletBatch(particles, damping, gravityStep) {
  if (!native || !Array.isArray(particles) || !particles.length ||
    particles.length > RUST_VERLET_MAX_PARTICLES ||
    !Number.isFinite(damping) || !Number.isFinite(gravityStep)) return false
  const count = particles.length
  const input = new Float64Array(count * 7)
  for (let i = 0; i < count; i++) {
    const p = particles[i], at = i * 7
    if (!p?.position?.set || !p?.previous?.set) return false
    const v = [p.position.x,p.position.y,p.position.z,
      p.previous.x,p.previous.y,p.previous.z,p.invMass]
    if (!v.every(Number.isFinite)) return false
    input.set(v,at)
  }
  const inLen=input.length, outLen=count*6
  let inPtr=0,outPtr=0
  const kernel=native
  let values=null
  let failed=false
  try {
    inPtr=kernel.exo_verlet_alloc(inLen)
    if (!inPtr) failed=true
    if (!failed) outPtr=kernel.exo_verlet_alloc(outLen)
    if (!outPtr || inPtr % 8 || outPtr % 8) failed=true
    if (!failed) {
      const memory=kernel.memory.buffer
      if (inPtr + input.byteLength > memory.byteLength ||
        outPtr + outLen*8 > memory.byteLength) failed=true
      else {
        new Float64Array(memory,inPtr,inLen).set(input)
        if (kernel.exo_verlet_integrate(inPtr,outPtr,count,damping,gravityStep)!==1) failed=true
        else {
          values=Array.from(new Float64Array(kernel.memory.buffer,outPtr,outLen))
          if (!values.every(Number.isFinite)) failed=true
        }
      }
    }
  } catch (cause) {
    error=String(cause?.message??cause)
    failed=true
  } finally {
    for (const [ptr,len] of [[outPtr,outLen],[inPtr,inLen]]) {
      try { if (ptr) kernel.exo_verlet_dealloc(ptr,len) }
      catch (cause) {
        error=String(cause?.message??cause)
        failed=true
        native=null
      }
    }
  }
  // Cleanup must succeed before any JS-owned particle can change.
  if (failed || !values) return false
  const snapshots=particles.map(p=>({
    position:[p.position.x,p.position.y,p.position.z],
    previous:[p.previous.x,p.previous.y,p.previous.z]
  }))
  try {
    for (let i=0;i<count;i++) {
      const p=particles[i], at=i*6
      if (p.invMass <= 0) continue
      p.position.set(values[at],values[at+1],values[at+2])
      p.previous.set(values[at+3],values[at+4],values[at+5])
    }
  } catch (cause) {
    error=String(cause?.message??cause)
    // Restore even partially modified throwing setters. If restoration cannot
    // be guaranteed, throw rather than signal a safe-to-run JS fallback.
    let rollbackError=null
    for (let i=0;i<count;i++) {
      for (const field of ['position','previous']) {
        const target=particles[i][field],original=snapshots[i][field]
        try {
          target.x=original[0]; target.y=original[1]; target.z=original[2]
          if (!Object.is(target.x,original[0]) || !Object.is(target.y,original[1]) ||
              !Object.is(target.z,original[2])) throw Error('Rollback verification failed')
        } catch (restoreCause) { rollbackError=restoreCause }
      }
    }
    if (rollbackError) throw Error('Verlet rollback failed; JS fallback is unsafe', {cause:rollbackError})
    return false
  }
  batches++
  particlesCommitted+=count
  return true
}

if (typeof window !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof fetch === 'function')
  void initializeRustVerletKernel()
