const DEFAULT_URL = '/wasm/exo_mesh_selection_kernel.wasm'
let wasm = null
let error = null
let pending = null
export const rustMeshSelectionKernelReady = () => wasm !== null
export const rustMeshSelectionKernelStatus = () => ({ready:!!wasm,error})

export async function initializeRustMeshSelectionKernel({bytes,url=DEFAULT_URL}={}) {
  if(wasm) return true
  if(pending) return pending
  pending=(async()=>{
    try {
      const payload=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Mesh selection WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const instance=await WebAssembly.instantiate(payload,{})
      const api=instance.instance?.exports??instance.exports
      if(api?.exo_mesh_selection_abi_version?.()!==1 || !api.memory ||
        ['exo_mesh_selection_alloc','exo_mesh_selection_free','exo_mesh_selection_merge'].some(k=>typeof api[k]!=='function')) throw Error('Unsupported mesh selection WASM ABI')
      wasm=api;error=null;return true
    }catch(e){error=String(e?.message??e);return false}
    finally{pending=null}
  })()
  return pending
}

const i32=v=>Number.isInteger(v)&&v>=-2147483648&&v<=2147483647
/** Returns null if unsupported/unavailable, or {empty:true} for cleared selection. */
export function rustMergeMeshSelection(indices, faceVertices, faceIndex, additive) {
  if(!wasm || !i32(faceIndex) || !Array.isArray(indices) || !Array.isArray(faceVertices) ||
    !indices.every(i32) || !faceVertices.every(f=>i32(f.faceIndex)&&Array.isArray(f.vertices)&&f.vertices.length===3&&f.vertices.every(i32))) return null
  const input=[indices.length,faceVertices.length,faceIndex,additive?1:0,...indices,
    ...faceVertices.flatMap(f=>[f.faceIndex,...f.vertices])]
  const outputCapacity=2+indices.length+1+3*faceVertices.length
  const inputWords=input.length
  const total=inputWords+outputCapacity
  const ptr=wasm.exo_mesh_selection_alloc(total)
  if(!ptr) return null
  try {
    new Int32Array(wasm.memory.buffer,ptr,inputWords).set(input)
    const status=wasm.exo_mesh_selection_merge(ptr,inputWords,ptr+inputWords*4,outputCapacity)
    if(status===0)return {empty:true}
    if(status!==1)return null
    const out=new Int32Array(wasm.memory.buffer,ptr+inputWords*4,outputCapacity)
    const ni=out[0],nv=out[1]
    if(ni<0||nv<0||ni+nv+2>outputCapacity)return null
    return {triangleIndices:Array.from(out.subarray(2,2+ni)),vertices:Array.from(out.subarray(2+ni,2+ni+nv))}
  }finally{wasm.exo_mesh_selection_free(ptr,total)}
}
