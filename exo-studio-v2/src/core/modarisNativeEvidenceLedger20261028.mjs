import {inspectModarisNativeIntake20261028} from './modarisNativeFormatIntake20261028.mjs'
/** Review-only immutable evidence inventory for real OEM CAD exchange captures.
 * Original files remain with their owners; this manifest never stores bytes.
 * It never claims an EXO reader/writer exists for proprietary formats.
 */
const hashPattern=/^[0-9a-f]{64}$/i
const idPattern=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/
const invalid=(code,detail)=>({ok:false,code,detail,nativeEditable:false,roundTripVerified:false,approved:false})
export function registerModarisIntakeEvidence20261028({fileName,bytes,sha256,companionNames=[],receiverEvidence=null}={}){
 const intake=inspectModarisNativeIntake20261028({fileName,bytes,companionNames})
 if(!intake.ok)return invalid(intake.code,intake.detail)
 if(!hashPattern.test(sha256??''))return invalid('MISSING_SHA256','A source-file SHA-256 must be supplied by the trusted caller')
 if(receiverEvidence!==null){
  if(!receiverEvidence||typeof receiverEvidence!=='object'||Array.isArray(receiverEvidence)||!idPattern.test(receiverEvidence.application||'')||!idPattern.test(receiverEvidence.version||'')||!idPattern.test(receiverEvidence.operatorId||'')||!Array.isArray(receiverEvidence.artifacts)||!receiverEvidence.artifacts.length||receiverEvidence.artifacts.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9._-]{1,200}$/.test(x)))return invalid('INVALID_RECEIVER_EVIDENCE')
 }
 return {ok:true,schema:'exo.modaris-intake-evidence.v1',fileName:intake.fileName,extension:intake.extension,format:intake.format,byteCount:bytes.length,sha256:sha256.toLowerCase(),companionExtensions:intake.companionExtensions,observation:intake.observation,receiverEvidence:receiverEvidence?{...receiverEvidence,claimedOnly:true}:null,nativeEditable:false,roundTripVerified:false,approved:false,externalReceiverAccepted:false,limitations:['No proprietary file parsing or edit support','No validated Modaris receiver roundtrip','No approval implied from claimed evidence or hashes']}
}
