import {createGradeSidecarCodec} from './nativeGradeSidecarCodec.js'
// Browser boundary accepts JSON text only. JSON.parse cannot create Proxies,
// accessors or custom prototypes; Node object callers retain util.types checks.
const codec=createGradeSidecarCodec({isProxy:()=>false})
const failure=error=>({ok:false,reason:error.message,manufacturingApproved:false})
const parse=text=>{if(typeof text!=='string')throw Error('Expected JSON text');return JSON.parse(text)}
export function encodeAccuMarkNativeGradeSidecar20261023(snapshotJson,rulesJson){
 try{return codec.encodeAccuMarkNativeGradeSidecar20261023(parse(snapshotJson),parse(rulesJson))}catch(e){return failure(e)}
}
export function decodeAccuMarkNativeGradeSidecar20261023(snapshotJson,sidecarJson){
 try{return codec.decodeAccuMarkNativeGradeSidecar20261023(parse(snapshotJson),sidecarJson)}catch(e){return failure(e)}
}
