// Analytic construction arithmetic. Public validation remains in draftingConstructions.
export const RUST_CONSTRUCTION_ABI_VERSION=1
let wasm=null
let pending=null
let failure=null
const operations=['exo_intersection_x','exo_intersection_y','exo_projection_x','exo_projection_y','exo_along_x','exo_along_y','exo_mirror_x','exo_mirror_y']
export const rustConstructionKernelReady=()=>Boolean(wasm)
export const rustConstructionKernelStatus=()=>({backend:wasm?'rust-wasm':'javascript-fallback',error:failure})
export async function initializeRustConstructionKernel({bytes,url='/wasm/exo_construction_kernel.wasm'}={}){
 if(wasm)return true
 if(pending)return pending
 pending=(async()=>{
  try{
   const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw new Error(`Construction WASM HTTP ${r.status}`);return r.arrayBuffer()})
   const module=await WebAssembly.instantiate(raw,{})
   const exports=module.instance?.exports??module.exports
   if(exports.exo_construction_abi_version?.()!==RUST_CONSTRUCTION_ABI_VERSION||operations.some(k=>typeof exports[k]!=='function'))throw new Error('Unexpected EXO Rust construction ABI')
   wasm=exports;failure=null;return true
  }catch(error){failure=String(error?.message??error);return false}
  finally{pending=null}
 })()
 return pending
}
export function rustConstructionIntersection(a,b,c,d){
 if(!wasm){const u={x:b.x-a.x,y:b.y-a.y},v={x:d.x-c.x,y:d.y-c.y};const t=((c.x-a.x)*v.y-(c.y-a.y)*v.x)/(u.x*v.y-u.y*v.x);return {x:a.x+t*u.x,y:a.y+t*u.y}}
 const args=[a.x,a.y,b.x,b.y,c.x,c.y,d.x,d.y]
 return {x:wasm.exo_intersection_x(...args),y:wasm.exo_intersection_y(...args)}
}
export function rustConstructionProjection(point,a,b){
 if(!wasm){const u={x:b.x-a.x,y:b.y-a.y},t=((point.x-a.x)*u.x+(point.y-a.y)*u.y)/(u.x*u.x+u.y*u.y);return {x:a.x+t*u.x,y:a.y+t*u.y}}
 const args=[point.x,point.y,a.x,a.y,b.x,b.y]
 return {x:wasm.exo_projection_x(...args),y:wasm.exo_projection_y(...args)}
}
export function rustConstructionAlong(a,b,distance,perpendicular=false){
 // A finite, very long drafting reference can have an overflowing hypot.
 // In that case both the JS fallback and compiled WASM would silently place
 // a positive offset at the original point (infinite norm => zero unit).
 // Normalize scaled endpoint differences before dispatching to either path.
 const dx=b.x-a.x,dy=b.y-a.y
 if(!Number.isFinite(Math.hypot(dx,dy)) &&
    [a.x,a.y,b.x,b.y,distance].every(Number.isFinite)){
  const scale=Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(b.x),Math.abs(b.y))
  const sx=b.x/scale-a.x/scale,sy=b.y/scale-a.y/scale
  const length=Math.hypot(sx,sy)
  if(!(length>0) || !Number.isFinite(length))return {x:NaN,y:NaN}
  const ux=sx/length,uy=sy/length
  return perpendicular
   ? {x:a.x-uy*distance,y:a.y+ux*distance}
   : {x:a.x+ux*distance,y:a.y+uy*distance}
 }
 if(!wasm){const delta={x:b.x-a.x,y:b.y-a.y},norm=Math.hypot(delta.x,delta.y),unit=perpendicular?{x:-delta.y/norm,y:delta.x/norm}:{x:delta.x/norm,y:delta.y/norm};return {x:a.x+unit.x*distance,y:a.y+unit.y*distance}}
 const args=[a.x,a.y,b.x,b.y,distance,perpendicular?1:0]
 return {x:wasm.exo_along_x(...args),y:wasm.exo_along_y(...args)}
}
export function rustConstructionMirror(point,a,b){
 if(!wasm){const foot=rustConstructionProjection(point,a,b);return {x:foot.x*2-point.x,y:foot.y*2-point.y}}
 const args=[point.x,point.y,a.x,a.y,b.x,b.y]
 return {x:wasm.exo_mirror_x(...args),y:wasm.exo_mirror_y(...args)}
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustConstructionKernel()
