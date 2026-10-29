import {create501JeansTemplate} from '../data/jeans501.js'
import {edgeLength} from './project.js'
import {inspectJeans501WaistGradeCandidate} from './jeans501WaistGradeCandidate.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'

const STRATEGIES=['AS_AUTHORED','MOVE_SEAT_CORNER','MOVE_SIDE_CORNER','SPLIT_SHARED_CORNERS']
const SIDES=['left','right']
const finite=n=>Number.isFinite(n)
const freezeSize=(snapshot,size)=>{
 const p=structuredClone(snapshot)
 p.grading={...p.grading,sizes:[size],baseSize:size,widthPerSizeCm:0,lengthPerSizeCm:0}
 for(const piece of p.pieces)piece.points=piece.points.map(point=>{
   const next={...point,gradeRule:{enabled:true,dxPerSize:0,dyPerSize:0}}
   delete next.industrialGradeRule
   return next
 })
 return p
}
const get=(project,id)=>{
 const piece=project.pieces.find(row=>row.id===id)
 if(!piece)throw new Error(`Missing yoke constraint piece ${id}`)
 return piece
}
const endpoint=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const inspectedSecondarySeams=(project,side)=>{
 const lookup=new Map(project.pieces.map(piece=>[piece.id,piece]))
 return project.seams.filter(seam=>
   (seam.a?.pieceId===`${side}-back-yoke`||seam.b?.pieceId===`${side}-back-yoke`)
   &&!seam.id.endsWith('yoke-join')).map(seam=>{
   const a=lookup.get(seam.a.pieceId),b=lookup.get(seam.b.pieceId)
   const aLen=edgeLength(a,seam.a.edgeIndex),bLen=edgeLength(b,seam.b.edgeIndex)
   return {seamId:seam.id,aLengthCm:aLen,bLengthCm:bLen,absoluteDifferenceCm:Math.abs(aLen-bLen)}
 })
}

/**
 * Read-only feasibility study. The four virtual trials are measured only to
 * demonstrate that passing a seam-length tolerance does NOT prove preserved
 * shared-junction endpoints. No trial is returned as an editable garment.
 */
export function auditJeans501YokeJunctionConstraints(project=create501JeansTemplate()){
 const input=JSON.stringify(project)
 const trial=inspectJeans501WaistGradeCandidate(project)
 const results=[]
 for(const size of trial.sizes){
  const source=freezeSize(trial.snapshots[size],size)
  const asAuthored=structuredClone(source)
  const baseSecondary=Object.fromEntries(SIDES.map(side=>[side,inspectedSecondarySeams(source,side)]))
  const gradeRows=[]
  for(const strategy of STRATEGIES){
   const derived=structuredClone(source)
   const details=[]
   for(const side of SIDES){
    const yoke=get(derived,`${side}-back-yoke`)
    const leg=get(derived,`${side}-back-leg`)
    const original=get(asAuthored,`${side}-back-yoke`)
    if(yoke.points.length!==4||leg.points.length!==10||Math.abs(yoke.points[2].y-yoke.points[3].y)>1e-7){
      throw new Error(`Unsupported jeans yoke source topology for ${side}/${size}`)
    }
    const target=edgeLength(leg,9),initial=edgeLength(yoke,2)
    const delta=target-initial
    if(!finite(target)||!finite(initial)||Math.abs(delta)>5)throw new Error(`Unbounded yoke delta ${side}/${size}`)
    if(strategy==='MOVE_SEAT_CORNER')yoke.points[2].x+=delta
    if(strategy==='MOVE_SIDE_CORNER')yoke.points[3].x-=delta
    if(strategy==='SPLIT_SHARED_CORNERS'){
      yoke.points[2].x+=delta/2
      yoke.points[3].x-=delta/2
    }
    const actual=edgeLength(yoke,2)
    const authoredEndGaps=[endpoint(leg.points[9],original.points[2]),endpoint(leg.points[0],original.points[3])]
    const trialEndGaps=[endpoint(leg.points[9],yoke.points[2]),endpoint(leg.points[0],yoke.points[3])]
    const secondary=inspectedSecondarySeams(derived,side).map(row=>{
      const before=baseSecondary[side].find(entry=>entry.seamId===row.seamId)
      return {...row,originalDifferenceCm:before.absoluteDifferenceCm,
        changeInALengthCm:row.aLengthCm-before.aLengthCm,
        changeInBLengthCm:row.bLengthCm-before.bLengthCm,
        changeInDifferenceCm:row.absoluteDifferenceCm-before.absoluteDifferenceCm}
    })
    details.push({side,affectedSharedYokeVertices:[2,3],
      sewnYokeEdge:2,sewnBackLegEdge:9,
      targetBackLegCm:target,sourceYokeCm:initial,trialYokeCm:actual,
      originalMismatchCm:Math.abs(initial-target),trialMismatchCm:Math.abs(actual-target),
      originalEndpointGapsCm:authoredEndGaps,trialEndpointGapsCm:trialEndGaps,
      movedVertices:[2,3].filter(index=>endpoint(yoke.points[index],original.points[index])>1e-10).map(index=>({
        index,deltaXcm:yoke.points[index].x-original.points[index].x,
        deltaYcm:yoke.points[index].y-original.points[index].y,
        // These vertices are shared with yoke edges 1 and 3.
        adjacentYokeEdge:index===2?1:3,
      })),
      secondarySeamEffects:secondary,
    })
   }
   const industrial=inspectIndustrialPatterns(derived,{sizes:[size]})
   const cutlines=inspectGradedCutlines(derived,{sizes:[size]})
   gradeRows.push({strategy,size,strictIndustrialBlockers:industrial.blockers,
     strictCutlineBlockers:cutlines.blockers,
     yokeChecks:details,
     factoryCertified:false,factoryCuttingAuthorized:false,
     status:'UNAPPROVED_VIRTUAL_TEST_NOT_AN_INSTALLED_GRADE_TABLE'})
  }
  results.push({size,virtualTrials:gradeRows})
 }
 if(JSON.stringify(project)!==input)throw new Error('Yoke study mutated authored source')
 return {schema:'exo-jeans501-shared-yoke-junction-constraints.v1',
  originalProjectId:project.id,sourcePreserved:true,approved:false,factoryCertified:false,
  installed:false,strategies:STRATEGIES,results,
  warning:'The virtual yoke corner moves affect adjacent actual sewing/junction edges. A numeric sewn-edge match alone does NOT establish CAD/POM/shape/cutter or fit approval. No grade coordinates are applied to source or returned as a usable garment.',
  outstanding:'Requires a verified multi-piece grade table preserving all seat/yoke/waist junctions, seam ease policy and physical fit samples.'}
}
