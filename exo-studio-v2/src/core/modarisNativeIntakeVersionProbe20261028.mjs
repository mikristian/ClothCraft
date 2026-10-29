import {inspectModarisNativeIntake20261028} from './modarisNativeFormatIntake20261028.mjs'
/** Bounded non-mutating header observation, NOT an MDL decoder. */
export function probeModarisNativeVersion20261028({fileName,bytes,companionNames=[]}={}){
 const intake=inspectModarisNativeIntake20261028({fileName,bytes,companionNames})
 if(!intake.ok)return {...intake,versionVerified:false,editable:false}
 const window=bytes.subarray(0,Math.min(4096,bytes.length))
 const text=[...window].map(v=>v===9||v===10||v===13||v>=32&&v<=126?String.fromCharCode(v):' ').join('')
 const markers=[...new Set((text.match(/\b(?:Modaris|Lectra|V(?:5|6|7|8|9)(?:R\d+)?)\b/gi)||[]).map(s=>s.slice(0,32)))].slice(0,12)
 return {...intake,headerMarkers:markers,versionVerified:false,encryptedState:'UNKNOWN',editable:false,roundTripVerified:false,
  warning:'Observed text markers are hints only: they cannot establish MDL variant, decryption status or safe editable geometry.'}
}
