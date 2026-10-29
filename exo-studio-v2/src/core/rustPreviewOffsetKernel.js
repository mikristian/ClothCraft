export const RUST_PREVIEW_OFFSET_ABI_VERSION=1
let native=null
export const rustPreviewOffsetStatus=()=>({backend:native?'rust-wasm':'javascript-fallback'})
export async function initializeRustPreviewOffsetKernel({bytes,url='/wasm/exo_preview_offset_kernel.wasm'}={}){
 try{const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error('WASM unavailable');return r.arrayBuffer()})
 const instance=await WebAssembly.instantiate(raw,{}),api=instance.instance?.exports??instance.exports
 if(api.exo_preview_offset_abi_version?.()!==1||typeof api.exo_preview_offset_x!=='function'||typeof api.exo_preview_offset_y!=='function')return false
 native=api;return true}catch{return false}
}
export function rustPreviewInwardPoint(point,a,b,sign,offset){
 if(native)return {x:native.exo_preview_offset_x(point.x,a.x,a.y,b.x,b.y,sign,offset),y:native.exo_preview_offset_y(point.y,a.x,a.y,b.x,b.y,sign,offset)}
 const length=Math.hypot(b.x-a.x,b.y-a.y)||1
 return {x:point.x-sign*(b.y-a.y)/length*offset,y:point.y+sign*(b.x-a.x)/length*offset}
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustPreviewOffsetKernel()
