import { fetchWasmBytes } from './wasmTransport.js'
/** Batch Rust/WASM adapter for actual VBD mesh strain visualization.
 * The legacy JS calculation remains the synchronous fallback until the
 * compiled kernel loads or a large/invalid mesh exceeds supported bounds.
 */
export const RUST_STRAIN_ABI_VERSION = 1
const WASM_PATH = '/wasm/exo_strain_kernel.wasm'
let kernel = null
let loading = null
let error = null

const required = [
  'exo_strain_abi_version','exo_triangle_extension',
  'exo_strain_vertex_capacity','exo_strain_triangle_capacity',
  'exo_strain_uv_ptr','exo_strain_world_ptr','exo_strain_triangles_ptr',
  'exo_strain_output_ptr','exo_strain_vertex_extensions',
]
export const rustStrainKernelReady = () => Boolean(kernel)
export const rustStrainKernelStatus = () => ({
  backend: kernel ? 'rust-wasm' : 'javascript-fallback',
  abiVersion: kernel?.exo_strain_abi_version() ?? null,
  error,
})

export async function initializeRustStrainKernel({bytes,url=WASM_PATH}={}) {
  if (kernel) return true
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetchWasmBytes(url, "Rust strain WASM HTTP ")
      const module = await WebAssembly.instantiate(raw,{})
      const exports = module.instance?.exports ?? module.exports
      if (required.some(name => typeof exports?.[name] !== 'function') ||
        exports.exo_strain_abi_version() !== RUST_STRAIN_ABI_VERSION ||
        !(exports.memory instanceof WebAssembly.Memory)) {
        throw new Error('Unexpected EXO Rust strain ABI')
      }
      kernel = exports
      error = null
      return true
    } catch(caught) {
      error = String(caught?.message ?? caught)
      return false
    } finally { loading = null }
  })()
  return loading
}

const finiteVector = (point, count) => Array.isArray(point) &&
  point.length === count && point.every(Number.isFinite)

export function rustTriangleExtension(uv,world) {
  if (!kernel || !Array.isArray(uv) || !Array.isArray(world) ||
    uv.length !== 3 || world.length !== 3 ||
    !uv.every(point=>finiteVector(point,2)) ||
    !world.every(point=>finiteVector(point,3))) return null
  const args=[...uv.flat(),...world.flat()]
  const value=kernel.exo_triangle_extension(...args)
  return Number.isFinite(value)?value:null
}

export function rustVertexExtensions(snapshot) {
  if (!kernel || !Array.isArray(snapshot?.positions) ||
    !Array.isArray(snapshot?.uv) || !Array.isArray(snapshot?.triangles))return null
  const n=snapshot.positions.length
  const m=snapshot.triangles.length
  if (!n || n>kernel.exo_strain_vertex_capacity() ||
    m>kernel.exo_strain_triangle_capacity() || snapshot.uv.length<n ||
    !snapshot.positions.every(point=>finiteVector(point,3)) ||
    !snapshot.uv.slice(0,n).every(point=>finiteVector(point,2)) ||
    !snapshot.triangles.every(face=>Array.isArray(face) && face.length===3 &&
      face.every(i=>Number.isInteger(i) && i>=0 && i<n)))return null
  const memory=kernel.memory.buffer
  const uv=new Float64Array(memory,kernel.exo_strain_uv_ptr(),2*n)
  const world=new Float64Array(memory,kernel.exo_strain_world_ptr(),3*n)
  const triangles=new Uint32Array(memory,kernel.exo_strain_triangles_ptr(),3*m)
  for(let i=0;i<n;i++){
    uv[2*i]=snapshot.uv[i][0]
    uv[2*i+1]=snapshot.uv[i][1]
    for(let j=0;j<3;j++)world[3*i+j]=snapshot.positions[i][j]
  }
  for(let i=0;i<m;i++)for(let j=0;j<3;j++)triangles[3*i+j]=snapshot.triangles[i][j]
  if(kernel.exo_strain_vertex_extensions(n,m)!==1)return null
  const result=Array.from(new Float64Array(kernel.memory.buffer,kernel.exo_strain_output_ptr(),n))
  return result.every(Number.isFinite)?result:null
}

if(typeof window!=='undefined' && typeof WebAssembly!=='undefined' && typeof fetch==='function'){
  void initializeRustStrainKernel()
}
