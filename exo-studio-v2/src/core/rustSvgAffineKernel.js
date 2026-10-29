import { fetchWasmBytes } from './wasmTransport.js'
// Browser WASM keeps the synchronous SVG importer contract intact. The
// Javascript calculation remains the compatibility path until WASM loads.
export const RUST_SVG_AFFINE_ABI_VERSION=1
let kernel=null
let loading=null
let error=null
export const rustSvgAffineKernelReady=()=>Boolean(kernel)
export const rustSvgAffineKernelStatus=()=>({
  backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_svg_affine_abi_version()??null,error,
})
export async function initializeRustSvgAffineKernel({bytes,url='/wasm/exo_svg_affine_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "SVG affine WASM HTTP ")
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(exports?.exo_svg_affine_abi_version?.()!==RUST_SVG_AFFINE_ABI_VERSION||
        typeof exports.exo_svg_affine_compose!=='function'||
        typeof exports.exo_svg_affine_coordinate!=='function')
        throw new Error('Unexpected EXO Rust SVG affine ABI')
      kernel=exports;error=null;return true
    }catch(caught){
      kernel=null;error=String(caught?.message??caught);return false
    }finally{loading=null}
  })()
  return loading
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustSvgAffineKernel()
}

export function composeSvgMatrices(x,y){
  if(kernel)return Array.from({length:6},(_,i)=>kernel.exo_svg_affine_compose(i,...x,...y))
  return [x[0]*y[0]+x[2]*y[1],x[1]*y[0]+x[3]*y[1],x[0]*y[2]+x[2]*y[3],x[1]*y[2]+x[3]*y[3],x[0]*y[4]+x[2]*y[5]+x[4],x[1]*y[4]+x[3]*y[5]+x[5]]
}
export function transformSvgPoints(m,points,scale){
  return points.map(p=>kernel?{
    x:kernel.exo_svg_affine_coordinate(m[0],m[2],m[4],p.x,p.y,scale),
    y:kernel.exo_svg_affine_coordinate(m[1],m[3],m[5],p.x,p.y,scale),
  }:{x:(m[0]*p.x+m[2]*p.y+m[4])*scale,y:(m[1]*p.x+m[3]*p.y+m[5])*scale})
}
