// Arithmetic only: draftingUnfold owns coercion, validation and authored metadata.
export const RUST_UNFOLD_ABI_VERSION=1
let wasm=null, pending=null, failure=null
const operations=['exo_unfold_walk','exo_unfold_mirrored_edge','exo_unfold_grade_x','exo_unfold_grade_y','exo_unfold_notch']
export const rustUnfoldKernelReady=()=>Boolean(wasm)
export const rustUnfoldKernelStatus=()=>({backend:wasm?'rust-wasm':'javascript-fallback',error:failure})
export async function initializeRustUnfoldKernel({bytes,url='/wasm/exo_unfold_kernel.wasm'}={}){
 if(wasm)return true
 if(pending)return pending
 pending=(async()=>{
  try{
   const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw new Error(`Unfold WASM HTTP ${r.status}`);return r.arrayBuffer()})
   const module=await WebAssembly.instantiate(raw,{})
   const exports=module.instance?.exports??module.exports
   if(exports.exo_unfold_abi_version?.()!==RUST_UNFOLD_ABI_VERSION||operations.some(k=>typeof exports[k]!=='function'))throw new Error('Unexpected EXO Rust unfold ABI')
   wasm=exports;failure=null;return true
  }catch(error){failure=String(error?.message??error);return false}
  finally{pending=null}
 })()
 return pending
}
export const unfoldWalkIndex=(n,fold,i)=>wasm?wasm.exo_unfold_walk(n,fold,i):(fold+1+i)%n
export const unfoldMirroredEdge=(n,k)=>wasm?wasm.exo_unfold_mirrored_edge(n,k):2*n-3-k
export const unfoldNotchParameter=t=>wasm?wasm.exo_unfold_notch(t):1-t
export function unfoldGradeVector(v,ux,uy){
 if(wasm)return {x:wasm.exo_unfold_grade_x(v.x,v.y,ux,uy),y:wasm.exo_unfold_grade_y(v.x,v.y,ux,uy)}
 const projection=2*(ux*v.x+uy*v.y)
 return {x:projection*ux-v.x,y:projection*uy-v.y}
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustUnfoldKernel()
