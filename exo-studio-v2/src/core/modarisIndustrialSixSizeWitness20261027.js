import {gradeProject} from './grading.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {auditAccuMarkGradedDxfRoundtrip20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {projectToDxf} from './dxf.js'
import {sha256Bytes} from './sha256Bytes.js'

const reject=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freeze(child)
  Object.freeze(value)
}return value}
const pure=value=>JSON.parse(JSON.stringify(value))
function canonical(value,depth=0){
  if(depth>48)throw Error('Pattern audit exceeds depth limit')
  if(value===null||typeof value==='boolean'||typeof value==='string'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value)
  if(Array.isArray(value)&&value.length<32768&&Object.keys(value).length===value.length)return `[${value.map(v=>canonical(v,depth+1)).join(',')}]`
  if(value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).length<32768){
    return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k],depth+1)}`).join(',')}}`
  }
  throw Error('Unsupported or nonfinite source/proof metadata')
}
const digest=value=>`sha256:${sha256Bytes(new TextEncoder().encode(typeof value==='string'?value:canonical(value)))}`
/**
 * Joined independent industrial checks across all six sizes:
 * real stitch and allowance CUT geometry; exported DXF receiving contours,
 * mark counts, physical positions, identities and unit guard.
 *
 * This is a deterministic DEVELOPMENT RELEASE WITNESS, not factory approval:
 * no calibrated shrinkage, cutter, fit sample or licensed Modaris receiver.
 */
export function auditModarisIndustrialSixSizeWitness20261027(project,{expectedRevision,wireForSize}={}){
  try{
    if(!project||!Number.isSafeInteger(project.revision)||project.revision!==expectedRevision)
      throw Error('Stale or absent source project revision')
    const sourceSignature=digest(project)
    const sizes=project.grading?.sizes
    if(!Array.isArray(sizes)||JSON.stringify(sizes)!==JSON.stringify(['XS','S','M','L','XL','XXL']))
      throw Error('Exactly six ordered XS–XXL industrial sizes are required')
    if(!Array.isArray(project.pieces)||!project.pieces.length||!Array.isArray(project.seams))
      throw Error('A complete authored pattern/seam source is required')
    for(const piece of project.pieces){
      if(!piece||typeof piece.id!=='string'||!piece.id||piece.patternImportProvenance?.referenceOnly===true)
        throw Error('Reference-only, invalid or missing piece identity')
    }
    const shapes=inspectGradedCutlines(project,{sizes})
    if(shapes.status!=='pass'||shapes.blockers!==0||shapes.checks.length!==sizes.length*project.pieces.length)
      throw Error(`Physical six-size STITCH/CUT polygon blocked: ${(shapes.issues||[]).map(x=>x.code).slice(0,10).join(', ')}`)
    if(shapes.checks.some(check=>!check.cutlinePass||!Number.isFinite(check.stitchAreaCm2)||
      !Number.isFinite(check.cutAreaCm2)||check.cutAreaCm2<=0||check.stitchAreaCm2<=0))
      throw Error('Invalid graded physical STITCH/CUT geometry')
    const received=auditAccuMarkGradedDxfRoundtrip20261023(project,{wireForSize})
    if(!received.ok||received.rows.length!==sizes.length||received.rows.some(row=>!row.ok))
      throw Error(`Independent graded DXF CUT/STITCH receiver refused: ${(received.issues||[]).map(x=>x.code).slice(0,10).join(', ')}`)
    const rows=[]
    for(const size of sizes){
      const graded=gradeProject(project,size)
      if(graded.previewSize!==size||graded.pieces.length!==project.pieces.length)
        throw Error('Incomplete native graded geometry witness')
      for(const [i,piece] of graded.pieces.entries()){
        const origin=project.pieces[i]
        if(piece.id!==origin.id||piece.points.length!==origin.points.length||
          JSON.stringify((piece.notches??[]).map(n=>[n.id,n.edgeIndex,n.type]))!==
            JSON.stringify((origin.notches??[]).map(n=>[n.id,n.edgeIndex,n.type])))
          throw Error('Graded piece/notch identity changed')
      }
      const scoped=shapes.checks.filter(row=>row.size===size)
      const receiver=received.rows.find(row=>row.size===size)
      if(scoped.length!==project.pieces.length||!receiver)throw Error('Missing industrial six-size receiver row')
      const wire=wireForSize?wireForSize(size,graded):projectToDxf(graded,size,{cutlineMode:'manufacturing'})
      if(typeof wire!=='string'||wire.length>16e6)throw Error('Invalid or oversized graded DXF')
      rows.push({size,sourceRevision:project.revision,pieceIds:graded.pieces.map(p=>p.id),
        cutContourCount:scoped.length,stitchContourCount:scoped.length,
        physicalCutAreaCm2:scoped.reduce((sum,x)=>sum+x.cutAreaCm2,0),
        stitchAreaCm2:scoped.reduce((sum,x)=>sum+x.stitchAreaCm2,0),
        notchCount:graded.pieces.reduce((n,p)=>n+(p.notches??[]).length,0),
        dxfByteCount:new TextEncoder().encode(wire).length,dxfSha256:digest(wire),
        receiverChecks:receiver.pieces.length,receiverOk:receiver.ok})
    }
    if(digest(project)!==sourceSignature)throw Error('Source changed while auditing')
    return freeze({ok:true,sourceRevision:project.revision,sourceSha256:sourceSignature,
      witnessSha256:digest(rows),sizes:[...sizes],rows,
      physicalContourCount:shapes.checks.length,
      independentDXFReceiverChecked:true,externalModarisReceiverChecked:false,
      manufacturingApproved:false,
      limitations:'24+ physical CUT/STITCH contour checks and 6 independent internal DXF receiver cases. Licensed Modaris MDL, physical cutter, actual fabric shrinkage and external fit approval remain unverified.'})
  }catch(error){return reject(error?.message||String(error))}
}

/** Re-audit the actual current six-size geometry; never trust an old digest. */
export function verifyModarisIndustrialSixSizeWitness20261027(project,previous){
  const fresh=auditModarisIndustrialSixSizeWitness20261027(project,{expectedRevision:project?.revision})
  if(!fresh.ok)return fresh
  if(!previous?.ok||previous.sourceRevision!==fresh.sourceRevision||
     previous.sourceSha256!==fresh.sourceSha256||previous.witnessSha256!==fresh.witnessSha256||
     canonical(previous.rows)!==canonical(fresh.rows))
    return reject('Stale, altered or incompatible physical industrial size-run witness')
  return freeze({ok:true,sourceRevision:fresh.sourceRevision,sizes:[...fresh.sizes],
    industrialProofVerified:true,externalModarisReceiverChecked:false,manufacturingApproved:false})
}
