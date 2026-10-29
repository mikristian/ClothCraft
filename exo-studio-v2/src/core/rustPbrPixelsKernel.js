/** Rust/WASM full-frame normal/roughness pixels, synchronous JS fallback.
 * Only validated RGBA pixels are copied into native-owned scratch memory.
 * No source image, user library, PNG encoding or materials are mutated.
 */
export const RUST_PBR_PIXELS_ABI_VERSION=1
let api=null,pending=null,error=null
const required=['exo_pbr_pixels_abi_version','exo_pbr_alloc','exo_pbr_free','exo_pbr_compute']
export const rustPbrPixelsStatus=()=>({backend:api?'rust-wasm':'javascript-fallback',
  abiVersion:api?.exo_pbr_pixels_abi_version()??null,error})

export async function initializeRustPbrPixelsKernel({bytes,url='/wasm/exo_pbr_pixels_kernel.wasm'}={}){
 if(api)return true
 if(pending)return pending
 pending=(async()=>{
  try{
   const input=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`PBR WASM HTTP ${r.status}`);return r.arrayBuffer()})
   const instance=await WebAssembly.instantiate(input,{env:{
    pow:Math.pow,sqrt:Math.sqrt,round:Math.round,
    hypot3:(x,y,z)=>Math.hypot(x,y,z),
   }})
   const native=instance.instance?.exports??instance.exports
   if(required.some(name=>typeof native?.[name]!=='function')||
      native.exo_pbr_pixels_abi_version()!==1||!(native.memory instanceof WebAssembly.Memory))
    throw Error('Unexpected PBR pixels WASM ABI')
   api=native;error=null;return true
  }catch(e){error=String(e?.message||e);return false}
  finally{pending=null}
 })()
 return pending
}

/** Returns null when JS should retain authority over non-byte and huge inputs. */
export function rustEstimateFabricPbrPixels(imageData,normalStrength){
 if(!api||!(imageData?.data instanceof Uint8ClampedArray))return null
 const {width,height,data}=imageData
 const count=width*height
 if(!Number.isSafeInteger(count)||count<4||count>1048576||data.length<count*4)return null
 const bytes=count*4,total=bytes*3
 const gain=Math.max(.1,Math.min(8,Number(normalStrength)||2))
 const pointer=api.exo_pbr_alloc(total)
 if(!pointer)return null
 try{
  new Uint8Array(api.memory.buffer,pointer,bytes).set(data.subarray(0,bytes))
  if(api.exo_pbr_compute(pointer,width,height,gain)!==1)return null
  // Reacquire memory.buffer after native allocation, which can grow memory.
  const view=new Uint8Array(api.memory.buffer,pointer+bytes,bytes*2)
  return {width,height,
   normal:new Uint8ClampedArray(view.slice(0,bytes)),
   roughness:new Uint8ClampedArray(view.slice(bytes)),
   kind:'estimated-from-albedo'}
 }finally{api.exo_pbr_free(pointer,total)}
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
 void initializeRustPbrPixelsKernel()
