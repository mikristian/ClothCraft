let native=null,loading=null,error=null
export const rustAvatarContactParametersStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',error})
export async function initializeRustAvatarContactParametersKernel({bytes,url='/wasm/exo_avatar_contact_parameters_kernel.wasm'}={}){
 if(native)return true
 if(loading)return loading
 loading=(async()=>{try{const data=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Avatar contact WASM HTTP ${r.status}`);return r.arrayBuffer()});const result=await WebAssembly.instantiate(data,{});const e=result.instance?.exports??result.exports;if(['exo_avatar_contact_parameters_abi_version','exo_avatar_layer_offset','exo_avatar_margin'].some(k=>typeof e?.[k]!=='function')||e.exo_avatar_contact_parameters_abi_version()!==1)throw Error('Unexpected avatar contact WASM ABI');native=e;error=null;return true}catch(caught){error=String(caught?.message??caught);return false}finally{loading=null}})();return loading
}
export const rustAvatarLayerOffset=(layer,thickness)=>native?native.exo_avatar_layer_offset(layer,thickness):layer*Math.max(.0025,thickness*1.15)
export const rustAvatarMargin=(base,thickness,offset)=>native?native.exo_avatar_margin(base,thickness,offset):base+thickness+offset
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustAvatarContactParametersKernel()
