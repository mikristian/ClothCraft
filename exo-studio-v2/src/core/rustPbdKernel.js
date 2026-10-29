import { fetchWasmBytes } from './wasmTransport.js'
/** Synchronous contiguous distance runs; special constraints stay in JS order. */
let kernel = null
let loading = null
let error = null
let committedSweeps = 0
let committedConstraints = 0
export const rustPbdKernelStatus = () => ({ backend: kernel ? 'rust-wasm' : 'javascript-fallback',
  committedSweeps, committedConstraints, error })
export function initializeRustPbdKernel({ bytes, url = '/wasm/exo_pbd_kernel.wasm' } = {}) {
  if (kernel) return Promise.resolve(true)
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "PBD WASM HTTP ")
      const { instance } = await WebAssembly.instantiate(raw, {})
      const k = instance.exports
      for (const name of ['abi_version', 'particle_capacity', 'constraint_capacity', 'particles_ptr', 'constraints_ptr', 'sweep']) {
        if (typeof k[`exo_pbd_${name}`] !== 'function') throw new Error('Invalid PBD ABI')
      }
      if (k.exo_pbd_abi_version() !== 1 || !(k.memory instanceof WebAssembly.Memory)) throw new Error('Invalid PBD ABI')
      kernel = k
      error = null
      return true
    } catch (e) { error = String(e.message ?? e); return false }
    finally { loading = null }
  })()
  return loading
}
const special = c => c.type === 'seam-virtual' || (c.type === 'surface-stitch' && c.targetParticles?.length)

// Construct once with the simulation; refresh all numerical values per sweep.
// Rebuild if callers replace constraints or endpoints in place.
export function createRustPbdSweep(constraints) {
  let runs = [], identities = []
  function rebuild() {
    runs = []; identities = constraints.map(c => [c, c.a, c.b, Boolean(special(c))])
    let run = null
    for (const c of constraints) {
      if (special(c)) { runs.push({ special: c }); run = null; continue }
      if (!run) { run = { constraints: [], particles: [], refs: new Map(), indices: [] }; runs.push(run) }
      const pair = [c.a, c.b].map(p => {
        if (!run.refs.has(p)) { run.refs.set(p, run.particles.length); run.particles.push(p) }
        return run.refs.get(p)
      })
      run.indices.push(pair); run.constraints.push(c)
    }
  }
  return (reverse, fallback, current = constraints) => {
    if (!kernel) return false
    if (current !== constraints) { constraints = current; identities = [] }
    if (!runs.length || identities.length !== constraints.length || identities.some(([c,a,b,s],i) => constraints[i] !== c || c.a !== a || c.b !== b || Boolean(special(c)) !== s)) rebuild()
    for (let step = 0; step < runs.length; step++) {
      const run = runs[reverse ? runs.length - 1 - step : step]
      if (run.special) { fallback(run.special); continue }
      if (!projectRun(run, reverse)) {
        for (let i = 0; i < run.constraints.length; i++) fallback(run.constraints[reverse ? run.constraints.length - 1 - i : i])
      }
    }
    return true
  }
}
function projectRun(run, reverse) {
  const n = run.particles.length, m = run.constraints.length
  if (n > kernel.exo_pbd_particle_capacity() || m > kernel.exo_pbd_constraint_capacity()) return false
  const p = new Float64Array(kernel.memory.buffer, kernel.exo_pbd_particles_ptr(), n * 4)
  const c = new Float64Array(kernel.memory.buffer, kernel.exo_pbd_constraints_ptr(), m * 5)
  for (let i = 0; i < n; i++) {
    const v = run.particles[i]
    if (!v?.position?.set || !Number.isFinite(v.position.x) || !Number.isFinite(v.position.y) ||
      !Number.isFinite(v.position.z) || !Number.isFinite(v.invMass)) return false
    p[4*i] = v.position.x; p[4*i+1] = v.position.y; p[4*i+2] = v.position.z; p[4*i+3] = v.invMass
  }
  for (let i = 0; i < m; i++) {
    const v = run.constraints[i]
    if (!Number.isFinite(v.rest) || !Number.isFinite(v.stiffness)) return false
    c[5*i] = run.indices[i][0]; c[5*i+1] = run.indices[i][1]
    c[5*i+2] = v.rest; c[5*i+3] = v.stiffness; c[5*i+4] = v.type === 'fuse' ? 1 : 0
  }
  if (kernel.exo_pbd_sweep(n, m, Number(reverse)) !== 1) return false
  // An extreme but finite input can overflow during projection. Never commit
  // half a native sweep: let the original per-constraint JS policy decide.
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(p[4*i]) || !Number.isFinite(p[4*i+1]) ||
      !Number.isFinite(p[4*i+2])) return false
  }
  for (let i = 0; i < n; i++) run.particles[i].position.set(p[4*i], p[4*i+1], p[4*i+2])
  committedSweeps++
  committedConstraints += m
  return true
}
if (typeof window !== 'undefined') void initializeRustPbdKernel()
