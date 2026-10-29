// Optional synchronous numeric polar stage; caller retains coercion and validation.
export const RUST_PRECISION_POLAR_ABI_VERSION=1
let native=null,loading=null,lastError=null
export const rustPrecisionPolarStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',error:lastError})
export async function initializeRustPrecisionPolarKernel({bytes,url='/wasm/exo_precision_polar_kernel.wasm'}={}) {
  if(native)return true
  if(loading)return loading
  loading=(async()=>{try{
    const input=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Precision polar WASM HTTP ${r.status}`);return r.arrayBuffer()})
    const result=await WebAssembly.instantiate(input,{env:{cos:Math.cos,sin:Math.sin,atan2:Math.atan2,hypot:Math.hypot}})
    const exports=result.instance?.exports??result.exports
    if(['exo_precision_polar_abi_version','exo_polar_x','exo_polar_y','exo_polar_length','exo_polar_angle'].some(k=>typeof exports?.[k]!=='function')||exports.exo_precision_polar_abi_version()!==1)throw Error('Unexpected precision polar WASM ABI')
    native=exports;lastError=null;return true
  }catch(e){lastError=String(e?.message??e);return false}finally{loading=null}})()
  return loading
}
export function rustPointFromPolar(anchorX,anchorY,length,angle){
  const radians=angle*Math.PI/180
  return native?{x:native.exo_polar_x(anchorX,length,angle),y:native.exo_polar_y(anchorY,length,angle)}:{x:anchorX+length*Math.cos(radians),y:anchorY+length*Math.sin(radians)}
}
export function rustPolarFromDeltas(dx,dy){
  return native?{lengthCm:native.exo_polar_length(dx,dy),angleDeg:native.exo_polar_angle(dx,dy)}:{lengthCm:Math.hypot(dx,dy),angleDeg:Math.atan2(dy,dx)*180/Math.PI}
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustPrecisionPolarKernel()
