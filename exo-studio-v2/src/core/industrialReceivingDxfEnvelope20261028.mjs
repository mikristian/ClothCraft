// Machine-neutral, fail-closed inspection of non-entity DXF receiving metadata.
// CUT/STITCH/notch parity does not inspect layer TABLES, BLOCKS, HEADER or EOF.
// This local R12 profile is NOT ASTM/AAMA certification or receiver authentication.
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'

const MAX_WIRE=16_000_000
const MAX_PAIRS=200_000
const deny=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  receivingEnvelopeVerified:false,independentReceiverAuthenticated:false,
  receiverCadVerified:false,aamaCertified:false,astmCertified:false,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})

function pairs(wire){
 if(typeof wire!=='string'||!wire.length||wire.length>MAX_WIRE)throw Error('Missing or oversized DXF wire')
 const lines=wire.replace(/\r/g,'').split('\n')
 if(lines.at(-1)==='')lines.pop()
 if(lines.length%2||lines.length/2>MAX_PAIRS)throw Error('Malformed or excessive DXF group pairs')
 const result=[]
 for(let i=0;i<lines.length;i+=2){
  const code=lines[i].trim(),value=lines[i+1].trim()
  if(!/^(0|[1-9][0-9]{0,3})$/.test(code)||Number(code)>1071)throw Error('Invalid DXF group code')
  result.push([Number(code),value])
 }
 return result
}
const is=(row,code,value)=>row?.[0]===code&&row?.[1]===value
const positions=(rows,code,value)=>rows.flatMap((row,index)=>is(row,code,value)?[index]:[])

function envelope(wire){
 const rows=pairs(wire)
 const starts=positions(rows,0,'SECTION')
 const ends=positions(rows,0,'ENDSEC')
 const eof=positions(rows,0,'EOF')
 if(starts.length!==2||ends.length!==2||eof.length!==1||
  starts[0]!==0||!is(rows[starts[0]+1],2,'HEADER')||
  !is(rows[starts[1]+1],2,'ENTITIES')||
  !(starts[0]<ends[0]&&ends[0]<starts[1]&&starts[1]<ends[1])||
  eof[0]!==rows.length-1||ends[1]!==eof[0]-1)
  throw Error('Unexpected DXF sections, trailing payload or incomplete EOF')
 // The entire pre-ENTITIES envelope is authoritative: no silently added
 // layer visibility/plot flags, coordinate origin, blocks or import units.
 const prefix=rows.slice(0,starts[1])
 if(prefix.some(([code,value])=>code===0&&value!=='SECTION'&&value!=='ENDSEC'))
  throw Error('Unexpected non-entity DXF command')
 return {prefix,sectionCount:starts.length,headerFields:prefix.length,
  entityGroupPairs:ends[1]-starts[1]-2}
}

/** Compare each received size against the exact EXO-authored R12 envelope.
 * The actual entity order and equivalent numeric formatting remain handled by
 * the independent CUT/notch and all-entity inventory inspectors. Receiving
 * CAD that adds legitimate TABLES/BLOCKS needs a separately audited profile.
 */
export function inspectIndustrialReceivingDxfEnvelope20261028(project,wiresBySize){
 try{
  const sizes=project?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
   new Set(sizes).size!==sizes.length||!sizes.includes(project.grading.baseSize)||
   !wiresBySize||typeof wiresBySize!=='object'||Array.isArray(wiresBySize)||
   Object.keys(wiresBySize).length!==sizes.length||
   sizes.some(size=>typeof size!=='string'||!size.trim()||!Object.hasOwn(wiresBySize,size)))
   return deny('INVALID_DXF_ENVELOPE_SIZE_SET')
  let bytes=0
  const rows=[]
  for(const size of sizes){
   const wire=wiresBySize[size]
   bytes+=typeof wire==='string'?byteLength(wire):0
   if(bytes>64_000_000)return deny('DXF_ENVELOPE_SIZE_LIMIT')
   const authored=projectToDxf(gradeProject(project,size),size,
    {cutlineMode:'manufacturing',requireGradedGeometry:true})
   const reference=envelope(authored),received=envelope(wire)
   if(reference.prefix.length!==received.prefix.length||
    reference.prefix.some((pair,i)=>pair[0]!==received.prefix[i][0]||pair[1]!==received.prefix[i][1]))
    return deny('RECEIVER_DXF_ENVELOPE_DRIFT',`${size}: header, layer policy, comments or units differ`)
   rows.push({size,headerFields:reference.headerFields,
    entityGroupPairs:received.entityGroupPairs,profile:'EXO_GENERIC_R12_HEADER_ENTITIES_ONLY'})
  }
  return {ok:true,status:'LOCAL_RECEIVER_DXF_ENVELOPE_MATCH',issues:[],rows,
   receivingEnvelopeVerified:true,independentReceiverAuthenticated:false,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'Strict EXO-authored generic R12 header/section profile only; no third-party CAD authentication, AAMA/ASTM compliance or cutter authorization.'}
 }catch(error){return deny('RECEIVER_DXF_ENVELOPE_REFUSED',String(error.message||error))}
}

// TextEncoder is available in both Node and the browser; avoid Buffer-only APIs.
const encoder=new TextEncoder()
function byteLength(value){return encoder.encode(value).length}
