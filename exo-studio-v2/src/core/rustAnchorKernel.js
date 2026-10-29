let kernel=null,loading=null,error=null,committed=0
export const rustAnchorKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',committed,error})
export function initializeRustAnchorKernel({bytes,url='/wasm/exo_anchor_kernel.wasm'}={}){
  if(kernel)return Promise.resolve(true)
  if(loading)return loading
  loading=(async()=>{try{const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Anchor WASM HTTP ${r.status}`);return r.arrayBuffer()})
    const {instance}=await WebAssembly.instantiate(raw,{})
    const k=instance.exports
    if(k.exo_anchor_abi_version?.()!==1||typeof k.exo_anchor_data_ptr!=='function'||typeof k.exo_anchor_interpolate!=='function'||!(k.memory instanceof WebAssembly.Memory))throw Error('Invalid anchor ABI')
    kernel=k;error=null;return true
  }catch(e){error=String(e.message??e);return false}finally{loading=null}})()
  return loading
}
export function projectRustAnchor(constraint){
  if(!kernel)return false
  const particle=constraint.particle
  if(!particle||particle.invMass<=0)return false
  const mode=constraint.axes==='y'?0:constraint.axes==='x'?1:constraint.axes==='xz'?2:3
  const p=particle.position,old=particle.previous,t=constraint.target
  const values=[p?.x,p?.y,p?.z,old?.x,old?.y,old?.z,t?.x,t?.y,t?.z,constraint.stiffness]
  // Avoid coercion discrepancies in the scalar Three.Vector3 fallback.
  if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))return false
  if(typeof p?.set!=='function'||typeof old?.set!=='function')return false
  const data=new Float64Array(kernel.memory.buffer,kernel.exo_anchor_data_ptr(),10)
  data.set(values)
  if(kernel.exo_anchor_interpolate(mode)!==1||data.some(v=>!Number.isFinite(v)))return false
  if(mode===0){p.y=data[1];old.y=data[4]}
  else if(mode===1){p.x=data[0];old.x=data[3]}
  else if(mode===2){p.x=data[0];p.z=data[2];old.x=data[3];old.z=data[5]}
  else{p.set(data[0],data[1],data[2]);old.copy(p)}
  committed++;return true
}
if(typeof window!=='undefined')void initializeRustAnchorKernel()
