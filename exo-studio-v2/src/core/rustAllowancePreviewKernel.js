// Rust/WASM seam allowance geometry, one packed call per visible cutline run.
// Null means WASM is unavailable and the editor can retain its synchronous path.
let kernel=null
let pending=null
let error=null
export const rustAllowancePreviewKernelReady=()=>Boolean(kernel)
export const rustAllowancePreviewKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',error})
export async function initializeRustAllowancePreviewKernel({bytes,url='/wasm/exo_allowance_preview_kernel.wasm'}={}){
  if(kernel)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const raw=bytes??await fetch(url).then(response=>{if(!response.ok)throw Error(`Allowance WASM HTTP ${response.status}`);return response.arrayBuffer()})
      const module=await WebAssembly.instantiate(raw,{})
      const api=module.instance?.exports??module.exports
      if(api?.exo_allowance_preview_abi_version?.()!==1||
        typeof api.exo_allowance_preview_capacity!=='function'||
        typeof api.exo_allowance_preview_input_ptr!=='function'||
        typeof api.exo_allowance_preview_output_ptr!=='function'||
        typeof api.exo_allowance_preview_process!=='function'||!api.memory)
        throw Error('Unexpected Rust allowance preview ABI')
      kernel=api;error=null;return true
    }catch(caught){error=String(caught?.message||caught);return false}
    finally{pending=null}
  })()
  return pending
}

export function rustAllowancePreviewPoints(points,width,miterLimit){
  if(!kernel||points.length>kernel.exo_allowance_preview_capacity())return null
  const input=new Float64Array(kernel.memory.buffer,kernel.exo_allowance_preview_input_ptr(),points.length*2)
  for(let i=0;i<points.length;i++){
    input[i*2]=points[i][0]
    input[i*2+1]=points[i][1]
  }
  const count=kernel.exo_allowance_preview_process(points.length,width,miterLimit)
  if(!Number.isSafeInteger(count)||count>points.length*2)return null
  const output=new Float64Array(kernel.memory.buffer,kernel.exo_allowance_preview_output_ptr(),count*2)
  const result=[]
  for(let i=0;i<count;i++)result.push([output[i*2],output[i*2+1]])
  return result
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustAllowancePreviewKernel()
