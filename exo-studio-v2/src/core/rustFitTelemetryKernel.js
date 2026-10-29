let native=null,loading=null,error=null
export const rustFitTelemetryStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',error})
export async function initializeRustFitTelemetryKernel({bytes,url='/wasm/exo_fit_telemetry_kernel.wasm'}={}){
  if(native)return true
  if(loading)return loading
  loading=(async()=>{try{const input=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Fit telemetry WASM HTTP ${r.status}`);return r.arrayBuffer()});const result=await WebAssembly.instantiate(input,{});const e=result.instance?.exports??result.exports;if(typeof e?.exo_fit_threshold!=='function'||typeof e?.exo_fit_telemetry_abi_version!=='function'||e.exo_fit_telemetry_abi_version()!==1)throw Error('Unexpected fit telemetry WASM ABI');native=e;error=null;return true}catch(caught){error=String(caught?.message??caught);return false}finally{loading=null}})();return loading
}
export function rustFitThreshold(value,limit){return native?native.exo_fit_threshold(value,limit):!Number.isFinite(value)?0:value>limit?2:1}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustFitTelemetryKernel()
