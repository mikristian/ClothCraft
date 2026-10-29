// Single-call, packed polyline WASM adapter. The public geometry module owns
// index validation and retains its exact synchronous API and JS fallback.
let kernel=null
let loading=null
let error=null
export const rustFreeSewingKernelReady=()=>Boolean(kernel)
export const rustFreeSewingKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',error})
export async function initializeRustFreeSewingKernel({bytes,url='/wasm/exo_free_sewing_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Free Sewing WASM HTTP ${r.status}`);return r.arrayBuffer()})
      const module=await WebAssembly.instantiate(raw,{})
      const exports=module.instance?.exports??module.exports
      if(exports?.exo_free_sewing_abi_version?.()!==1||typeof exports.exo_free_sewing_process!=='function'||
         typeof exports.exo_free_sewing_input_ptr!=='function'||typeof exports.exo_free_sewing_output_ptr!=='function'||
         typeof exports.exo_free_sewing_capacity!=='function'||!exports.memory)
        throw Error('Unexpected EXO Rust Free Sewing ABI')
      kernel=exports;error=null;return true
    }catch(caught){error=String(caught?.message||caught);return false}
    finally{loading=null}
  })()
  return loading
}

export function rustFreeSewingOperation(points,operation,a,b=0){
  if(!kernel||points.length>kernel.exo_free_sewing_capacity())return null
  const memory=kernel.memory.buffer
  const input=new Float64Array(memory,kernel.exo_free_sewing_input_ptr(),points.length*2)
  for(let i=0;i<points.length;i++){input[i*2]=points[i][0];input[i*2+1]=points[i][1]}
  const count=kernel.exo_free_sewing_process(operation,points.length,a,b)
  // A finite input can overflow intermediate WASM distance calculations.
  // Never surface non-finite sewing positions or lengths as valid annotations.
  if(!Number.isSafeInteger(count)||count<0||count>kernel.exo_free_sewing_capacity()*2)
    return operation===3?[]:undefined
  const values=new Float64Array(kernel.memory.buffer,kernel.exo_free_sewing_output_ptr(),count)
  if(operation===1)return count===5&&values.every(Number.isFinite)?{
    fraction:values[0],position:[values[1],values[2]],distance:values[3],lengthMetres:values[4],
  }:undefined
  if(operation===2)return count===2&&values.every(Number.isFinite)?[values[0],values[1]]:undefined
  if(operation===3){
    if(count%2!==0||!values.every(Number.isFinite))return []
    const output=[];for(let i=0;i<count;i+=2)output.push([values[i],values[i+1]]);return output
  }
  return null
}

if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined')void initializeRustFreeSewingKernel()
