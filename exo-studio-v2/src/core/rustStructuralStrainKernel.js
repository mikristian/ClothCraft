/** Rust owns ordered structural-strain accumulation; JS maps/commits particle objects and report shape. */
let kernel = null
let loading = null
let error = null
let committedBatches = 0
export const rustStructuralStrainKernelStatus = () => ({backend:kernel?'rust-wasm':'javascript-fallback',committedBatches,error})
export function initializeRustStructuralStrainKernel({bytes,url='/wasm/exo_structural_strain_kernel.wasm'}={}) {
  if (kernel) return Promise.resolve(true)
  if (loading) return loading
  loading = (async () => {
    try {
      const raw = bytes ?? await fetch(url).then(r => {if(!r.ok)throw Error(`Structural strain WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const {instance} = await WebAssembly.instantiate(raw,{})
      const k=instance.exports
      for(const name of ['abi_version','capacity','input_ptr','output_ptr','compute','indices_ptr','sums_ptr','counts_ptr','summary_ptr','accumulate'])
        if(typeof k[`exo_strain_${name}`]!=='function')throw Error('Invalid structural strain ABI')
      if(k.exo_strain_abi_version()!==1 || !(k.memory instanceof WebAssembly.Memory))throw Error('Invalid structural strain ABI')
      kernel=k;error=null;return true
    }catch(e){error=String(e.message??e);return false}finally{loading=null}
  })()
  return loading
}
export function calculateRustStructuralStrains(constraints,epsilon) {
  if(!kernel)return null
  const relevant=constraints.filter(c=>c.type==='structural' && !(c.rest<=epsilon))
  const n=relevant.length
  if(n>kernel.exo_strain_capacity())return null
  const input=new Float64Array(kernel.memory.buffer,kernel.exo_strain_input_ptr(),n*7)
  for(let i=0;i<n;i++) {
    const c=relevant[i],a=c.a?.position,b=c.b?.position
    const values=[a?.x,a?.y,a?.z,b?.x,b?.y,b?.z,c.rest]
    if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))return null
    input.set(values,i*7)
  }
  if(kernel.exo_strain_compute(n)!==1)return null
  const output=new Float64Array(kernel.memory.buffer,kernel.exo_strain_output_ptr(),n)
  // Preserve JS NaN/Infinity outcomes via scalar fallback, including huge finite positions.
  if(output.some(v=>!Number.isFinite(v)))return null
  committedBatches++
  return Array.from(output)
}
export function accumulateRustStructuralStrain(simulation,epsilon) {
  if(!kernel)return false
  const relevant=simulation.constraints.filter(c=>c.type==='structural' && !(c.rest<=epsilon))
  const particles=[];const lookup=new Map()
  const add=p=>{if(!lookup.has(p)){lookup.set(p,particles.length);particles.push(p)}return lookup.get(p)}
  for(const piece of simulation.pieces.values())for(const particle of piece.particles){
    // The scalar path clears/normalizes each occurrence; duplicate references
    // normalize more than once and cannot be collapsed into one Rust slot.
    if(lookup.has(particle))return false
    add(particle)
  }
  // Legacy scalar updates out-of-piece constraint endpoints without clearing
  // their existing strain fields. Preserve that behavior through JS fallback.
  for(const c of relevant)if(!lookup.has(c.a)||!lookup.has(c.b))return false
  const n=relevant.length,p=particles.length
  if(n>kernel.exo_strain_capacity()||p>kernel.exo_strain_capacity())return false
  const input=new Float64Array(kernel.memory.buffer,kernel.exo_strain_input_ptr(),n*7)
  const indices=new Float64Array(kernel.memory.buffer,kernel.exo_strain_indices_ptr(),n*2)
  for(let i=0;i<n;i++) {
    const c=relevant[i],a=c.a?.position,b=c.b?.position
    const values=[a?.x,a?.y,a?.z,b?.x,b?.y,b?.z,c.rest]
    if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))return false
    input.set(values,i*7)
    indices[2*i]=lookup.get(c.a);indices[2*i+1]=lookup.get(c.b)
  }
  if(kernel.exo_strain_accumulate(n,p)!==1)return false
  const sums=new Float64Array(kernel.memory.buffer,kernel.exo_strain_sums_ptr(),p)
  const counts=new Float64Array(kernel.memory.buffer,kernel.exo_strain_counts_ptr(),p)
  const summary=new Float64Array(kernel.memory.buffer,kernel.exo_strain_summary_ptr(),3)
  if(!summary.every(Number.isFinite)||!sums.every(Number.isFinite)||!counts.every(Number.isFinite))return false
  for(let i=0;i<p;i++){particles[i].strain=counts[i]>0?sums[i]/counts[i]:sums[i];particles[i].strainSamples=counts[i]}
  simulation.strain={average:summary[2]?summary[0]/summary[2]:0,max:summary[1]}
  committedBatches++
  return true
}
if(typeof window!=='undefined')void initializeRustStructuralStrainKernel()
