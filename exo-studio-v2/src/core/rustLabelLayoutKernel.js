import { fetchWasmBytes } from './wasmTransport.js'
let kernel = null
let loading = null

export const rustLabelLayoutReady = () => kernel !== null

export async function initializeRustLabelLayoutKernel({bytes,url='/wasm/exo_label_layout_kernel.wasm'}={}) {
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try {
      const payload=bytes??await fetchWasmBytes(url, "Label layout WASM HTTP ")
      const instance=await WebAssembly.instantiate(payload,{})
      const api=instance.instance?.exports??instance.exports
      if(api?.exo_label_layout_abi_version?.()!==1 || !api.memory ||
        ['exo_label_layout_alloc','exo_label_layout_free','exo_label_layout_place'].some(name=>typeof api[name]!=='function'))throw Error('Unsupported label layout WASM ABI')
      kernel=api
      return true
    }catch{return false}finally{loading=null}
  })()
  return loading
}

export function rustPlacePatternLabel(midpoint,normal,width,height,screenUnit,points,bounds) {
  if(!kernel || !Array.isArray(points) || !Array.isArray(bounds) || points.length>1000000)return null
  const words=11+points.length*2+7
  const ptr=kernel.exo_label_layout_alloc(words)
  if(!ptr)return null
  try {
    const packed=new Float64Array(kernel.memory.buffer,ptr,words)
    const params=[...midpoint,...normal,screenUnit,width,height,...bounds]
    if(params.length!==11 || !params.every(Number.isFinite))return null
    packed.set(params)
    for(let i=0;i<points.length;i++){
      if(!points[i] || !Number.isFinite(points[i][0]) || !Number.isFinite(points[i][1]))return null
      packed[11+i*2]=points[i][0]
      packed[12+i*2]=points[i][1]
    }
    const out=ptr+(words-7)*8
    if(kernel.exo_label_layout_place(ptr,points.length,out)!==1)return null
    const [x,y,left,right,top,bottom,collisions]=new Float64Array(kernel.memory.buffer,out,7)
    return {x,y,box:{left,right,top,bottom},collisions}
  }finally{kernel.exo_label_layout_free(ptr,words)}
}
