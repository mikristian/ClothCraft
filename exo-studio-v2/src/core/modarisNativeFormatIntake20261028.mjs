/** Read-only compatibility preflight. No reverse-engineering guesses, decryption,
 * native MDL serialization, implicit schema interpretation or project mutation.
 * Real Modaris receiving applications are mandatory for certification. */
const EXTENSIONS=Object.freeze({mdl:'lectra-modaris-native-model',vet:'lectra-legacy-vet',iba:'lectra-legacy-iba',dxf:'cad-dxf-exchange',rul:'aama-astm-grading-rules',zip:'exchange-package'})
const invalid=(code,detail='')=>({ok:false,code,detail,editable:false,roundTripVerified:false,nativeCompatible:false,externalReceiverAccepted:false})
const inspect=(bytes)=>{
 let printable=0,zero=0
 for(const b of bytes){if(b===0)zero++;if(b===9||b===10||b===13||b>=32&&b<=126)printable++}
 return {bytes:bytes.byteLength,zeroBytes:zero,printableFraction:bytes.length?+(printable/bytes.length).toFixed(4):0,
  kind:zero?'opaque-binary':printable/bytes.length>.95?'text-like':'opaque-or-mixed'}
}
export function inspectModarisNativeIntake20261028({fileName,bytes,companionNames=[]}={}){
 if(typeof fileName!=='string'||fileName.length>240||/[/\\\x00-\x1f]/.test(fileName))return invalid('INVALID_FILE_NAME')
 const extension=fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
 if(!Object.hasOwn(EXTENSIONS,extension))return invalid('UNSUPPORTED_EXTENSION','No registered CAD exchange profile')
 if(!(bytes instanceof Uint8Array)||bytes.length<4||bytes.length>64*1024*1024)return invalid('INVALID_FILE_BYTES','Explicit in-memory bytes between 4 B and 64 MiB required')
 if(!Array.isArray(companionNames)||companionNames.length>100||companionNames.some(n=>typeof n!=='string'||n.length>240||/[/\\\x00-\x1f]/.test(n)))return invalid('INVALID_COMPANION_SET')
 const observation=inspect(bytes)
 const stem=fileName.slice(0,-extension.length-1).toLowerCase()
 const companionExtensions=[...new Set(companionNames.filter(name=>name.toLowerCase().startsWith(stem+'.')).map(name=>name.split('.').at(-1).toLowerCase()))].sort()
 const isProprietary=['mdl','vet','iba'].includes(extension)
 return {ok:true,status:isProprietary?'UNSUPPORTED_NATIVE_FORMAT':'FORMAT_OBSERVED_NOT_RECEIVER_VERIFIED',
  fileName,extension,format:EXTENSIONS[extension],observation,companionExtensions,
  editable:false,nativeCompatible:false,roundTripVerified:false,externalReceiverAccepted:false,
  importEnabled:false,exportEnabled:false,manufacturerApproved:false,
  reason:isProprietary?'EXO does not implement or certify a native Lectra reader/writer. Preserve original bytes and obtain a licensed receiver/conversion fixture.':'File profile must pass independent grammar, grade, size and receiving CAD validation before editable import.'}
}
