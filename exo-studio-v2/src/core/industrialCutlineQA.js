import {gradeProject} from './grading.js'
import {getEdgeSeamAllowance, samplePieceBoundary,seamAllowanceBoundary} from './project.js'
import {inspectCutlinePolygon} from './cutlineTopology.js'

/** Inspect source stitchline and manufacturing CUT for every graded size.
 * Pattern topology is necessary but insufficient for actual factory cutting.
 */
export function inspectGradedCutlines(project,{sizes=project?.grading?.sizes||[]}={}) {
 const issues=[],checks=[]
 const add=(code,scope,message)=>issues.push({code,severity:'blocker',scope,message})
 if(!project?.pieces?.length||!Array.isArray(sizes)||!sizes.length||new Set(sizes).size!==sizes.length){
  add('INVALID_SIZE_RUN','Project','Complete graded piece inventory and unique size labels required.')
  return finish()
 }
 for(const size of sizes){
  let graded
  try{graded=gradeProject(project,size)}catch(error){add('GRADING_FAILED',size,error.message);continue}
  for(const piece of graded.pieces){
   const scope=`${piece.id} / ${size}`
   const stitch=samplePieceBoundary(piece,12).points
   const cut=seamAllowanceBoundary(piece,12)
   const stitchQA=inspectCutlinePolygon(stitch)
   const cutQA=inspectCutlinePolygon(cut)
   const allowances=(piece.points||[]).map((_,i)=>getEdgeSeamAllowance(piece,i))
   const hasAllowance=allowances.some(v=>v>0)
   if(!stitchQA.ok)for(const fault of stitchQA.faults)add(`STITCH_${fault.code}`,scope,fault.detail)
   if(!cutQA.ok)for(const fault of cutQA.faults)add(fault.code,scope,fault.detail)
   if(allowances.some(value=>!Number.isFinite(value)||value<0))add('INVALID_ALLOWANCE',scope,'Every seam allowance must be finite and nonnegative.')
   if(hasAllowance&&cutQA.areaCm2<=stitchQA.areaCm2+0.01){
    add('CUTLINE_NOT_OUTSIDE_STITCHLINE',scope,'Physical cutting boundary must exceed sewn outline area when the piece has positive allowances.')
   }
   checks.push({size,pieceId:piece.id,cutAreaCm2:cutQA.areaCm2,stitchAreaCm2:stitchQA.areaCm2,
    additionalCutAreaCm2:cutQA.areaCm2-stitchQA.areaCm2,hasAllowance,cutlinePass:cutQA.ok&&stitchQA.ok,
    factoryCertified:false})
  }
 }
 return finish()
 function finish(){return {status:issues.length?'blocked':'pass',blockers:issues.length,
  checks,issues,sizes:[...sizes],factoryCertified:false,
  note:'Cutline geometry is not fabric-shrinkage, cutter, industrial grade-rule, paper-scale, or physical sample acceptance.'}}
}
