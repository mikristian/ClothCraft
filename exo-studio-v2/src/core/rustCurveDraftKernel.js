// Synchronous polyline geometry bridge; spline evaluation stays in the native JS curve evaluator.
export const RUST_CURVE_DRAFT_ABI_VERSION=1
let kernel=null,loading=null,error=null
export const rustCurveDraftKernelReady=()=>Boolean(kernel)
export const rustCurveDraftKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',abiVersion:kernel?.exo_curve_draft_abi_version()??null,error})

export async function initializeRustCurveDraftKernel({bytes,url='/wasm/exo_curve_draft_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Curve draft WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const mod=await WebAssembly.instantiate(raw,{})
      const exports=mod.instance?.exports??mod.exports
      if(exports.exo_curve_draft_abi_version?.()!==1||!exports.memory||
        typeof exports.exo_curve_draft_alloc!=='function'||typeof exports.exo_curve_draft_measure!=='function'||
        typeof exports.exo_curve_draft_brackets!=='function'||typeof exports.exo_curve_draft_free!=='function')throw Error('Unexpected curve draft WASM ABI')
      kernel=exports;error=null;return true
    }catch(e){kernel=null;error=String(e?.message??e);return false}
    finally{loading=null}
  })()
  return loading
}

const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
export function jsCurveDraftBrackets(points,y){
  const indices=[]
  if(!Number.isFinite(y))return indices
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i]
    if(!valid(a)||!valid(b))continue
    const dy=b[1]-a[1]
    if(Math.abs(dy)<1e-10||Math.min(a[1],b[1])-1e-7>y||Math.max(a[1],b[1])+1e-7<y)continue
    indices.push(i-1)
  }
  return indices
}
export function jsCurveDraftMeasure(points){
  if(points.length<2||points.some(p=>!valid(p)))return null
  const arcs=points.slice(1).map((p,i)=>distance(p,points[i]))
  const length=arcs.reduce((sum,n)=>sum+n,0)
  let remaining=length/2,index=0
  for(;index<arcs.length-1&&remaining>arcs[index];index++)remaining-=arcs[index]
  const middle=arcs[index]>1e-10?[0,1].map(axis=>points[index][axis]+(points[index+1][axis]-points[index][axis])*remaining/arcs[index]):
    [0,1].map(axis=>(points[index][axis]+points[index+1][axis])/2)
  return {length,midpoint:middle,bounds:{minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),
    minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))}}
}
function run(points,fn,outLength){
  if(!kernel||points.length<2||points.length>1_000_000||points.some(p=>!valid(p)))return null
  const n=points.length,ptr=kernel.exo_curve_draft_alloc(n*2),out=kernel.exo_curve_draft_alloc(outLength)
  if(!ptr||!out){if(ptr)kernel.exo_curve_draft_free(ptr,n*2);if(out)kernel.exo_curve_draft_free(out,outLength);return null}
  try{
    new Float64Array(kernel.memory.buffer,ptr,n*2).set(points.flat())
    const count=fn(ptr,n,out)
    return {count,values:Array.from(new Float64Array(kernel.memory.buffer,out,Math.min(count,outLength)))}
  }finally{kernel.exo_curve_draft_free(ptr,n*2);kernel.exo_curve_draft_free(out,outLength)}
}
export function rustCurveDraftBrackets(points,y){
  if(!Number.isFinite(y))return []
  const result=run(points,(ptr,n,out)=>kernel.exo_curve_draft_brackets(ptr,n,y,out),points.length-1)
  return result?result.values:jsCurveDraftBrackets(points,y)
}
export function rustCurveDraftMeasure(points){
  const result=run(points,(ptr,n,out)=>kernel.exo_curve_draft_measure(ptr,n,out)?7:0,7)
  if(!result)return jsCurveDraftMeasure(points)
  if(result.count!==7)return null
  const [length,mx,my,minX,maxX,minY,maxY]=result.values
  return {length,midpoint:[mx,my],bounds:{minX,maxX,minY,maxY}}
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustCurveDraftKernel()
