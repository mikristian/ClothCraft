import {create501JeansTemplate} from '../data/jeans501.js'
import {gradeProject} from './grading.js'
import {inspectJeans501CoordinatedGradeStudy} from './jeans501CoordinatedGradeStudy.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

const affected=new Set(['left-back-yoke','right-back-yoke',
  'left-front-waistband','right-front-waistband',
  'left-back-waistband','right-back-waistband'])
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)

/** Convert the UNAPPROVED six-snapshot numerical study to an inspectable
 * per-point six-size grade rule table in a CLONED source document. Original
 * W32, legs and all authored files are unchanged; nothing is installed or
 * eligible for cutting, ASTM claim, or factory ZIP export.
 */
export function createJeans501ProvisionalIndustrialRuleTable(source=create501JeansTemplate()){
 const originally=JSON.stringify(source)
 const candidate=inspectJeans501CoordinatedGradeStudy(source)
 const project=structuredClone(source)
 const sizes=[...source.grading.sizes]
 if(sizes.join(',')!=='W28,W30,W32,W34,W36,W38'||source.grading.baseSize!=='W32'){
  throw new Error('Unsupported jeans grade size run')
 }
 const snapshotMap=new Map(sizes.map(size=>[size,
  new Map(candidate.snapshots[size].pieces.map(piece=>[piece.id,piece]))]))
 const modified=[]
 for(const piece of project.pieces){
  if(!affected.has(piece.id))continue
  for(const [index,point] of piece.points.entries()){
   const positions=sizes.map(size=>snapshotMap.get(size).get(piece.id)?.points?.[index])
   if(positions.some(position=>!position||!Number.isFinite(position.x)||!Number.isFinite(position.y))){
    throw new Error(`Missing measured ${piece.id}/${index} size targets`)
   }
   if(distance(positions[2],point)>1e-8)throw new Error(`W32 authored base point drifted: ${piece.id}/${index}`)
   const steps=positions.slice(1).map((position,sizeIndex)=>({
     dx:position.x-positions[sizeIndex].x,dy:position.y-positions[sizeIndex].y,
   }))
   point.industrialGradeRule={mode:'small-large-incremental',sizes:[...sizes],baseSize:'W32',steps}
   if(positions.some(position=>distance(position,point)>1e-9))modified.push({pieceId:piece.id,pointIndex:index})
  }
 }
 project.gradeProvenance={
  status:'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
  approved:false,factoryCertified:false,referenceOnly:true,
  source:'jeans501-coordinated-per-point-rule-candidate',sourceProjectId:source.id,
  changedPieces:[...affected],ruleSizes:[...sizes],
  reason:'Generated from unapproved calculated yoke, waistband and back-leg joining coordinates; adjacent seat/outseam/topstitch shapes and real sewn POM/ease are not approved.',
 }
 project.patternSource={...(project.patternSource||{}),referenceOnly:true,
   sourceProjectId:source.id,developmentCandidate:true}
 for(const size of sizes){
  const actual=gradeProject(project,size)
  const expected=snapshotMap.get(size)
  for(const piece of actual.pieces){
   const original=expected.get(piece.id)
   if(!original||piece.points.length!==original.points.length)throw new Error(`Wrong pattern inventory ${piece.id}/${size}`)
   for(let point=0;point<piece.points.length;point++){
    if(distance(piece.points[point],original.points[point])>1e-7){
      throw new Error(`Per-break rule failed original candidate coordinate: ${size}/${piece.id}/${point}`)
    }
   }
  }
 }
 const industrial=inspectIndustrialPatterns(project)
 const cutlines=inspectGradedCutlines(project)
 const junctions=inspectGradedSeamJunctions(project,{junctions:JEANS501_YOKE_JUNCTIONS})
 const readiness=inspectManufacturingReleaseReadiness(project)
 if(industrial.blockers||cutlines.blockers||junctions.blockers||readiness.factoryCuttingAuthorized||
    !readiness.blockers.some(row=>row.code==='UNAPPROVED_GRADE_TABLE')||
    !readiness.blockers.some(row=>row.code==='REFERENCE_ONLY_PATTERN')){
  throw new Error('Provisional grade table safety or exact sewing parity failed')
 }
 if(JSON.stringify(source)!==originally)throw new Error('Provisional table mutated source garment')
 return {schema:'exo-jeans501-provisional-industrial-point-grade.v1',
  project,modifiedPoints:modified,sizes,sourcePreserved:true,
  numerical:{sewingBlockers:industrial.blockers,cutlineBlockers:cutlines.blockers,junctionBlockers:junctions.blockers},
  adjacentConstructionChanges:candidate.adjacent,
  factoryCertified:false,factoryCuttingAuthorized:false,installed:false,
  readiness:{status:readiness.status,blockers:readiness.blockers},
  note:'Per-break rule table is an editable engineering candidate only. Missing approved seat/outseam/waist fit rules and real Gerber/Lectra/physical sample signoff.',
 }
}
