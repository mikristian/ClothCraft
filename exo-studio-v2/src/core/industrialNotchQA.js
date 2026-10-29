import {gradeProject} from './grading.js'
import {edgeLength} from './project.js'

/** Independent sewing-notch alignment checks; no automated fit approval. */
export function inspectGradedNotchPairs(project,{sizes=project?.grading?.sizes||[],toleranceCm=0.05}={}){
 const issues=[],checks=[]
 const add=(code,scope,message)=>issues.push({severity:'blocker',code,scope,message})
 if(!project||!Array.isArray(project.pieces)||!Array.isArray(project.seams)||!Array.isArray(sizes)||!sizes.length||new Set(sizes).size!==sizes.length||!Number.isFinite(toleranceCm)||toleranceCm<0){
  add('INVALID_NOTCH_QA','Project','A valid project, ordered sizes and nonnegative tolerance are required.')
  return result()
 }
 const groupList=new Map()
 // A matched notch identifies its sewn relationship by seam ID. If that ID
 // is duplicated, Array.find would silently choose one of several contours.
 const seamIds=project.seams.map(seam=>seam?.id).filter(id=>typeof id==='string'&&id.length>0)
 if(new Set(seamIds).size!==seamIds.length){
  add('AMBIGUOUS_NOTCH_SEAM_ID','Seams','Duplicate seam IDs make paired-notch alignment ambiguous.')
  return result()
 }
 for(const piece of project.pieces)for(const notch of piece.notches||[]){
  if(!notch?.matchGroupId&&!notch?.matchedSeamId)continue
  if(typeof notch.matchGroupId!=='string'||!notch.matchGroupId||typeof notch.matchedSeamId!=='string'||!notch.matchedSeamId){
   add('INCOMPLETE_NOTCH_PAIR',piece.id,'A grouped notch needs both matching group and seam IDs.');continue
  }
  const array=groupList.get(notch.matchGroupId)||[]
  array.push({pieceId:piece.id,edgeIndex:notch.edgeIndex,t:notch.t,seamId:notch.matchedSeamId,notchId:notch.id})
  groupList.set(notch.matchGroupId,array)
 }
 for(const [group,notches] of groupList){
  if(notches.length!==2||notches[0].seamId!==notches[1].seamId){
    add('INVALID_NOTCH_GROUP',group,'Require exactly one matching notch at each end of the same sewing relationship.');continue
  }
  const seam=project.seams.find(row=>row.id===notches[0].seamId)
  if(!seam){add('INVALID_NOTCH_SEAM',group,'Matching sewing relationship is missing.');continue}
  const same=(n,side)=>n.pieceId===side?.pieceId&&n.edgeIndex===side?.edgeIndex
  if(!((same(notches[0],seam.a)&&same(notches[1],seam.b))||(same(notches[1],seam.a)&&same(notches[0],seam.b)))){
    add('NOTCH_SEAM_REFERENCE',group,'Notch pair does not reference the selected sewn edges.');continue
  }
  if(notches.some(n=>!Number.isFinite(n.t)||n.t<0||n.t>1)){
    add('INVALID_NOTCH_FRACTION',group,'Notch seam fractions must be finite and in [0,1].');continue
  }
  for(const size of sizes){
   let graded
   try{graded=gradeProject(project,size)}catch(error){add('NOTCH_GRADING_FAILED',`${group} · ${size}`,error.message);continue}
   const lookup=new Map(graded.pieces.map(piece=>[piece.id,piece]))
   const a=notches.find(notch=>same(notch,seam.a)),b=notches.find(notch=>same(notch,seam.b))
   const pa=lookup.get(a.pieceId),pb=lookup.get(b.pieceId)
   if(!pa||!pb){add('NOTCH_PIECE_MISSING',`${group} · ${size}`,'The graded piece is absent.');continue}
   const actualA=pa.notches?.find(notch=>notch.id===a.notchId),actualB=pb.notches?.find(notch=>notch.id===b.notchId)
   if(!actualA||!actualB){add('NOTCH_LOST_ON_GRADE',`${group} · ${size}`,'At least one sewing notch was lost during grading.');continue}
   const lenA=edgeLength(pa,a.edgeIndex),lenB=edgeLength(pb,b.edgeIndex)
   const fromStartA=actualA.t*lenA,fromStartB=(seam.reverseB?1-actualB.t:actualB.t)*lenB
   const offsetCm=Math.abs(fromStartA-fromStartB)
   const pass=Number.isFinite(offsetCm)&&offsetCm<=toleranceCm
   checks.push({group,seamId:seam.id,size,fromStartAcm:fromStartA,fromStartBcm:fromStartB,offsetCm,pass})
   if(!pass)add('NOTCH_SEAM_MISALIGNMENT',`${group} · ${size}`,`Paired sewing notch arclength difference ${offsetCm.toFixed(3)} cm exceeds ${toleranceCm.toFixed(3)} cm.`)
  }
 }
 return result()
 function result(){return {status:issues.length?'blocked':'pass',blockers:issues.length,issues,checks,pairedGroups:groupList.size,checkedSizes:[...sizes],toleranceCm,factoryCertified:false}}
}
