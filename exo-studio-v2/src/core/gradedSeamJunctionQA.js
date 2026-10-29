import {gradeProject} from './grading.js'

// These are explicit source-anchored drafting stations, NOT an inference that
// all nominally sewn edge endpoints share global pattern coordinates.
export const JEANS501_YOKE_JUNCTIONS=Object.freeze(['left','right'].map(side=>({
  id:`${side}-yoke-join`,
  sewnEdgeA:{pieceId:`${side}-back-leg`,edgeIndex:9,startVertex:9,endVertex:0},
  sewnEdgeB:{pieceId:`${side}-back-yoke`,edgeIndex:2,startVertex:2,endVertex:3},
})))

const separation=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const pointsValid=pair=>pair&&Number.isFinite(pair.x)&&Number.isFinite(pair.y)
const sideLookup=(lookup,side)=>{
  const piece=lookup.get(side?.pieceId)
  if(!piece||!Number.isInteger(side?.edgeIndex)||side.edgeIndex<0||side.edgeIndex>=piece.points.length||
    !Number.isInteger(side.startVertex)||!Number.isInteger(side.endVertex)||
    side.startVertex!==side.edgeIndex||side.endVertex!==(side.edgeIndex+1)%piece.points.length){
    throw new Error(`Invalid authored graded-junction edge: ${side?.pieceId} ${side?.edgeIndex}`)
  }
  const first=piece.points[side.startVertex],last=piece.points[side.endVertex]
  if(!pointsValid(first)||!pointsValid(last))throw new Error('Nonfinite graded-junction coordinates')
  return {first,last}
}

/** Independent endpoint-station QA for explicit matching base-size joints.
 * Does not loosen industrial seam tolerance or infer external factory fit.
 */
export function inspectGradedSeamJunctions(project,{
  junctions=project?.gradingJunctionConstraints||[],
  sizes=project?.grading?.sizes||[],
  toleranceCm=0.05,
  baseToleranceCm=1e-5,
}={}){
  const issues=[],checks=[]
  const add=(code,scope,message)=>issues.push({code,scope,message,severity:'blocker'})
  if(!Array.isArray(junctions)||!Array.isArray(sizes)||!sizes.length||
    new Set(sizes).size!==sizes.length||!Number.isFinite(toleranceCm)||toleranceCm<0||
    !Number.isFinite(baseToleranceCm)||baseToleranceCm<0)throw new Error('Invalid graded junction audit configuration')
  if(!junctions.length)return {status:'not_configured',blockers:0,issues,checks,
    factoryCertified:false,note:'No authored shared-boundary junction constraints are configured; NOT a pass or approval.'}
  const matchingIds=new Set()
  const actualSeams=new Map((project.seams||[]).map(row=>[row.id,row]))
  for(const j of junctions){
    if(!j?.id||matchingIds.has(j.id))throw new Error('Duplicate or unnamed junction constraint')
    matchingIds.add(j.id)
    const seam=actualSeams.get(j.id)
    if(!seam||seam.a?.pieceId!==j.sewnEdgeA?.pieceId||seam.a?.edgeIndex!==j.sewnEdgeA?.edgeIndex||
      seam.b?.pieceId!==j.sewnEdgeB?.pieceId||seam.b?.edgeIndex!==j.sewnEdgeB?.edgeIndex){
      throw new Error(`Authored source sewing reference missing or changed for ${j.id}`)
    }
  }
  const baseProject=gradeProject(project,project.grading.baseSize)
  const baseLookup=new Map(baseProject.pieces.map(row=>[row.id,row]))
  for(const j of junctions){
    const a=sideLookup(baseLookup,j.sewnEdgeA),b=sideLookup(baseLookup,j.sewnEdgeB)
    if(separation(a.first,b.first)>baseToleranceCm||separation(a.last,b.last)>baseToleranceCm){
      add('UNVERIFIED_BASE_JUNCTION',j.id,'Base endpoints are not authored at the same physical drawing stations.')
    }
  }
  if(issues.length)return result()
  for(const size of sizes){
    let graded
    try{graded=gradeProject(project,size)}catch(error){add('GRADING_FAILED',size,error.message);continue}
    const lookup=new Map(graded.pieces.map(row=>[row.id,row]))
    for(const j of junctions){
      const a=sideLookup(lookup,j.sewnEdgeA),b=sideLookup(lookup,j.sewnEdgeB)
      const firstGapCm=separation(a.first,b.first),lastGapCm=separation(a.last,b.last)
      const pass=Math.max(firstGapCm,lastGapCm)<=toleranceCm
      checks.push({id:j.id,size,firstGapCm,lastGapCm,maximumGapCm:Math.max(firstGapCm,lastGapCm),pass})
      if(!pass)add('GRADED_SHARED_JUNCTION_DRIFT',`${j.id} / ${size}`,
        `An authored base-size sewing junction separates by up to ${Math.max(firstGapCm,lastGapCm).toFixed(4)} cm.`)
    }
  }
  return result()
  function result(){return {status:issues.length?'blocked':'pass',blockers:issues.length,issues,checks,
    configuredJunctions:junctions.length,checkedSizes:[...sizes],toleranceCm,
    factoryCertified:false,
    note:'Checks two coordinate-anchored seam endpoints, not cloth easing, sewing orientation, and physical fixture registration. Human patternmaker must approve coordinated grade rules.'}}
}
