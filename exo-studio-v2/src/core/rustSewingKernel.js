import { fetchWasmBytes } from './wasmTransport.js'
/** A small Rust/WASM numeric kernel used by the live 2D sewing inspector.
 * Preserve synchronous JS calculations until the Rust asset is initialized.
 */
const DEFAULT_URL='/wasm/exo_sewing_kernel.wasm'
export const RUST_SEWING_ABI_VERSION=1
let native=null
let loading=null
let error=null
const exportsRequired=['exo_sewing_abi_version','exo_sewing_signed_difference_cm',
  'exo_sewing_difference_percent','exo_sewing_warning']

export const rustSewingKernelReady=()=>Boolean(native)
export const rustSewingKernelStatus=()=>({
  backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_sewing_abi_version()??null,
  error,
})

export async function initializeRustSewingKernel({bytes,url=DEFAULT_URL}={}){
  if(native)return true
  if(loading)return loading
  loading=(async()=>{
    try{
      const data=bytes??await fetchWasmBytes(url, "Sewing WASM HTTP ")
      const instantiated=await WebAssembly.instantiate(data,{})
      const api=instantiated.instance?.exports??instantiated.exports
      if(exportsRequired.some(key=>typeof api?.[key]!=='function')||
        api.exo_sewing_abi_version()!==RUST_SEWING_ABI_VERSION)
        throw new Error('Unexpected EXO sewing WASM ABI')
      native=api
      error=null
      return true
    }catch(caught){
      native=null
      error=String(caught?.message??caught)
      return false
    }finally{loading=null}
  })()
  return loading
}

/** sewingLengthDiagnostic normally validates inputs; also guard this exported
 * adapter so direct callers cannot receive physically impossible annotations.
 * Null means the caller must use its validated JS fallback or omit the metric.
 */
export function rustSeamLengthMetrics(firstCm,secondCm,
  lengthThreshold,ratioThreshold,lengthOn,ratioOn){
  if(!native)return null
  if(![firstCm,secondCm,lengthThreshold,ratioThreshold].every(Number.isFinite)||
    firstCm<=0||secondCm<=0||lengthThreshold<0||ratioThreshold<0)return null
  const signedDifferenceCm=native.exo_sewing_signed_difference_cm(firstCm,secondCm)
  const absoluteDifferenceCm=Math.abs(signedDifferenceCm)
  const differencePercent=native.exo_sewing_difference_percent(firstCm,secondCm)
  const warning=Boolean(native.exo_sewing_warning(firstCm,secondCm,
    lengthThreshold,ratioThreshold,Number(lengthOn),Number(ratioOn)))
  if(![signedDifferenceCm,absoluteDifferenceCm,differencePercent].every(Number.isFinite))return null
  return {signedDifferenceCm,absoluteDifferenceCm,differencePercent,warning}
}

if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined'){
  void initializeRustSewingKernel()
}
