import { fetchWasmBytes } from './wasmTransport.js'
/** Optional Rust numeric stage for existing synchronous precision drafting. */
export const RUST_PRECISION_CHORD_ABI_VERSION=1
const URL='/wasm/exo_precision_chord_kernel.wasm'
let native=null
let loading=null
let lastError=null
const required=['exo_precision_chord_abi_version','exo_chord_along','exo_chord_depth',
  'exo_chord_control_x','exo_chord_control_y']

export const rustPrecisionChordStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_precision_chord_abi_version()??null,error:lastError})

export async function initializeRustPrecisionChordKernel({bytes,url=URL}={}) {
  if(native)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const input=bytes??await fetchWasmBytes(url, "Precision chord WASM HTTP ")
      const instance=await WebAssembly.instantiate(input,{})
      const exports=instance.instance?.exports??instance.exports
      if(required.some(name=>typeof exports?.[name]!=='function')||
          exports.exo_precision_chord_abi_version()!==RUST_PRECISION_CHORD_ABI_VERSION)
        throw new Error('Unexpected precision chord WASM ABI')
      native=exports
      lastError=null
      return true
    }catch(error){lastError=String(error?.message||error);return false}
    finally{loading=null}
  })()
  return loading
}

export function rustChordCoordinates(a,control,b,length) {
  const dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2
  return native?{
    alongCm:native.exo_chord_along(a.x,a.y,b.x,b.y,control.x,control.y,length),
    depthCm:native.exo_chord_depth(a.x,a.y,b.x,b.y,control.x,control.y,length),
  }:{
    alongCm:((control.x-mx)*dx+(control.y-my)*dy)/length,
    depthCm:(-(control.x-mx)*dy+(control.y-my)*dx)/length,
  }
}

export function rustChordControl(a,b,along,depth,length) {
  const dx=b.x-a.x,dy=b.y-a.y
  return native?{
    cx:native.exo_chord_control_x(a.x,a.y,b.x,b.y,along,depth,length),
    cy:native.exo_chord_control_y(a.x,a.y,b.x,b.y,along,depth,length),
  }:{
    cx:(a.x+b.x)/2+(along*dx-depth*dy)/length,
    cy:(a.y+b.y)/2+(along*dy+depth*dx)/length,
  }
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
  void initializeRustPrecisionChordKernel()
