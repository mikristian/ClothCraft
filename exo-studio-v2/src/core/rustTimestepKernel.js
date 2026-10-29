let native=null,loading=null,error=null
export const rustTimestepStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',error})
export async function initializeRustTimestepKernel({bytes,url='/wasm/exo_timestep_kernel.wasm'}={}){
 if(native)return true
 if(loading)return loading
 loading=(async()=>{try{const input=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Timestep WASM HTTP ${r.status}`);return r.arrayBuffer()});const result=await WebAssembly.instantiate(input,{env:{round:Math.round,ceil:Math.ceil}});const e=result.instance?.exports??result.exports;const required=['exo_timestep_abi_version','exo_timestep_substeps','exo_timestep_requested','exo_timestep_iterations','exo_timestep_subdt','exo_timestep_gravity_step','exo_timestep_collision_distance'];if(required.some(k=>typeof e?.[k]!=='function')||e.exo_timestep_abi_version()!==1)throw Error('Unexpected timestep WASM ABI');native=e;error=null;return true}catch(caught){error=String(caught?.message??caught);return false}finally{loading=null}})();return loading
}
export const rustSubsteps=x=>native?native.exo_timestep_substeps(x):Math.max(1,Math.min(4,Math.round(x)))
export const rustRequestedIterations=x=>native?native.exo_timestep_requested(x):Math.max(2,Math.min(14,x))
export const rustIterations=(requested,substeps)=>native?native.exo_timestep_iterations(requested,substeps):Math.max(2,Math.ceil(requested/substeps))
export const rustSubDt=(safeDt,substeps)=>native?native.exo_timestep_subdt(safeDt,substeps):safeDt/substeps
export const rustGravityStep=(gravity,subDt)=>native?native.exo_timestep_gravity_step(gravity,subDt):gravity*subDt*subDt
export const rustCollisionDistance=(thickness,margin)=>native?native.exo_timestep_collision_distance(thickness,margin):Math.max(.004,thickness*2+margin)
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustTimestepKernel()
