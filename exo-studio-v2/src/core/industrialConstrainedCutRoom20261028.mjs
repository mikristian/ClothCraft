// Source-bound, opt-in constrained marker → lay-ticket engineering bridge.
// The existing AccuMark order planner cannot verify on-fold geometry or defect
// polygons. This independent bridge refuses unsupported cases and never CUT.
import {gradeProject} from './grading.js'
import {nestPolygons,polygonConflict} from './accumarkPolygonNesting20261024.js'
import {inspectNestedManufacturingMarks20261028} from './industrialNestedMarks20261028.mjs'
import {buildAccuMarkCutterPathStudy20261024} from './accumarkCutterPathStudy20261024.js'
import {qualifyIndustrialCutterStudy20261028} from './industrialCutterQualification20261028.mjs'
import {seamAllowanceBoundary} from './project.js'
import {inspectIndustrialPhysicalMultiPlyWitness20261028} from './industrialPhysicalMultiPlyWitness20261028.mjs'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const fail=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],lays:[],cutTickets:[],rows:[],cuttingAuthorized:false,factoryApproved:false,machineReady:false})
const has=(o,k)=>Object.hasOwn(o,k)
const matches=(a,b)=>JSON.stringify(a)===JSON.stringify(b)

export function inspectIndustrialConstrainedCutRoom20261028(project,{
 quantitiesBySize,rolls=[],fabricId='main',fabricWidthCm,spacingCm=0.5,
 foldEdge=null,defectZones=[],maxPlyCount=20,maxCandidates=30000,
 cutterProfile=null,qualificationEvidence=null,physicalObservations=null,
}={}){
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
  new Set(sizes).size!==sizes.length||!sizes.includes(project.grading.baseSize)||
  sizes.some(s=>typeof s!=='string'||!s||s.length>24)||
  !Array.isArray(project?.pieces)||!project.pieces.length||
  !quantitiesBySize||typeof quantitiesBySize!=='object'||Array.isArray(quantitiesBySize)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(quantitiesBySize))||
  Object.keys(quantitiesBySize).length!==sizes.length||
  sizes.some(s=>!has(quantitiesBySize,s)||!Number.isSafeInteger(quantitiesBySize[s])||quantitiesBySize[s]<0)||
  !sizes.some(s=>quantitiesBySize[s]>0))return fail('INVALID_GRADED_ORDER')
 if(!finite(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000||
  !finite(spacingCm)||spacingCm<0||spacingCm>50||
  !Number.isSafeInteger(maxPlyCount)||maxPlyCount<1||maxPlyCount>1000||
  !Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>300000||
  !['left','right',null].includes(foldEdge)||!Array.isArray(defectZones)||
  !Array.isArray(rolls)||!rolls.length||rolls.length>1000)
  return fail('INVALID_CONSTRAINED_ORDER_LIMITS')
 const sourceDefects=project.markerSettings?.fabricDefectsByFabric?.[fabricId]??
  project.markerSettings?.defectZonesByFabric?.[fabricId]??
  project.markerSettings?.rollDefectsByFabric?.[fabricId]
 if(sourceDefects!==undefined&&!matches(defectZones,sourceDefects))
  return fail('SOURCE_FABRIC_DEFECT_MISMATCH')
 if(project.markerSettings?.fabricDefects!==undefined||project.markerSettings?.rollDefects!==undefined)
  return fail('UNSUPPORTED_GLOBAL_OR_REPEAT_CONSTRAINT')
 const repeatRegistration=project.markerSettings?.repeatRegistrationByFabric?.[fabricId]??null
 const pieces=project.pieces.filter(p=>(p.fabricId||'main')===fabricId)
 if(!pieces.length||pieces.some(p=>!Number.isSafeInteger(p.cutQuantity)||p.cutQuantity<1||p.cutQuantity>99))
  return fail('INVALID_PHYSICAL_CUT_INVENTORY')
 const unsupported=pieces.some(p=>p.pairing||p.fusing||p.marker?.pairing||p.marker?.fusing||
  p.marker?.repeat||p.marker?.motif||p.marker?.shade||
  p.holes?.length||p.drills?.length||p.cutHoles?.length||p.internalCutouts?.length||
  p.internalLines?.length||p.buttonholes?.length||p.marker?.allowReverseGrain)
 if(unsupported)return fail('UNVERIFIED_MANUFACTURING_FEATURE')
 if(pieces.some(p=>Boolean(p.fold||p.cutOnFold||p.marker?.fold||p.marker?.onFold)&&foldEdge===null))
  return fail('MISSING_PHYSICAL_FOLD_EDGE')
 const seenRolls=new Set()
 for(const roll of rolls){
  if(!roll||typeof roll.rollId!=='string'||!roll.rollId||seenRolls.has(roll.rollId)||
    typeof roll.batchId!=='string'||!roll.batchId||typeof roll.shade!=='string'||!roll.shade||
    roll.fabricId!==fabricId||roll.nap!==true||
    !finite(roll.usableLengthCm)||roll.usableLengthCm<=0||
    !finite(roll.widthCm)||roll.widthCm<fabricWidthCm||
    !finite(roll.costPerMeter)||roll.costPerMeter<0)
    return fail('INVALID_CONSTRAINED_ROLL')
  seenRolls.add(roll.rollId)
 }
 if(new Set(rolls.map(r=>r.shade)).size!==1)return fail('MIXED_SHADES')
 if(rolls.some(r=>r.plyDefectZones!==undefined||r.plyShades!==undefined||r.layerOffsetsCm!==undefined))
  return fail('UNVERIFIED_PLY_SPECIFIC_FABRIC_CONSTRAINTS')
 // Source-declared defects describe a fixed physical map. A different roll
 // requires its own inspected source; never override authored source defects.
 if(sourceDefects!==undefined&&rolls.some(r=>r.defectZones!==undefined&&!matches(r.defectZones,defectZones)))
  return fail('ROLL_DEFECT_MAP_MISMATCH')
 // A fabric-layer directional exception cannot be inferred from nap alone.
 if(rolls.some(r=>r.foldEdge!==undefined&&r.foldEdge!==foldEdge))
  return fail('ROLL_FOLD_EDGE_MISMATCH')
 try{
  const rows=[],markers={}
  for(const roll of rolls)for(const size of sizes.filter(s=>quantitiesBySize[s]>0)){
   const graded=gradeProject(project,size)
   // The repeat phase is tied to the actual graded size, never inferred from
   // the base-size anchor. The nesting kernel uses this identity explicitly.
   graded.previewSize=size
   const selected=graded.pieces.filter(p=>(p.fabricId||'main')===fabricId).map(p=>({...p,
    marker:{...p.marker,nap:p.marker?.nap??'one-way'}}))
   const nest=nestPolygons({...graded,pieces:selected},{fabricWidth:fabricWidthCm,
    gap:spacingCm,maxLength:100000,maxCandidates,fabricId,placementOrder:'largest-first',
    foldEdge,defectZones:roll.defectZones??defectZones,repeatRegistration})
   if(!nest.ok){rows.push({size,rollId:roll.rollId,ok:false,reason:'CONSTRAINED_NEST_UNPLACED',errors:nest.errors,unplaced:nest.unplaced});continue}
   if(repeatRegistration&&nest.placements.some(placement=>{
    const source=selected.find(piece=>piece.id===placement.pieceId)
    const anchor=source?.marker?.repeatAnchorsBySize?.[size]
    if(!anchor)return true
    const a=placement.rotationDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a)
    const cut=seamAllowanceBoundary(source,8).map(p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}))
    const minX=Math.min(...cut.map(p=>p.x)),minY=Math.min(...cut.map(p=>p.y))
    const absolute={x:anchor.anchorXcm*c-anchor.anchorYcm*s-minX+placement.x,
      y:anchor.anchorXcm*s+anchor.anchorYcm*c-minY+placement.y}
    return [['x','repeatXcm','originXcm','targetXcm'],['y','repeatYcm','originYcm','targetYcm']].some(([axis,period,origin,target])=>{
      if(!Object.hasOwn(repeatRegistration,period))return false
      const r=repeatRegistration[period],phase=absolute[axis]-repeatRegistration[origin]-anchor[target]
      const delta=((phase%r)+r)%r
      return Math.min(delta,r-delta)>repeatRegistration.toleranceCm+1e-6
    })
   }))return fail('REPEAT_PHASE_DRIFT_AFTER_NEST',size)
   const defectOutlines=(roll.defectZones??defectZones).map(d=>[
    {x:d.x,y:d.y},{x:d.x+d.width,y:d.y},{x:d.x+d.width,y:d.y+d.height},{x:d.x,y:d.y+d.height},
   ])
   if(nest.placements.some(p=>defectOutlines.some(poly=>polygonConflict(p.outline,poly,spacingCm))))
    return fail('DEFECT_OVERLAP_DETECTED',size)
   const expectedCount=selected.reduce((n,p)=>n+p.cutQuantity,0)
   if(nest.placements.length!==expectedCount||
    nest.placements.some(p=>!selected.some(piece=>piece.id===p.pieceId)))
    return fail('CUT_PIECE_INVENTORY_DRIFT',size)
   const marks=inspectNestedManufacturingMarks20261028(graded,nest,{size})
   if(!marks.ok||marks.placements.length!==expectedCount)
    return fail('UNVERIFIED_NESTED_MARKS',{size,issues:marks.issues})
   const cutter=buildAccuMarkCutterPathStudy20261024(nest,{fabricWidthCm,spaceCm:spacingCm})
   if(!cutter.ok||cutter.records.length!==expectedCount)
    return fail('UNVERIFIED_CUTLINE',{size,reason:cutter.reason})
   const qualification=cutterProfile?qualifyIndustrialCutterStudy20261028(cutter,marks,cutterProfile,qualificationEvidence||{}):null
   if(qualification&&!qualification.ok)return fail('CUTTER_PROFILE_REVIEW_BLOCKED',{size,issues:qualification.issues})
   markers[`${roll.rollId}\u0000${size}`]={lengthCm:nest.metrics.length,placements:nest.placements}
   rows.push({size,rollId:roll.rollId,ok:true,expectedCutsPerPly:expectedCount,marker:nest,marks,cutter,
    cutterQualification:qualification,cuttingAuthorized:false})
  }
  const remaining=rolls.map(r=>({...r,consumedCm:0,remainingCm:r.usableLengthCm}))
  const lays=[],cutTickets=[]
  for(const size of sizes.filter(s=>quantitiesBySize[s]>0)){
   let needed=quantitiesBySize[size]
   for(const roll of remaining){
    const marker=markers[`${roll.rollId}\u0000${size}`]
    if(!marker)continue
    while(needed>0&&roll.remainingCm>=marker.lengthCm-1e-6){
     if(lays.length>10000)return fail('CONSTRAINED_LAY_LIMIT')
     const maxFit=Math.floor((roll.remainingCm+1e-8)/marker.lengthCm)
     const plyCount=Math.min(needed,maxPlyCount,maxFit)
     if(plyCount<1)break
     const consumedCm=plyCount*marker.lengthCm
     const layId=`LAY-${String(lays.length+1).padStart(4,'0')}`
     const lay={layId,size,plyCount,garments:plyCount,rollId:roll.rollId,batchId:roll.batchId,
      shade:roll.shade,nap:true,markerLengthCm:marker.lengthCm,
      startOffsetCm:roll.consumedCm,endOffsetCm:roll.consumedCm+consumedCm,
      consumedCm,fabricId,foldEdge,defectZones:structuredClone(roll.defectZones??defectZones)}
     const ticket={ticketId:`CUT-${String(cutTickets.length+1).padStart(4,'0')}`,layId,size,
      rollId:roll.rollId,batchId:roll.batchId,shade:roll.shade,plyCount,
      pieces:selectedPieces(project,fabricId).map(p=>({pieceId:p.id,perPly:p.cutQuantity,total:p.cutQuantity*plyCount})),
      factoryApproved:false,cuttingAuthorized:false}
     lays.push(lay);cutTickets.push(ticket)
     roll.remainingCm-=consumedCm;roll.consumedCm+=consumedCm;needed-=plyCount
    }
    if(!needed)break
   }
   if(needed)return fail('INSUFFICIENT_CONSTRAINED_FABRIC',{size,remaining:needed})
  }
  const required=sizes.reduce((sum,s)=>sum+quantitiesBySize[s],0)*pieces.reduce((n,p)=>n+p.cutQuantity,0)
  const observed=cutTickets.reduce((sum,t)=>sum+t.pieces.reduce((n,p)=>n+p.total,0),0)
  if(required!==observed)return fail('MULTI_LAY_CUT_INVENTORY_MISMATCH')
  for(const lay of lays){
   const ticket=cutTickets.find(t=>t.layId===lay.layId)
   const marker=markers[`${lay.rollId}\u0000${lay.size}`]
   const cutsPerPly=pieces.reduce((n,p)=>n+p.cutQuantity,0)
   if(!ticket||!marker||ticket.plyCount!==lay.plyCount||
    ticket.pieces.reduce((n,p)=>n+p.total,0)!==cutsPerPly*lay.plyCount||
    Math.abs(lay.endOffsetCm-lay.startOffsetCm-lay.consumedCm)>1e-5||
    Math.abs(lay.consumedCm-marker.lengthCm*lay.plyCount)>1e-5)
    return fail('MULTI_PLY_LAYER_GEOMETRY_MISMATCH',lay.layId)
  }
  // Immutable, locally auditable handoff witness ties every lay to its
  // physical machine-neutral study and preserved notch count. Not an approval.
  const cutStudyInventory=rows.filter(row=>row.ok).map(row=>({size:row.size,rollId:row.rollId,
   contourInstances:row.cutter.records.length,
   notchCount:row.marks.notchCount,drillCount:row.marks.drillCount,
   markerLengthCm:row.marker.metrics.length,foldEdge,
   defectZones:structuredClone(rolls.find(r=>r.rollId===row.rollId)?.defectZones??defectZones)}))
  const physicalWitness=physicalObservations===null?null:
   inspectIndustrialPhysicalMultiPlyWitness20261028({ok:true,lays,cutTickets,
    cuttingAuthorized:false,factoryApproved:false},physicalObservations)
  if(physicalWitness&&!physicalWitness.ok)return fail('PHYSICAL_MULTIPLY_REVIEW_REFUSED',physicalWitness.issues)
  return {ok:true,status:'LOCAL_CONSTRAINED_LAY_GEOMETRY_RECONCILED',issues:[],rows,lays,cutTickets,
   rollAllocation:remaining.map(r=>({rollId:r.rollId,batchId:r.batchId,shade:r.shade,
    usableLengthCm:r.usableLengthCm,consumedCm:r.consumedCm,remainingCm:r.remainingCm})),
   expectedCuts:required,observedCuts:observed,cutStudyInventory,physicalWitness,
   physicalFabricValidated:false,externalCadVerified:false,machineReady:false,
   cuttingAuthorized:false,factoryApproved:false,
   limitations:'Independent constrained lay arithmetic and per-size nesting/marks only. No physical multi-ply cut, machine protocol or receiving-CAD acceptance.'}
 }catch(error){return fail('CONSTRAINED_CUT_ROOM_REFUSED',String(error.message||error))}
}
const selectedPieces=(project,fabricId)=>project.pieces.filter(p=>(p.fabricId||'main')===fabricId)
