import { fetchWasmBytes } from './wasmTransport.js'
/** Optional synchronous interchange numerics; parsing, types and metadata stay in JS. */
export const RUST_INTERCHANGE_MATH_ABI_VERSION=1
let native=null, pending=null, lastError=null
const required=['exo_interchange_math_abi_version','exo_relative_control_along',
  'exo_relative_control_depth','exo_absolute_control_x','exo_absolute_control_y','exo_seamly_cm']

export const rustInterchangeMathStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_interchange_math_abi_version()??null,error:lastError})

export async function initializeRustInterchangeMathKernel({bytes,url='/wasm/exo_interchange_math_kernel.wasm'}={}){
  if(native)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const input=bytes??await fetchWasmBytes(url, "Interchange WASM HTTP ")
      const instance=await WebAssembly.instantiate(input,{})
      const exports=instance.instance?.exports??instance.exports
      if(required.some(key=>typeof exports?.[key]!=='function')||
        exports.exo_interchange_math_abi_version()!==RUST_INTERCHANGE_MATH_ABI_VERSION)
        throw Error('Unexpected interchange math WASM ABI')
      native=exports;lastError=null;return true
    }catch(error){lastError=String(error?.message||error);return false}
    finally{pending=null}
  })()
  return pending
}

export function rustRelativeControl(a,b,control){
  const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy||1
  const px=control.cx-a.x,py=control.cy-a.y
  if(native&&[a.x,a.y,b.x,b.y,control.cx,control.cy].every(Number.isFinite))return [
    native.exo_relative_control_along(a.x,a.y,b.x,b.y,control.cx,control.cy),
    native.exo_relative_control_depth(a.x,a.y,b.x,b.y,control.cx,control.cy)]
  return [(px*dx+py*dy)/len2,(dx*py-dy*px)/len2]
}
export function rustAbsoluteControl(a,b,relative){
  // Original JS Number and truthiness coercion is deliberate and authoritative.
  const x=Number(relative?.[0]||0),y=Number(relative?.[1]||0)
  const dx=b.x-a.x,dy=b.y-a.y
  if(native&&[a.x,a.y,b.x,b.y,x,y].every(Number.isFinite))return {
    cx:native.exo_absolute_control_x(a.x,a.y,b.x,b.y,x,y),
    cy:native.exo_absolute_control_y(a.x,a.y,b.x,b.y,x,y)}
  return {cx:a.x+x*dx-y*dy,cy:a.y+x*dy+y*dx}
}
export function rustSeamlyCentimeters(value,scale){
  return native&&Number.isFinite(value)&&Number.isFinite(scale)?native.exo_seamly_cm(value,scale):value*scale
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
  void initializeRustInterchangeMathKernel()
