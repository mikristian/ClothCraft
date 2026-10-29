// Read-only integrity check for optional DXF entity handles. The EXO R12
// exporter does not author owner graphs; accepting a duplicate entity handle
// can make a receiving CAD system merge, replace or discard physical marks.
// This is a local defensive check, never independent receiver authentication.
const reject=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  entityHandlesVerified:false,independentReceiverAuthenticated:false,
  receiverCadVerified:false,aamaCertified:false,astmCertified:false,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})
const encoder=new TextEncoder()
function inspectWire(wire){
 if(typeof wire!=='string'||wire.length===0||encoder.encode(wire).length>16_000_000)
  throw Error('Missing or oversized DXF')
 const lines=wire.replace(/\r/g,'').split('\n')
 if(lines.at(-1)==='')lines.pop()
 if(lines.length%2||lines.length>400_000)throw Error('Malformed DXF group pairs')
 let section='',entity=false,entityHasHandle=false,handles=0
 const seen=new Set()
 for(let i=0;i<lines.length;i+=2){
  const raw=lines[i].trim(),value=lines[i+1].trim()
  if(!/^\d{1,4}$/.test(raw))throw Error('Invalid DXF group code')
  const code=Number(raw)
  if(code===0&&value==='SECTION'){
   if(lines[i+2]?.trim()!=='2')throw Error('Missing DXF section name')
   section=lines[i+3]?.trim();entity=false;entityHasHandle=false;continue
  }
  if(code===0&&value==='ENDSEC'){section='';entity=false;entityHasHandle=false;continue}
  if(section!=='ENTITIES')continue
  if(code===0){entity=true;entityHasHandle=false;continue}
  if(code===330||code===360)throw Error('Unverified owner/extension handle in generic R12 entity')
  if(code!==5)continue
  if(!entity)throw Error('Orphan entity handle')
  if(entityHasHandle)throw Error('Multiple handles on one DXF entity')
  if(!/^[0-9A-Fa-f]{1,16}$/.test(value))throw Error('Invalid hexadecimal entity handle')
  const normalized=value.toUpperCase().replace(/^0+/,'')
  if(!normalized)throw Error('Zero entity handle')
  if(seen.has(normalized))throw Error('Duplicate DXF entity handle')
  seen.add(normalized);handles++;entityHasHandle=true
 }
 return handles
}

/** Every graded size must be present. Optional unique DXF entity handles may
 * survive re-export, but dangling owner graphs and duplicates are blocked.
 * Does not attest a licensed CAD import, AAMA/ASTM exchange or cutter release.
 */
export function inspectIndustrialReceivingDxfHandleIntegrity20261028(project,wiresBySize){
 try{
  const sizes=project?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
    !sizes.includes(project.grading.baseSize)||new Set(sizes).size!==sizes.length||
    !wiresBySize||typeof wiresBySize!=='object'||Array.isArray(wiresBySize)||
    Object.keys(wiresBySize).length!==sizes.length||
    sizes.some(size=>typeof size!=='string'||!size.trim()||!Object.hasOwn(wiresBySize,size)))
   return reject('INVALID_RECEIVER_HANDLE_SIZE_SET')
  const rows=[];let totalBytes=0
  for(const size of sizes){
   const wire=wiresBySize[size]
   totalBytes+=typeof wire==='string'?encoder.encode(wire).length:0
   if(totalBytes>64_000_000)return reject('RECEIVER_HANDLE_WIRE_LIMIT')
   try{rows.push({size,uniqueEntityHandles:inspectWire(wire)})}
   catch(error){return reject('RECEIVER_ENTITY_HANDLE_DRIFT',`${size}: ${error.message}`)}
  }
  return {ok:true,status:'LOCAL_DXF_ENTITY_HANDLES_INSPECTED',issues:[],rows,
   entityHandlesVerified:true,independentReceiverAuthenticated:false,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'Optional R12 entity handle uniqueness only; no owner graph, licensed receiving CAD proof or factory authorization.'}
 }catch(error){return reject('RECEIVER_ENTITY_HANDLE_INSPECTION_REFUSED',String(error.message||error))}
}
