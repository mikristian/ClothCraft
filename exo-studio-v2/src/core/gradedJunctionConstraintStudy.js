import {gradeProject} from './grading.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'

// Read-only proposed displacement vectors. Never silently mutate the pattern,
// override designer rules, or mark a garment factory-approved.
export function studyGradedJunctionCorrections(project,{
  junctions=project?.templateId==='jeans-501'?JEANS501_YOKE_JUNCTIONS:project?.gradingJunctionConstraints||[],
  sizes=project?.grading?.sizes||[],toleranceCm=0.05,
}={}) {
  const audit=inspectGradedSeamJunctions(project,{junctions,sizes,toleranceCm})
  if(audit.status==='not_configured')return {status:'not_configured',factoryCertified:false,proposals:[],audit}
  if(!Array.isArray(audit.checks)||audit.checks.length!==junctions.length*sizes.length){
    return {status:'blocked',factoryCertified:false,proposals:[],audit,note:'Base-junction or grading audit incomplete: cannot recommend displacements'}
  }
  const proposals=[]
  for(const size of sizes){
    const graded=gradeProject(project,size)
    const pieces=new Map(graded.pieces.map(piece=>[piece.id,piece]))
    for(const j of junctions){
      const a=pieces.get(j.sewnEdgeA.pieceId),b=pieces.get(j.sewnEdgeB.pieceId)
      if(!a||!b)throw new Error(`Missing graded piece for ${j.id}`)
      const positions=[['first',j.sewnEdgeA.startVertex,j.sewnEdgeB.startVertex],['last',j.sewnEdgeA.endVertex,j.sewnEdgeB.endVertex]]
      const reference=positions.map(([station,ai,bi])=>{
        const left=a.points[ai],right=b.points[bi]
        if(!left||!right||!Number.isFinite(left.x)||!Number.isFinite(left.y)||!Number.isFinite(right.x)||!Number.isFinite(right.y))throw new Error('Nonfinite junction point')
        const dx=left.x-right.x,dy=left.y-right.y
        return {station,targetPieceId:b.id,targetVertexIndex:bi,dxCm:dx,dyCm:dy,gapCm:Math.hypot(dx,dy)}
      })
      proposals.push({junctionId:j.id,size,sourcePieceId:a.id,movingPieceId:b.id,displacements:reference,
        maximumGapCm:Math.max(...reference.map(row=>row.gapCm)),
        requiresPatternmakerReview:true,applied:false})
    }
  }
  return {status:audit.status,factoryCertified:false,proposalOnly:true,proposals,audit,
    note:'Diagnostic endpoint displacements are NOT complete graded rules: seam lengths, curves, notches and shared neighboring seams must be solved and approved together.'}
}
