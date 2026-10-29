import { fetchWasmBytes } from './wasmTransport.js'
// The editor still returns synchronous material-space intervals during startup.
export const RUST_MATERIAL_GUIDE_ABI_VERSION=1
let kernel=null
let loading=null
let error=null

export const rustMaterialGuideKernelReady=()=>Boolean(kernel)
export const rustMaterialGuideKernelStatus=()=>({
  backend:kernel?'rust-wasm':'javascript-fallback',
  abiVersion:kernel?.exo_material_guide_abi_version()??null,error,
})

export async function initializeRustMaterialGuideKernel({bytes,url='/wasm/exo_material_guide_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetchWasmBytes(url, "Material guide WASM HTTP ")
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(exports?.exo_material_guide_abi_version?.()!==RUST_MATERIAL_GUIDE_ABI_VERSION||
        typeof exports.exo_material_guide_alloc!=='function'||
        typeof exports.exo_material_guide_free!=='function'||
        typeof exports.exo_material_guide_spans!=='function'||
        !(exports.memory instanceof WebAssembly.Memory))
        throw new Error('Unexpected EXO Rust material guide ABI')
      kernel=exports;error=null;return true
    }catch(caught){
      kernel=null;error=String(caught?.message??caught);return false
    }finally{loading=null}
  })()
  return loading
}

function jsMaterialGuideSpans(triangles,points,station,vertical){
  const occupied=[]
  const along=p=>vertical?p[0]:p[1]
  const across=p=>vertical?p[1]:p[0]
  for(const triangle of triangles){
    if(!Array.isArray(triangle)||triangle.length!==3)continue
    const vertices=triangle.map(index=>points[index])
    if(vertices.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))continue
    const [a,b,c]=vertices
    if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-12)continue
    const intersections=[]
    for(let i=0;i<3;i++){
      const p=vertices[i],q=vertices[(i+1)%3]
      const dp=along(p)-station,dq=along(q)-station
      if(Math.abs(dp)<1e-10&&Math.abs(dq)<1e-10){
        intersections.push(across(p),across(q))
      }else if(dp*dq<=0&&Math.abs(along(q)-along(p))>1e-12){
        const t=(station-along(p))/(along(q)-along(p))
        if(t>=-1e-10&&t<=1+1e-10)intersections.push(across(p)+(across(q)-across(p))*t)
      }
    }
    if(intersections.length<2)continue
    const lo=Math.min(...intersections),hi=Math.max(...intersections)
    // Extreme but finite source coordinates can overflow interpolation or
    // span width. Never hand non-finite drawing intervals to the 2D editor.
    if(Number.isFinite(lo)&&Number.isFinite(hi)&&Number.isFinite(hi-lo)&&hi-lo>1e-7)occupied.push([lo,hi])
  }
  occupied.sort((a,b)=>a[0]-b[0])
  const merged=[]
  for(const [a,b] of occupied){
    const last=merged.at(-1)
    if(last&&a<=last[1]+1e-7)last[1]=Math.max(last[1],b)
    else merged.push([a,b])
  }
  return merged
}

export function rustMaterialGuideSpans(triangles,points,station,vertical=false){
  if(!Number.isFinite(station)||!Array.isArray(triangles)||!Array.isArray(points))return []
  if(!kernel)return jsMaterialGuideSpans(triangles,points,station,vertical)
  // Prevent oversized WASM allocations from interrupting the drawing loop.
  // The JS implementation remains authoritative for enormous inputs.
  if(triangles.length>250000)return jsMaterialGuideSpans(triangles,points,station,vertical)
  // One triangle owns six f64 vertex coordinates, including NaN for invalid
  // vertices. Rust runs the same filtering, edge intersections and union.
  const data=new Float64Array(triangles.length*6)
  data.fill(NaN)
  for(let i=0;i<triangles.length;i++){
    const triangle=triangles[i]
    if(!Array.isArray(triangle)||triangle.length!==3)continue
    for(let j=0;j<3;j++){
      const p=points[triangle[j]]
      if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))break
      data[i*6+j*2]=p[0]
      data[i*6+j*2+1]=p[1]
    }
  }
  const inputBytes=data.byteLength
  const outputBytes=triangles.length*2*8
  let input=0,output=0
  try{
    input=kernel.exo_material_guide_alloc(inputBytes)
    output=kernel.exo_material_guide_alloc(outputBytes)
    if((inputBytes&&!input)||(outputBytes&&!output))throw new Error('Material guide WASM allocation failed')
    new Float64Array(kernel.memory.buffer,input,data.length).set(data)
    const size=kernel.exo_material_guide_spans(input,triangles.length,station,vertical?1:0,output)
    if(size>triangles.length)throw new Error('Invalid material guide WASM result length')
    const pairs=new Float64Array(kernel.memory.buffer,output,size*2)
    // The native kernel may overflow intermediate arithmetic on extreme
    // finite inputs. Recompute in JS, omitting only unrepresentable spans.
    for(let i=0;i<size;i++){
      const lo=pairs[i*2],hi=pairs[i*2+1]
      if(!Number.isFinite(lo)||!Number.isFinite(hi)||!Number.isFinite(hi-lo)||lo>hi)
        return jsMaterialGuideSpans(triangles,points,station,vertical)
    }
    return Array.from({length:size},(_,i)=>[pairs[i*2],pairs[i*2+1]])
  }catch{
    return jsMaterialGuideSpans(triangles,points,station,vertical)
  }finally{
    if(input)kernel.exo_material_guide_free(input,inputBytes)
    if(output)kernel.exo_material_guide_free(output,outputBytes)
  }
}

if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustMaterialGuideKernel()
}
