let kernel = null
let loading = null
export const rustSelectionMetricsReady = () => kernel !== null
export async function initializeRustSelectionMetricsKernel({bytes,url='/wasm/exo_selection_metrics_kernel.wasm'}={}) {
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try {
      const payload=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Selection metrics WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const instance=await WebAssembly.instantiate(payload,{})
      const api=instance.instance?.exports??instance.exports
      if(api?.exo_selection_metrics_abi_version?.()!==1 || !api.memory ||
        ['exo_selection_metrics_alloc','exo_selection_metrics_free','exo_selection_metrics_interval'].some(k=>typeof api[k]!=='function'))throw Error('Unsupported selection metrics WASM ABI')
      kernel=api;return true
    }catch{return false}finally{loading=null}
  })()
  return loading
}
/** One packed f64 WASM call for all boundary nodes; null signals JS fallback. */
export function rustMeasuredSewingInterval(uv,live,range) {
  if(!kernel || !Array.isArray(uv) || !Array.isArray(live) ||
    uv.length!==live.length || uv.length<2 || !Array.isArray(range) || range.length!==2 ||
    !Number.isFinite(range[0]) || !Number.isFinite(range[1]) ||
    range[0]<0 || range[1]>1 || range[0]>=range[1])return null
  for(let i=0;i<uv.length;i++){
    const flat=uv[i],draped=live[i]
    if(!Array.isArray(flat) || !Array.isArray(draped) ||
      flat.length<2 || draped.length<3 ||
      !Number.isFinite(flat[0]) || !Number.isFinite(flat[1]) ||
      !Number.isFinite(draped[0]) || !Number.isFinite(draped[1]) ||
      !Number.isFinite(draped[2]))return null
  }
  const count=uv.length,words=count*5+2
  const ptr=kernel.exo_selection_metrics_alloc(words)
  if(!ptr)return null
  try {
    const buffer=new Float64Array(kernel.memory.buffer,ptr,words)
    for(let i=0;i<count;i++)buffer.set([uv[i][0],uv[i][1],live[i][0],live[i][1],live[i][2]],i*5)
    const status=kernel.exo_selection_metrics_interval(ptr,count,range[0],range[1],ptr+count*5*8)
    return status===1?{length2DCm:buffer[count*5],length3DCm:buffer[count*5+1]}:null
  } finally {kernel.exo_selection_metrics_free(ptr,words)}
}
