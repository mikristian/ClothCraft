import { fetchWasmBytes } from './wasmTransport.js'
/** Rust numerical projection for the existing synchronous PBD distance pass.
 * Special seam dispatch and the actual THREE objects are still owned by JS.
 */
export const RUST_DISTANCE_CONSTRAINT_ABI_VERSION=1
let native=null,pending=null,error=null,calls=0,resultView=null
export const rustDistanceConstraintStatus=()=>({backend:native?'rust-wasm':'javascript-fallback',
  abiVersion:native?.exo_distance_constraint_abi_version()??null,calls,error})
export async function initializeRustDistanceConstraintKernel({bytes,url='/wasm/exo_distance_constraint_kernel.wasm'}={}){
  if(native)return true
  if(pending)return pending
  pending=(async()=>{
    try{
      const data=bytes??await fetchWasmBytes(url, "Distance constraint WASM HTTP ")
      const module=await WebAssembly.instantiate(data,{})
      const e=module.instance?.exports??module.exports
      if(e.exo_distance_constraint_abi_version?.()!==RUST_DISTANCE_CONSTRAINT_ABI_VERSION||
        typeof e.exo_distance_constraint_project!=='function'||!(e.memory instanceof WebAssembly.Memory))
        throw Error('Unexpected distance constraint WASM ABI')
      native=e;error=null;return true
    }catch(cause){error=String(cause?.message||cause);return false}
    finally{pending=null}
  })()
  return pending
}

/** true means native projection handled the input, including an early no-op. */
export function projectRustDistanceConstraint(constraint){
  if(!native)return false
  const {a,b,rest,stiffness,type}=constraint
  if(!a?.position?.set||!b?.position?.set)return false
  const wa=a.invMass,wb=b.invMass
  const ap=a.position,bp=b.position
  const ax=ap.x,ay=ap.y,az=ap.z,bx=bp.x,by=bp.y,bz=bp.z
  if(!Number.isFinite(ax)||!Number.isFinite(ay)||!Number.isFinite(az)||
    !Number.isFinite(bx)||!Number.isFinite(by)||!Number.isFinite(bz)||
    !Number.isFinite(rest)||!Number.isFinite(stiffness)||
    !Number.isFinite(wa)||!Number.isFinite(wb))return false
  const ptr=native.exo_distance_constraint_project(ax,ay,az,bx,by,bz,
    rest,stiffness,wa,wb,type==='fuse'?1:0)
  if(!resultView||resultView.byteOffset!==ptr||resultView.buffer!==native.memory.buffer)
    resultView=new Float64Array(native.memory.buffer,ptr,7)
  const out=resultView
  calls++
  if(out[6]===0)return true
  // Guard any overflow result: the JS fallback owns malformed/overflow policy.
  if(!Number.isFinite(out[0])||!Number.isFinite(out[1])||!Number.isFinite(out[2])||
    !Number.isFinite(out[3])||!Number.isFinite(out[4])||!Number.isFinite(out[5]))return false
  if(wa>0)ap.set(out[0],out[1],out[2])
  if(type!=='fuse'&&wb>0)bp.set(out[3],out[4],out[5])
  return true
}
if(typeof window!=='undefined'&&typeof WebAssembly!=='undefined'&&typeof fetch==='function')
  void initializeRustDistanceConstraintKernel()
