import { fetchWasmBytes } from './wasmTransport.js'
/** Additive Rust/WASM numerical stages. JS owns schemas, validations, state,
 * input coercion, sewing references, physical simulation and all rendering.
 * No asynchronous work is needed on a call: fallback is always synchronous.
 */
export const RUST_CORE_MATH_ABI_VERSION=1
const URL='/wasm/exo_core_math_kernel.wasm'
let kernel=null
let pending=null
let runtimeError=null
const required=['exo_core_math_abi_version','exo_quadratic_component','exo_cubic_component',
  'exo_segment_distance_squared','exo_barycentric_u','exo_barycentric_v',
  'exo_preview_page','exo_numeric_clamp','exo_wash_smooth','exo_hardware_swap']

export const rustCoreMathStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_core_math_abi_version()??null,error:runtimeError})

export async function initializeRustCoreMathKernel({bytes,url=URL}={}) {
  if(kernel)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const data=bytes??await fetchWasmBytes(url, "Core math WASM HTTP ")
      const instance=await WebAssembly.instantiate(data,{})
      const api=instance.instance?.exports??instance.exports
      if(required.some(name=>typeof api?.[name]!=='function')||
        api.exo_core_math_abi_version()!==RUST_CORE_MATH_ABI_VERSION)
        throw Error('Unexpected EXO core math ABI')
      kernel=api;runtimeError=null;return true
    }catch(e){runtimeError=String(e?.message||e);return false}
    finally{pending=null}
  })()
  return pending
}

export function rustQuadraticComponent(a,c,b,t){
  if(kernel)return kernel.exo_quadratic_component(a,c,b,t)
  const u=1-t
  return u*u*a+2*u*t*c+t*t*b
}
export function rustCubicComponent(a,c1,c2,b,t){
  if(kernel)return kernel.exo_cubic_component(a,c1,c2,b,t)
  const q=1-t
  return q*q*q*a+3*q*q*t*c1+3*q*t*t*c2+t*t*t*b
}
export function rustSegmentDistanceSquared(point,start,end){
  if(kernel&&[point.x,point.y,start.x,start.y,end.x,end.y].every(Number.isFinite))
    return kernel.exo_segment_distance_squared(point.x,point.y,start.x,start.y,end.x,end.y)
  const dx=end.x-start.x,dy=end.y-start.y,len=dx*dx+dy*dy
  const t=len>1e-15?Math.max(0,Math.min(1,((point.x-start.x)*dx+(point.y-start.y)*dy)/len)):0
  const rx=point.x-(start.x+dx*t),ry=point.y-(start.y+dy*t)
  return rx*rx+ry*ry
}
export function rustBarycentricUV(point,a,b,c,denominator){
  if(kernel)return [
    kernel.exo_barycentric_u(point.x,point.y,a.x,a.y,b.x,b.y,c.x,c.y,denominator),
    kernel.exo_barycentric_v(point.x,point.y,a.x,a.y,b.x,b.y,c.x,c.y,denominator)]
  return [((b.y-c.y)*(point.x-c.x)+(c.x-b.x)*(point.y-c.y))/denominator,
    ((c.y-a.y)*(point.x-c.x)+(a.x-c.x)*(point.y-c.y))/denominator]
}
export function rustPreviewPageIndex(total,limit,requested){
  return kernel?kernel.exo_preview_page(total,limit,requested):Math.max(0,Math.min(Math.max(1,Math.ceil(total/limit))-1,Math.trunc(requested)))
}
export function rustFiniteClamp(number,lo,hi){
  return kernel?kernel.exo_numeric_clamp(number,lo,hi):Math.max(lo,Math.min(hi,number))
}
export function rustWashSmooth(a,b,x){
  if(kernel&&!Number.isNaN((x-a)/(b-a)))return kernel.exo_wash_smooth(a,b,x)
  const t=Math.min(1,Math.max(0,(x-a)/(b-a)))
  return t*t*(3-2*t)
}
export function rustHardwareSwap(width,height,depth){
  return kernel?Boolean(kernel.exo_hardware_swap(width,height,depth)):height<Math.min(width,depth)*.5
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
  void initializeRustCoreMathKernel()
