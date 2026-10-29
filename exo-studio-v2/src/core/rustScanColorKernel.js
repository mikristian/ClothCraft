import { fetchWasmBytes } from './wasmTransport.js'
/** Synchronous Rust/WASM scan dye-color reconstruction. Canvas ownership,
 * source pixels, alpha, licensing provenance and washes remain untouched JS.
 */
export const RUST_SCAN_COLOR_ABI_VERSION=1
let native=null
let pending=null
let error=null
const required=['exo_scan_color_abi_version','exo_scan_regrade_rgb']
export const rustScanColorStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_scan_color_abi_version()??null,error})

export async function initializeRustScanColorKernel({bytes,url='/wasm/exo_scan_color_kernel.wasm'}={}) {
  if(native)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const input=bytes??await fetchWasmBytes(url, "Scan color WASM HTTP ")
      const module=await WebAssembly.instantiate(input,{env:{pow:Math.pow,round:Math.round}})
      const exports=module.instance?.exports??module.exports
      if(required.some(name=>typeof exports?.[name]!=='function')||
         exports.exo_scan_color_abi_version()!==RUST_SCAN_COLOR_ABI_VERSION)
        throw Error('Unexpected scan color WASM ABI')
      native=exports
      error=null
      return true
    }catch(e){error=String(e?.message||e);return false}
    finally{pending=null}
  })()
  return pending
}

/** Returns null for nonstandard/coerced inputs: the original JS handles them. */
export function rustRegradeScannedPixel(rgb,averageLuminance,desiredRgb){
  if(!native||!Array.isArray(rgb)||!Array.isArray(desiredRgb)||
    rgb.length!==3||desiredRgb.length!==3||!Number.isFinite(averageLuminance)||
    !rgb.every(c=>Number.isFinite(c)&&c>=0&&c<=255)||
    !desiredRgb.every(c=>Number.isFinite(c)&&c>=0&&c<=255))return null
  const packed=native.exo_scan_regrade_rgb(rgb[0],rgb[1],rgb[2],averageLuminance,
    desiredRgb[0],desiredRgb[1],desiredRgb[2])
  return [packed&255,(packed>>>8)&255,(packed>>>16)&255]
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
  void initializeRustScanColorKernel()
