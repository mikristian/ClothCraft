let native=null,loading=null,lastError=null
export const rustQualityFlipStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',error:lastError})
export async function initializeRustQualityFlipKernel({bytes,url='/wasm/exo_quality_flip_kernel.wasm'}={}){
  if(native)return true
  if(loading)return loading
  loading=(async()=>{try{const input=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Quality flip WASM HTTP ${r.status}`);return r.arrayBuffer()});const result=await WebAssembly.instantiate(input,{env:{hypot:Math.hypot}});const e=result.instance?.exports??result.exports;if(['exo_quality_flip_abi_version','exo_convex_quad','exo_quality_flip_better'].some(k=>typeof e?.[k]!=='function')||e.exo_quality_flip_abi_version()!==1)throw Error('Unexpected quality flip WASM ABI');native=e;lastError=null;return true}catch(error){lastError=String(error?.message??error);return false}finally{loading=null}})();return loading
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const quality=(a,b,c)=>{const twice=Math.abs(cross(a,b,c));const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]));return twice>1e-11?longest*longest/twice:Infinity}
export function rustConvexQuad(a,b,c,d){return native?Boolean(native.exo_convex_quad(...a,...b,...c,...d)):!(cross(a,b,c)*cross(a,b,d)>=-1e-10||cross(c,d,a)*cross(c,d,b)>=-1e-10)}
export function rustQualityFlipBetter(a,b,c,d,minImprovement){return native?Boolean(native.exo_quality_flip_better(...a,...b,...c,...d,minImprovement)):Math.max(quality(c,d,a),quality(d,c,b))<Math.max(quality(a,b,c),quality(b,a,d))*(1-minImprovement)}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')void initializeRustQualityFlipKernel()
