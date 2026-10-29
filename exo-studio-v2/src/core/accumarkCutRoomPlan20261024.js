import {buildAccuMarkMarkerOrder,validateAccuMarkMarkerProduction} from './accumarkMarkerProduction20261023.js'

const finite=value=>typeof value==='number'&&Number.isFinite(value)
const positive=value=>finite(value)&&value>0
const id=value=>typeof value==='string'&&value.trim().length>0
const issue=(code,detail)=>({code,detail})
const round=value=>Math.round((value+Number.EPSILON)*1e6)/1e6
const usableSegments=(roll,start=0)=>{
  const segments=[]
  let cursor=Math.max(0,start)
  for(const block of roll.defectRangesCm||[]){
    if(block.endCm<=cursor)continue
    if(block.startCm>cursor)segments.push([cursor,block.startCm])
    cursor=Math.max(cursor,block.endCm)
  }
  if(cursor<roll.usableLengthCm)segments.push([cursor,roll.usableLengthCm])
  return segments
}

/** Plan fabric consumption using validated one-garment markers for each graded size.
 * Coordinates and lengths are centimeters; roll costs are per running meter.
 * A lay consumes markerLength * plyCount from ONE roll (no splicing).
 * acceptedMarkersBySize[size] optionally supplies externally arranged placements.
 * Optional roll.defectRangesCm: nonoverlapping [{startCm,endCm}] measured from
 * the start of the roll. Defect zones are excluded from every physical lay.
 * Optional roll.maxPlyCount caps individual lays; optional dyeLotId is a
 * strict single-lot declaration, never proof of verified roll provenance.
 * All numbers are estimates until the receiving cutting room approves them.
 */
