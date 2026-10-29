import {cloneProject,makeRectanglePiece,touchProject,uniqueId} from './project.js'
/** Loss-conscious transfer of measured reference blocks into legacy EXO 2D
 * project. Source sewn/graded attachments do not survive replacing every panel.
 * Explicitly zeros unrelated project-level sewing/production metadata.
 */
export function transferAccuMarkMtmReference20261024(original,draft){
 if(!original||!Array.isArray(original.pieces)||draft?.ok!==true||
   draft.project?.patternSource?.referenceOnly!==true||draft.project?.pieces?.length!==2)
   throw Error('Original editable legacy EXO project and validated measured draft required')
 const next=cloneProject(original)
 next.id=uniqueId('project')
 next.name=draft.project.name
 next.pieces=draft.project.pieces.map((piece,index)=>({
   ...makeRectanglePiece(index),...structuredClone(piece),
   id:uniqueId('piece'),layout2d:{x:120+index*340,y:100},
   arrangement3d:{x:0.72+index*.25,y:0.55,z:0.1,flip:index===1},
   active3d:false,frozen3d:true,locked:false,
 }))
 next.seams=[];next.customMeasurements=[];next.topstitches=[];next.fasteners=[];next.trims=[]
 next.productionSpec=null
 next.grading=structuredClone(draft.project.grading)
 next.patternSource={...structuredClone(draft.project.patternSource),editableDraft:true,
  physicalSewnSeamsVerified:false,factoryCertified:false}
 touchProject(next)
 return {ok:true,project:next,manufacturingApproved:false,
  warning:'Only two detached editable measured blocks; prior sewn geometry removed and factory release blocked.'}
}
