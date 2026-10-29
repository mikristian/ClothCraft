import {gradeProject} from './grading.js'
import {edgeLength} from './project.js'
import {projectToDxf} from './dxf.js'

/** An explicitly unapproved add-on to the four-piece Foundation Tee sample.
 * No invented sample fit, shrinkage tolerance or vendor CAD approval. */
export function createTeeNeckbandSampleSet(project){
  const spec=project?.productionSpec
  if(spec?.format!=='garment-studio.tee-production-development.v1'||
     spec.neckband?.requiresSeparateNeckbandCutPattern!==true)throw new Error('Neckband sample add-on requires original Foundation Tee development spec')
  const ratio=Number(spec.neckband.proposedRibSewingRatio)
  const widthCm=Number(spec.neckband.proposedCutWidthCm)
  const joinAllowanceCm=Number(spec.neckband.joinSeamAllowanceCm)
  if(!Number.isFinite(ratio)||ratio<=0||ratio>=1||!Number.isFinite(widthCm)||widthCm<=0||
     !Number.isFinite(joinAllowanceCm)||joinAllowanceCm<0)throw new Error('Invalid experimental neckband dimensions or ratio')
  const sizes=project.grading?.sizes
  if(!Array.isArray(sizes)||!sizes.length||new Set(sizes).size!==sizes.length)throw new Error('An explicit non-duplicate size run is required')
  const rows=[]
  for(const size of sizes){
    const graded=gradeProject(project,size)
    const lengthCm=['front','back'].reduce((sum,id)=>{
      const piece=graded.pieces.find(item=>item.id===id)
      if(!piece)throw new Error(`Missing front/back neckline in size ${size}`)
      return sum+[9,10,11].reduce((total,edge)=>total+edgeLength(piece,edge),0)
    },0)
    const sewingLengthCm=lengthCm*ratio
    const cutLengthCm=sewingLengthCm+2*joinAllowanceCm
    if(![lengthCm,sewingLengthCm,cutLengthCm].every(Number.isFinite)||!(cutLengthCm>0))throw new Error(`Invalid neckband grade in ${size}`)
    const piece={id:`rib-neckband-${size}`,name:'Rib Neckband Cut Development',
      points:[{x:0,y:0},{x:cutLengthCm,y:0},{x:cutLengthCm,y:widthCm},{x:0,y:widthCm}],
      seamAllowance:0,grainAngleDeg:90,fabricId:'rib',
      // Center-back notch proposed only; physical seam and fold balance pending.
      notches:[{id:`neckband-center-${size}`,edgeIndex:0,t:.5,type:'single',depthCm:.3}],
    }
    const dxf=projectToDxf({id:`neckband-development-${size}`,pieces:[piece],seams:[],grading:{baseSize:size}},size)
    rows.push({size,necklineCm:lengthCm,proposedSewingLengthCm:sewingLengthCm,proposedCutLengthCm:cutLengthCm,
      proposedCutWidthCm:widthCm,endJoinAllowanceCm:joinAllowanceCm,proposedSewingRatio:ratio,
      ribMaterialStretchVerified:false,shrinkageVerified:false,physicallySampled:false,
      stage:'experimental_cut_proposal_not_approved',piece,dxf})
  }
  return {schema:'exo-tee-neckband-addendum.v1',projectId:project.id,projectRevision:project.revision,
    sizes:[...sizes],rows,requiresExternalSewingAndMaterialApproval:true,factoryCertified:false}
}