export function buildAccuMarkCutRoomPlan(project,{
  quantitiesBySize,rolls=[],fabricWidthCm,spacingCm=1.5,maxPlyCount=20,
  nap=false,fabricId='main',acceptedMarkersBySize,
}={}){
  const issues=[]
  const failure=()=>({ok:false,issues,lays:[],cutTickets:[],rollAllocation:[],perSize:{},
    totals:null,operatorWorksheet:'',manifest:null,factoryApproved:false,cuttingAuthorized:false})
  if(!Array.isArray(project?.grading?.sizes)||!project.grading.sizes.length||
    project.grading.sizes.some(s=>!id(s))||
    new Set(project.grading.sizes.map(s=>s.toLowerCase())).size!==project.grading.sizes.length)
    issues.push(issue('INVALID_SIZES','Unique size labels are required'))
  if(!quantitiesBySize||typeof quantitiesBySize!=='object'||Array.isArray(quantitiesBySize)||
    !Array.isArray(project?.grading?.sizes)||Object.keys(quantitiesBySize).some(s=>!project.grading.sizes.includes(s))||
    project.grading.sizes.some(s=>!Object.hasOwn(quantitiesBySize,s)||!Number.isSafeInteger(quantitiesBySize[s])||quantitiesBySize[s]<0)||
    !Object.values(quantitiesBySize).some(n=>n>0))
    issues.push(issue('INVALID_SIZE_QUANTITIES','Provide a nonnegative integer for every size, with at least one positive quantity'))
  if(!Number.isSafeInteger(maxPlyCount)||maxPlyCount<1||maxPlyCount>1000)issues.push(issue('INVALID_MAX_PLY','Maximum ply count must be 1–1000'))
  if(!positive(fabricWidthCm)||fabricWidthCm>1000)issues.push(issue('INVALID_FABRIC_WIDTH','Fabric width must be positive and <=1000 cm'))
  if(!finite(spacingCm)||spacingCm<0||spacingCm>50)issues.push(issue('INVALID_SPACING','Spacing must be between 0 and 50 cm'))
  if(!id(fabricId))issues.push(issue('INVALID_FABRIC_ID','Fabric ID is required'))
  if(typeof nap!=='boolean')issues.push(issue('INVALID_NAP','Nap must be boolean'))
  if(!Array.isArray(rolls)||!rolls.length||rolls.length>1000)issues.push(issue('INVALID_ROLLS','Provide 1–1000 fabric rolls'))
  if(acceptedMarkersBySize!==undefined&&(!acceptedMarkersBySize||typeof acceptedMarkersBySize!=='object'||Array.isArray(acceptedMarkersBySize)))
    issues.push(issue('INVALID_MARKERS','Accepted markers must be keyed by size'))
  if(acceptedMarkersBySize&&typeof acceptedMarkersBySize==='object'&&!Array.isArray(acceptedMarkersBySize)&&
    Object.keys(acceptedMarkersBySize).some(s=>!project?.grading?.sizes?.includes(s)))
    issues.push(issue('INVALID_MARKERS','Accepted markers contain an unknown size'))
  if(issues.length)return failure()

  const rollIds=new Set()
  let commonShade=null
  let commonDyeLot=null
  const dyeLotsDeclared=rolls.some(roll=>roll?.dyeLotId!==undefined)
  for(const [i,roll] of rolls.entries()){
    if(!id(roll?.rollId)||rollIds.has(roll.rollId.trim()))issues.push(issue('INVALID_ROLL_ID',`Roll ${i} needs a unique rollId`))
    else rollIds.add(roll.rollId.trim())
    if(!id(roll?.batchId))issues.push(issue('INVALID_BATCH_ID',`Roll ${i} needs a batchId`))
    if(!id(roll?.shade))issues.push(issue('INVALID_SHADE',`Roll ${i} needs a shade identifier`))
    else if(commonShade===null)commonShade=roll.shade
    else if(roll.shade!==commonShade)issues.push(issue('MIXED_SHADES','Rolls from different shades cannot share this cutting plan'))
    if(dyeLotsDeclared){
      if(!id(roll?.dyeLotId))issues.push(issue('INVALID_DYE_LOT',`Roll ${i} needs an explicit dyeLotId when any roll declares one`))
      else if(commonDyeLot===null)commonDyeLot=roll.dyeLotId
      else if(commonDyeLot!==roll.dyeLotId)issues.push(issue('MIXED_DYE_LOTS','Rolls from different dye lots require separate plans'))
    }
    if(roll?.fabricId!==fabricId)issues.push(issue('MIXED_FABRICS',`Roll ${i} fabricId differs from plan`))
    if(roll?.nap!==nap)issues.push(issue('MIXED_NAP',`Roll ${i} nap differs from plan`))
    if(!positive(roll?.usableLengthCm)||roll.usableLengthCm>1e7)issues.push(issue('INVALID_ROLL_LENGTH',`Roll ${i} needs a positive usable length in cm`))
    if(roll?.maxPlyCount!==undefined&&(!Number.isSafeInteger(roll.maxPlyCount)||roll.maxPlyCount<1||roll.maxPlyCount>1000))
      issues.push(issue('INVALID_ROLL_PLY_LIMIT',`Roll ${i} maximum ply count must be 1–1000`))
    if(roll?.defectRangesCm!==undefined){
      const ranges=roll.defectRangesCm
      if(!Array.isArray(ranges)||ranges.length>1000||
        ranges.some((range,j)=>!range||typeof range!=='object'||Array.isArray(range)||
          !finite(range.startCm)||!finite(range.endCm)||range.startCm<0||
          range.endCm<=range.startCm||range.endCm>roll.usableLengthCm||
          (j>0&&range.startCm<ranges[j-1].endCm)))
        issues.push(issue('INVALID_ROLL_DEFECT_RANGES',`Roll ${i} needs ordered, nonoverlapping in-bounds defect ranges`))
    }
    if(!finite(roll?.costPerMeter)||roll.costPerMeter<0||roll.costPerMeter>1e7)issues.push(issue('INVALID_ROLL_COST',`Roll ${i} needs a finite nonnegative rate`))
    if(roll?.widthCm!==undefined&&(!positive(roll.widthCm)||roll.widthCm<fabricWidthCm))
      issues.push(issue('ROLL_TOO_NARROW',`Roll ${i} cannot accommodate marker width`))
  }
  if(issues.length)return failure()
  const sizes=project.grading.sizes.filter(size=>quantitiesBySize[size]>0)
  const perSize={}
  const markers={}
  for(const size of sizes){
    const oneSize=Object.fromEntries(project.grading.sizes.map(s=>[s,s===size?1:0]))
    const provided=acceptedMarkersBySize?.[size]
    const marker=provided===undefined
      ?buildAccuMarkMarkerOrder(project,{quantitiesBySize:oneSize,fabricWidthCm,spacingCm,nap,fabricId})
      :{placements:provided}
    const validated=validateAccuMarkMarkerProduction(project,{
      quantitiesBySize:oneSize,placements:marker.placements,fabricWidthCm,spacingCm,nap,fabricId,
    })
    if(marker.validation&&!marker.validation.ok)issues.push(issue('MARKER_GENERATION_FAILED',`${size}: ${marker.validation.issues.map(i=>i.code).join(', ')}`))
    if(!validated.ok)issues.push(issue('MARKER_NOT_ACCEPTED',`${size}: ${validated.issues.map(i=>i.code).join(', ')}`))
    if(!positive(validated.metrics?.lengthCm))issues.push(issue('INVALID_MARKER_LENGTH',`${size}: zero or invalid marker length`))
    if(!issues.length){
      markers[size]={placements:marker.placements.map(p=>({...p})),lengthCm:validated.metrics.lengthCm}
      const pieceCounts=Object.fromEntries(project.pieces.filter(p=>(p.fabricId||'main')===fabricId).map(p=>[p.id,p.cutQuantity]))
      perSize[size]={requestedGarments:quantitiesBySize[size],pieceCountsPerGarment:pieceCounts,
        markerLengthCm:round(validated.metrics.lengthCm),markerUtilization:round(validated.metrics.utilization)}
    }
  }
  if(issues.length)return failure()
  const allocated=rolls.map(roll=>({...roll,consumedCm:0,remainingCm:roll.usableLengthCm,
    cursorCm:0,skippedUnusableCm:0,estimatedCost:0}))
  const lays=[],cutTickets=[]
  // Allocate longest markers first. Shorter markers may use the remainders,
  // while allocating short sizes first can strand otherwise usable rolls.
  // This is a conservative heuristic, not a globally optimal cut plan.
  const allocationOrder=[...sizes].sort((a,b)=>markers[b].lengthCm-markers[a].lengthCm||sizes.indexOf(a)-sizes.indexOf(b))
  for(const size of allocationOrder){
    let needed=quantitiesBySize[size]
    const length=markers[size].lengthCm
    // Best-fit remainder first preserves the larger contiguous rolls for
    // future lays when smaller rolls can satisfy this size.
    const candidateRolls=[...allocated].sort((a,b)=>a.remainingCm-b.remainingCm||rolls.findIndex(r=>r.rollId===a.rollId)-rolls.findIndex(r=>r.rollId===b.rollId))
    for(const roll of candidateRolls){
      if(!needed)break
      while(needed>0){
        if(lays.length>=10000){issues.push(issue('LAY_LIMIT','More than 10000 lays required'));return failure()}
        // A lay must occupy one contiguous non-defective length of one roll.
        const segment=usableSegments(roll,roll.cursorCm).find(([start,end])=>
          Math.floor((end-start+1e-8)/length)>=1)
        if(!segment)break
        const [start,end]=segment
        const capacity=Math.floor((end-start+1e-8)/length)
        const plyCount=Math.min(maxPlyCount,roll.maxPlyCount??maxPlyCount,needed,capacity)
        const consumedCm=length*plyCount
        if(plyCount<1||start+consumedCm>end+1e-7){issues.push(issue('ROLL_OVERCONSUMPTION',roll.rollId));return failure()}
        const skippedCm=start-roll.cursorCm
        const layId=`LAY-${String(lays.length+1).padStart(4,'0')}`
        // Physically advancing past defects or an unusably short remnant
        // consumes stock too. Cost and total roll usage must include that
        // scrap; the lay's actual cutting length is recorded separately.
        const estimatedCost=(consumedCm+skippedCm)/100*roll.costPerMeter
        const lay={layId,size,garments:plyCount,plyCount,rollId:roll.rollId,
          batchId:roll.batchId,shade:roll.shade,...(dyeLotsDeclared?{dyeLotId:roll.dyeLotId}:{}),
          nap,markerLengthCm:round(length),
          startOffsetCm:round(start),endOffsetCm:round(start+consumedCm),
          consumedCm:round(consumedCm),skippedUnusableCm:round(skippedCm),
          estimatedCost:round(estimatedCost)}
        lays.push(lay)
        cutTickets.push({ticketId:`CUT-${String(cutTickets.length+1).padStart(4,'0')}`,layId,
          size,rollId:roll.rollId,batchId:roll.batchId,shade:roll.shade,
          ...(dyeLotsDeclared?{dyeLotId:roll.dyeLotId}:{}),plyCount,
          pieces:project.pieces.filter(p=>(p.fabricId||'main')===fabricId).map(p=>({
            pieceId:p.id,perPly:p.cutQuantity,total:p.cutQuantity*plyCount,
          })),factoryApproved:false})
        roll.cursorCm=start+consumedCm
        roll.skippedUnusableCm+=skippedCm
        roll.consumedCm+=consumedCm
        roll.remainingCm=Math.max(0,roll.usableLengthCm-roll.cursorCm)
        roll.estimatedCost+=estimatedCost
        needed-=plyCount
      }
    }
    if(needed)issues.push(issue('INSUFFICIENT_FABRIC',`${size}: ${needed} garments could not be allocated`))
  }
  if(issues.length)return failure()
  const rollAllocation=allocated.map(r=>({rollId:r.rollId,batchId:r.batchId,shade:r.shade,
    ...(dyeLotsDeclared?{dyeLotId:r.dyeLotId}:{}),
    usableLengthCm:round(r.usableLengthCm),consumedCm:round(r.consumedCm),
    skippedUnusableCm:round(r.skippedUnusableCm),lastLayEndCm:round(r.cursorCm),
    // Physical tail length is NOT equivalent to available clean stock.
    remainingCm:round(r.remainingCm),
    cleanRemainingCm:round(usableSegments(r,r.cursorCm).reduce((sum,[a,b])=>sum+b-a,0)),
    estimatedCost:round(r.estimatedCost)}))
  const totals={garments:lays.reduce((n,l)=>n+l.garments,0),lays:lays.length,
    materialMeters:round(lays.reduce((n,l)=>n+l.consumedCm+l.skippedUnusableCm,0)/100),
    cutMaterialMeters:round(lays.reduce((n,l)=>n+l.consumedCm,0)/100),
    unusableMaterialMeters:round(lays.reduce((n,l)=>n+l.skippedUnusableCm,0)/100),
    estimatedFabricCost:round(lays.reduce((n,l)=>n+l.estimatedCost,0))}
  const operatorWorksheet=[
    `CUT ROOM ESTIMATE | fabric ${fabricId} | shade ${commonShade} | nap ${nap?'yes':'no'}${dyeLotsDeclared?` | dye lot ${commonDyeLot}`:''}`,
    `Width ${fabricWidthCm} cm | max ply ${maxPlyCount} | spacing ${spacingCm} cm`,
    ...lays.map(l=>`${l.layId} | ${l.size} x${l.plyCount} | ${l.rollId}/${l.batchId} | ${l.startOffsetCm}–${l.endOffsetCm} cm | ${l.consumedCm} cm`),
    `TOTAL: ${totals.garments} garments | ${totals.materialMeters} m | estimated cost ${totals.estimatedFabricCost}`,
    ...(rollAllocation.some(r=>r.skippedUnusableCm>0)?['UNUSABLE ROLL OFFSETS: lay positions skip blocked defects and insufficient clean remnants']:[]),
    'SIMULATION ONLY — physical cutting approval required',
  ].join('\n')
  const manifest={schemaVersion:'exo.cutroom-plan.v1',factoryApproved:false,cuttingAuthorized:false,
    fabricId,shade:commonShade,...(dyeLotsDeclared?{dyeLotId:commonDyeLot}:{}),
    nap,fabricWidthCm,spacingCm,maxPlyCount,
    quantitiesBySize:{...quantitiesBySize},perSize,lays,cutTickets,rollAllocation,totals,
    markerTemplates:Object.fromEntries(sizes.map(size=>[size,markers[size]]))}
  return {ok:true,issues:[],lays,cutTickets,rollAllocation,perSize,totals,
    operatorWorksheet,manifest,factoryApproved:false,cuttingAuthorized:false}
}
