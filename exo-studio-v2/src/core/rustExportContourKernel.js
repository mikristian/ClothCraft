let native=null
export const rustExportContourStatus=()=>({backend:native?'rust-wasm':'javascript-fallback'})
export async function initializeRustExportContourKernel({bytes,url='/wasm/exo_export_contour_kernel.wasm'}={}){
 try{const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error('Export WASM unavailable');return r.arrayBuffer()})
 const instance=await WebAssembly.instantiate(raw,{}),api=instance.instance?.exports??instance.exports
 if(api.exo_export_contour_abi_version?.()!==1||typeof api.exo_export_edge_keep!=='function'||typeof api.exo_export_area_term!=='function')return false
 native=api;return true}catch{return false}
}
export function exportEdgeKeep(a,b,min){return native?Boolean(native.exo_export_edge_keep(a.x,a.y,b.x,b.y,min)):Math.hypot(a.x-b.x,a.y-b.y)>=min}
export function exportAreaTerm(a,b){return native?native.exo_export_area_term(a.x,a.y,b.x,b.y):a.x*b.y-b.x*a.y}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustExportContourKernel()
