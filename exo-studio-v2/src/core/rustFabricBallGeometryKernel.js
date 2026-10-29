export const RUST_FABRIC_BALL_GEOMETRY_ABI_VERSION=1
let kernel=null,loading=null,error=null
export const rustFabricBallGeometryKernelReady=()=>!!kernel
export const rustFabricBallGeometryKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',abiVersion:kernel?.exo_fabric_ball_geometry_abi_version()??null,error})
export async function initializeRustFabricBallGeometryKernel({bytes,url='/wasm/exo_fabric_ball_geometry_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{try{
    const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Fabric ball WASM HTTP ${r.status}`);return r.arrayBuffer()})
    const mod=await WebAssembly.instantiate(raw,{host_math:{sin:Math.sin,cos:Math.cos,sqrt:Math.sqrt,hypot:Math.hypot,atan2:Math.atan2}})
    const exp=mod.instance?.exports??mod.exports
    if(exp.exo_fabric_ball_geometry_abi_version?.()!==1||typeof exp.exo_fabric_ball_geometry_axis!=='function')throw Error('Unexpected fabric ball geometry WASM ABI')
    kernel=exp;error=null;return true
  }catch(e){kernel=null;error=String(e?.message??e);return false}finally{loading=null}})()
  return loading
}
export function rustFabricBallCoordinates(flatX,flatZ,bend,mass,softness,contactY,jsFallback){
  if(!kernel)return jsFallback()
  const axis=kernel.exo_fabric_ball_geometry_axis
  return [axis(flatX,flatZ,bend,mass,softness,contactY,0),axis(flatX,flatZ,bend,mass,softness,contactY,1),axis(flatX,flatZ,bend,mass,softness,contactY,2)]
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustFabricBallGeometryKernel()
