import { gradeProject } from './grading.js'
import { projectToDxf } from './dxf.js'
import { parseAccuMarkGradedDxfWire20261023 } from './accumarkGradedDxfRoundtripAudit20261023.js'
import { sha256Bytes } from './sha256Bytes.js'

const bytes = value => new TextEncoder().encode(value)
const hash = value => sha256Bytes(bytes(value))
const bad = (code, detail) => ({code, detail:String(detail).slice(0,240)})
const pointNear = (a,b,t) => Math.hypot(a.x-b.x,a.y-b.y)<=t
const normal = entity => ({
  type:entity.type,
  layer:entity.layer,
  closed:entity.closed,
  points:entity.type==='LINE'
    ? [{x:entity.values[10],y:entity.values[20]},{x:entity.values[11],y:entity.values[21]}]
    : entity.points,
})
function sameEntity(a,b,t){
  if(a.type!==b.type||a.layer!==b.layer||a.closed!==b.closed||a.points.length!==b.points.length)return false
  const n=a.points.length
  if(a.type==='LINE')return a.points.every((p,i)=>pointNear(p,b.points[i],t))
  for(let start=0;start<n;start++)for(const direction of [1,-1]){
    if(a.points.every((p,i)=>pointNear(p,b.points[(start+direction*i+n*2)%n],t)))return true
  }
  return false
}
function compareGeometry(reference,returned,t){
  const left=reference.entities.map(normal),right=returned.entities.map(normal)
  if(left.length!==right.length)return bad('ENTITY_COUNT_MISMATCH',`expected ${left.length} received ${right.length}`)
  const unmatched=[...right]
  for(const entity of left){
    const index=unmatched.findIndex(candidate=>sameEntity(entity,candidate,t))
    if(index<0)return bad('GEOMETRY_MISMATCH',`${entity.type} ${entity.layer} does not match parsed coordinates`)
    unmatched.splice(index,1)
  }
  return null
}

/**
 * Local six-size DXF interchange evidence. Returned DXF bytes must be supplied
 * by the caller; parsing and geometry parity do not establish licensed CAD use.
 * Rule and project identities are SHA-256 pinned to the provided source snapshot.
 */
export function auditNativeGradeCadRoundtripEvidence20261026(project,{
  returnedDxfs, sourceSnapshot, ruleSnapshot, declaredSourceSha256,
  declaredRuleSha256, toleranceMm=0.012
}={}){
  const report={schema:'exo.native-grade-cad-roundtrip-evidence.v1',ok:false,
    status:'LOCAL_DXF_GEOMETRY_UNVERIFIED',sourceSha256:null,ruleSha256:null,
    sizes:[],issues:[],receivingCadVerified:false,physicalSampleApproved:false,
    factoryApproved:false,externalReceiverEvidenceRequired:true}
  const issue=(code,detail)=>report.issues.push(bad(code,detail))
  try{
    const sizes=project?.grading?.sizes
    if(!Array.isArray(sizes)||sizes.length!==6||sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==6||
      !sizes.includes(project.grading.baseSize))throw Error('Exactly six distinct source sizes including base size required')
    if(typeof sourceSnapshot!=='string'||typeof ruleSnapshot!=='string'||!sourceSnapshot||!ruleSnapshot)throw Error('Explicit source and grading-rule snapshots required')
    if(!(toleranceMm>=0&&toleranceMm<=0.1&&Number.isFinite(toleranceMm)))throw Error('Invalid millimeter tolerance')
    const actualSource=JSON.stringify(project)
    const actualRule=JSON.stringify(project.grading)
    if(sourceSnapshot!==actualSource||ruleSnapshot!==actualRule)throw Error('Source or rule snapshot differs from current project')
    report.sourceSha256=hash(sourceSnapshot)
    report.ruleSha256=hash(ruleSnapshot)
    if(declaredSourceSha256!==report.sourceSha256||declaredRuleSha256!==report.ruleSha256)throw Error('Source or rule SHA-256 pin mismatch')
    if(!returnedDxfs||Object.getPrototypeOf(returnedDxfs)!==Object.prototype||
      Reflect.ownKeys(returnedDxfs).length!==6||
      sizes.some(size=>!Object.hasOwn(returnedDxfs,size)))throw Error('One returned DXF per exact source size required')
    for(const size of sizes){
      const row={size,sourceDxfSha256:null,returnedDxfSha256:null,parsedEntityCount:0,geometryEqual:false}
      report.sizes.push(row)
      try{
        const graded=gradeProject(project,size)
        const sourceWire=projectToDxf(graded,size,{cutlineMode:'manufacturing'})
        const returned=Object.getOwnPropertyDescriptor(returnedDxfs,size)
        if(!returned||!Object.hasOwn(returned,'value')||typeof returned.value!=='string'||
          returned.value.length>16_000_000)throw Error('Returned wire invalid or excessively large')
        const receiverWire=returned.value
        row.sourceDxfSha256=hash(sourceWire)
        row.returnedDxfSha256=hash(receiverWire)
        const expected=parseAccuMarkGradedDxfWire20261023(sourceWire)
        const received=parseAccuMarkGradedDxfWire20261023(receiverWire)
        if(!expected.ok||!received.ok){issue('DXF_PARSE_REJECTED',`${size}: ${JSON.stringify([...expected.issues,...received.issues]).slice(0,160)}`);continue}
        if(!received.entities.length){issue('EMPTY_GEOMETRY',size);continue}
        const expectedLabel=`999\nGARMENT_STUDIO_SIZE ${size}`
        if(!receiverWire.includes(expectedLabel)||receiverWire.split(expectedLabel).length!==2){
          issue('SIZE_LABEL_MISMATCH',size);continue
        }
        if(!receiverWire.includes('CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY')){
          issue('CUT_SEMANTICS_MISSING',size);continue
        }
        const mismatch=compareGeometry(expected,received,toleranceMm)
        if(mismatch){issue(mismatch.code,`${size}: ${mismatch.detail}`);continue}
        row.parsedEntityCount=received.entities.length
        row.geometryEqual=true
      }catch(error){issue('SIZE_REJECTED',`${size}: ${error.message}`)}
    }
    report.ok=report.issues.length===0&&report.sizes.every(row=>row.geometryEqual)
    report.status=report.ok?'LOCAL_SIX_SIZE_DXF_PARITY_ONLY':'LOCAL_DXF_GEOMETRY_REJECTED'
    report.manifest={schema:'exo.native-grade-cad-roundtrip-manifest.v1',
      sourceSha256:report.sourceSha256,ruleSha256:report.ruleSha256,
      sizes:report.sizes.map(row=>({...row})),
      externalReceivingCadApplication:null,externalOperator:null,externalReceivingEvidence:null,
      signedSampleEvidence:null,factoryApproved:false}
    return report
  }catch(error){issue('PROVENANCE_REJECTED',error.message);return report}
}
