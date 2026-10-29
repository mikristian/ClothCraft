import {gradeProject} from './grading.js'
import {seamAllowanceBoundary} from './project.js'
import {buildMarker} from './marker.js'
import {inspectMarkerManufacturingConstraints20261028} from './markerManufacturingConstraints20261028.js'

// Conservative marker QA. Uses the same physical seam-allowance boundary as
// buildMarker; bounding rectangles must be separated even for concave pieces.
const EPS=1e-6
const valid=n=>typeof n==='number'&&Number.isFinite(n)
const declaredConstraint=value=>value!==undefined&&value!==null&&value!==false&&value!==''
const norm=a=>((a%360)+360)%360
const approx=(a,b)=>Math.abs(a-b)<=EPS
const issue=(code,detail)=>({code,detail})

// Source-declared repeat registration, in centimetres. No implicit phase or
// per-size anchor is invented: a missing reference must block the cut order.
// This checks point registration, not visual stripe matching or cutter accuracy.
const repeatAxes=[['X','repeatXcm','originXcm','targetXcm'],['Y','repeatYcm','originYcm','targetYcm']]
const plainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const repeatPhaseError=(position,origin,target,period)=>{
  const delta=position-origin-target
  return Math.abs(((delta+period/2)%period+period)%period-period/2)
}
function anchorWithinCutline(point,vertices){
  let inside=false
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
    const a=vertices[j],b=vertices[i]
    const cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x)
    if(Math.abs(cross)<=EPS&&point.x>=Math.min(a.x,b.x)-EPS&&point.x<=Math.max(a.x,b.x)+EPS&&
      point.y>=Math.min(a.y,b.y)-EPS&&point.y<=Math.max(a.y,b.y)+EPS)return true
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside
}
function validateRepeatConfig(config){
  if(config===undefined)return []
  if(!plainObject(config))return [issue('INVALID_REPEAT_CONFIG','Fabric repeat registration must be a source-owned object')]
  const axes=repeatAxes.filter(([,period,origin])=>Object.hasOwn(config,period)||Object.hasOwn(config,origin))
  if(!axes.length)return [issue('INVALID_REPEAT_CONFIG','At least one fabric repeat axis is required')]
  const issues=[]
  for(const [axis,period,origin] of axes){
    if(!Object.hasOwn(config,period)||!Object.hasOwn(config,origin)||!valid(config[period])||
      config[period]<=0||config[period]>1000||!valid(config[origin])||Math.abs(config[origin])>100000)
      issues.push(issue('INVALID_REPEAT_CONFIG',`${axis} repeat and explicit fabric origin must be finite centimetres`))
  }
  if(!valid(config.toleranceCm)||config.toleranceCm<0||config.toleranceCm>0.1||
    axes.some(([,period])=>valid(config[period])&&config.toleranceCm>=config[period]/2))
    issues.push(issue('INVALID_REPEAT_TOLERANCE','Explicit tolerance must be 0–0.1 cm and below half each repeat'))
  return issues
}
function validateRepeatAnchor(anchor,config,size,pieceId){
  if(!plainObject(anchor)||!Object.hasOwn(anchor,'anchorXcm')||!Object.hasOwn(anchor,'anchorYcm')||
    !valid(anchor.anchorXcm)||!valid(anchor.anchorYcm))
    return [issue('MISSING_REPEAT_ANCHOR',`${size}/${pieceId}: explicit graded anchor coordinates required`)]
  const issues=[]
  for(const [axis,period,,target] of repeatAxes){
    if(!Object.hasOwn(config,period)){
      if(Object.hasOwn(anchor,target))issues.push(issue('INVALID_REPEAT_TARGET',`${size}/${pieceId}: ${axis} target declared without fabric repeat axis`))
      continue
    }
    if(!Object.hasOwn(anchor,target)||!valid(anchor[target])||anchor[target]<0||anchor[target]>=config[period])
      issues.push(issue('INVALID_REPEAT_TARGET',`${size}/${pieceId}: ${axis} phase must be within one repeat`))
  }
  return issues
}

export function expandAccuMarkMarkerDemand(project,quantitiesBySize){
  if(!Array.isArray(project?.pieces)||!project.pieces.length)throw Error('INVALID_PIECES')
  const sizes=project.grading?.sizes
  if(!Array.isArray(sizes)||!sizes.length||new Set(sizes).size!==sizes.length)throw Error('INVALID_SIZES')
  for(let i=0;i<sizes.length;i++){
    if(!Object.hasOwn(sizes,i)||typeof sizes[i]!=='string'||!sizes[i].trim())throw Error('INVALID_SIZES')
  }
  if(!quantitiesBySize||typeof quantitiesBySize!=='object'||Array.isArray(quantitiesBySize)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(quantitiesBySize))||
    Object.keys(quantitiesBySize).some(s=>!sizes.includes(s)))throw Error('INVALID_SIZE_QUANTITIES')
  if(sizes.some(s=>!Object.hasOwn(quantitiesBySize,s)))throw Error('MISSING_OR_INVALID_QUANTITIES')
  if(sizes.some(s=>!Number.isSafeInteger(quantitiesBySize[s])||quantitiesBySize[s]<0)||!sizes.some(s=>quantitiesBySize[s]>0))throw Error('MISSING_OR_INVALID_QUANTITIES')
  const ids=new Set(),demand=[]
  for(const piece of project.pieces){
    if(!piece||typeof piece!=='object'||!Object.hasOwn(piece,'id')||
      typeof piece.id!=='string'||!piece.id||ids.has(piece.id))throw Error('INVALID_PIECE_ID')
    ids.add(piece.id)
    if(!Object.hasOwn(piece,'cutQuantity')||!Number.isSafeInteger(piece.cutQuantity)||
      piece.cutQuantity<1||piece.cutQuantity>100)throw Error('MISSING_OR_INVALID_CUT_QUANTITY')
    if((Object.hasOwn(piece,'fabricId')&&
      (typeof piece.fabricId!=='string'||!piece.fabricId.trim()))||
      (!Object.hasOwn(piece,'fabricId')&&piece.fabricId!==undefined))throw Error('INVALID_PIECE_FABRIC_ID')
  }
  for(const size of sizes)for(const piece of project.pieces)for(let i=0;i<quantitiesBySize[size]*piece.cutQuantity;i++){
    if(demand.length>=100000)throw Error('DEMAND_LIMIT')
    demand.push({size,pieceId:piece.id,instance:i,fabricId:piece.fabricId||'main'})
  }
  return demand
}

/** Placement coordinates, dimensions, spacing, fabric width and price are cm.
 * placement: {size,pieceId,instance,x,y,rotationDeg[,width,height]}.
 * x/y locate the top-left of the rotated seam-allowance-boundary bounds.
 * Only 0-grain alignment and explicitly permitted 90-degree cross-grain are
 * accepted; 180-degree reversal is forbidden for nap/directional fabric.
 */
export function validateAccuMarkMarkerProduction(project,{
  quantitiesBySize,placements=[],fabricWidthCm,spacingCm=1.5,
  maxLengthCm=100000,costPerMeter=0,nap=false,fabricId='main',
}={}){
  const issues=[]
  let demand
  try{demand=expandAccuMarkMarkerDemand(project,quantitiesBySize)}
  catch(e){return {ok:false,issues:[issue(e.message,'Demand cannot be expanded')],unplaced:[],placed:0,required:0,metrics:null,cuttingAuthorized:false}}
  if(!valid(fabricWidthCm)||fabricWidthCm<=0||fabricWidthCm>1000)issues.push(issue('INVALID_FABRIC_WIDTH','Width must be 0–1000 cm'))
  if(!valid(spacingCm)||spacingCm<0||spacingCm>50)issues.push(issue('INVALID_SPACING','Spacing must be 0–50 cm'))
  if(!valid(maxLengthCm)||maxLengthCm<=0||maxLengthCm>100000)issues.push(issue('INVALID_MAX_LENGTH','Length must be positive and <=100000 cm'))
  if(!valid(costPerMeter)||costPerMeter<0||costPerMeter>1e7)issues.push(issue('INVALID_COST_RATE','Cost per running meter must be finite and nonnegative'))
  if(typeof fabricId!=='string'||!fabricId.trim())issues.push(issue('INVALID_FABRIC_ID','Fabric ID is required'))
  if(!Array.isArray(placements)||placements.length>100000)issues.push(issue('INVALID_PLACEMENTS','Placements must be a bounded array'))
  if(issues.length)return {ok:false,issues,unplaced:demand,placed:0,required:demand.length,metrics:null,cuttingAuthorized:false}
  const required=demand.filter(d=>d.fabricId===fabricId)
  issues.push(...inspectMarkerManufacturingConstraints20261028(project,{fabricId,nap,repeatRegistrationValidatedElsewhere:true}))
  // A valid marker cannot be inferred from an empty subset of a real cutting
  // order. In particular, defaulting to "main" must not silently approve an
  // order whose pieces are assigned only to a different fabric.
  if(!required.length)issues.push(issue('NO_REQUIRED_PIECES_FOR_FABRIC',`No requested cutting pieces use fabric ${fabricId}`))
  const repeatByFabric=project.markerSettings?.repeatRegistrationByFabric
  if(repeatByFabric!==undefined&&!plainObject(repeatByFabric))
    issues.push(issue('INVALID_REPEAT_CONFIG','Repeat registration by fabric must be a keyed object'))
  const repeatConfig=plainObject(repeatByFabric)&&Object.hasOwn(repeatByFabric,fabricId)?repeatByFabric[fabricId]:undefined
  issues.push(...validateRepeatConfig(repeatConfig))
  if(repeatConfig===undefined&&project.pieces.some(p=>(p.fabricId||'main')===fabricId&&p.marker?.repeatAnchorsBySize!==undefined))
    issues.push(issue('REPEAT_CONFIG_REQUIRED','Piece repeat anchors require fabric repeat registration'))
  if(repeatConfig!==undefined&&!issues.length){
    const unique=new Set()
    for(const d of required){
      const key=`${d.size}\0${d.pieceId}`
      if(unique.has(key))continue
      unique.add(key)
      const original=project.pieces.find(p=>p.id===d.pieceId)
      const bySize=original?.marker?.repeatAnchorsBySize
      const anchor=plainObject(bySize)&&Object.hasOwn(bySize,d.size)?bySize[d.size]:undefined
      issues.push(...validateRepeatAnchor(anchor,repeatConfig,d.size,d.pieceId))
    }
  }
  // A fold edge is not an ordinary free rectangle edge: neither this
  // validator nor buildMarker proves a cutline lies on the fabric fold.
  // Refuse authored fold requirements rather than accepting an off-fold
  // layout merely because all other placement constraints happen to pass.
  const requestedPieceIds=new Set(required.map(d=>d.pieceId))
  if(requestedPieceIds.size&&declaredConstraint(project.markerSettings?.pairConstraints))
    issues.push(issue('PAIR_LAYOUT_UNVERIFIED','Source pair constraints require a verified mirrored/pair placement solver'))
  if(requestedPieceIds.size&&declaredConstraint(project.markerSettings?.fusingConstraints))
    issues.push(issue('FUSING_LAYOUT_UNVERIFIED','Source fusing constraints require verified fused-layer cut planning'))
  if(requestedPieceIds.size&&declaredConstraint(project.markerSettings?.foldConstraints))
    issues.push(issue('FOLD_LAYOUT_UNVERIFIED','Source fold constraints require verified fold-edge placement'))
  for(const original of project.pieces){
    if(!requestedPieceIds.has(original.id))continue
    if(original.fold||original.onFold||original.cutOnFold||original.marker?.fold||
       original.marker?.onFold||original.marker?.cutOnFold||
       declaredConstraint(original.marker?.foldEdgeIndex))
      issues.push(issue('FOLD_LAYOUT_UNVERIFIED',`${original.id}: on-fold cutting requires verified fold-edge placement`))
    if([original.fusing,original.fusedToPieceId,original.liningForPieceId,
      original.interfacingForPieceId,
      original.marker?.fusing].some(declaredConstraint))
      issues.push(issue('FUSING_LAYOUT_UNVERIFIED',`${original.id}: fused/lining material relationships require verified cut planning`))
    if([original.pairing,original.pairedWith,original.mirrorPairId,
      original.marker?.pairing,original.marker?.pairedWith,original.marker?.mirrorPairId].some(declaredConstraint))
      issues.push(issue('PAIR_LAYOUT_UNVERIFIED',`${original.id}: mirror/pair relationship requires verified cutting constraints`))
  }
  if(issues.length)return {ok:false,issues,unplaced:required,placed:0,required:required.length,metrics:null,cuttingAuthorized:false}
  const needed=new Map(required.map(d=>[`${d.size}\0${d.pieceId}\0${d.instance}`,d]))
  const seen=new Set(),accepted=[],gradedBySize=new Map()
  const findPiece=(size,id)=>{
    if(!gradedBySize.has(size))gradedBySize.set(size,gradeProject(project,size))
    return gradedBySize.get(size).pieces.find(p=>p.id===id)
  }
  for(let i=0;i<placements.length;i++){
    const p=placements[i],key=`${p?.size}\0${p?.pieceId}\0${p?.instance}`
    if(!needed.has(key)){issues.push(issue('UNREQUESTED_INSTANCE',`placement ${i}`));continue}
    if(seen.has(key)){issues.push(issue('DUPLICATE_INSTANCE',`placement ${i}`));continue}
    if(!valid(p.x)||!valid(p.y)||!valid(p.rotationDeg)){issues.push(issue('INVALID_POSITION',`placement ${i}`));continue}
    let piece
    try{piece=findPiece(p.size,p.pieceId)}catch(e){issues.push(issue('GRADE_FAILURE',`placement ${i}: ${e.message}`));continue}
    if(!piece){issues.push(issue('MISSING_GRADED_PIECE',`placement ${i}`));continue}
    const original=project.pieces.find(piece=>piece.id===p.pieceId)
    const grain=original.grainAngleDeg??0
    if(!valid(grain)){issues.push(issue('INVALID_GRAIN',`placement ${i}`));continue}
    const angle=norm(p.rotationDeg+grain)
    const permitted=[0,...(original.marker?.allowCrossGrain?[90]:[]),...(nap?[]:[180,...(original.marker?.allowCrossGrain?[270]:[])])]
    if(!permitted.some(v=>approx(angle,v))){issues.push(issue('INVALID_ROTATION_OR_NAP',`placement ${i}`));continue}
    let vertices
    try{vertices=seamAllowanceBoundary(piece,12)}catch(e){issues.push(issue('INVALID_BOUNDARY',`placement ${i}`));continue}
    if(!Array.isArray(vertices)||vertices.length<3||vertices.some(v=>!valid(v.x)||!valid(v.y))){issues.push(issue('INVALID_BOUNDARY',`placement ${i}`));continue}
    const rad=p.rotationDeg*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad)
    const points=vertices.map(v=>({x:v.x*c-v.y*s,y:v.x*s+v.y*c}))
    const xs=points.map(q=>q.x),ys=points.map(q=>q.y)
    const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys)
    if(!(width>EPS&&height>EPS)){issues.push(issue('DEGENERATE_BOUNDARY',`placement ${i}`));continue}
    if(repeatConfig!==undefined){
      const anchor=original.marker.repeatAnchorsBySize[p.size]
      const rawX=anchor.anchorXcm*c-anchor.anchorYcm*s
      const rawY=anchor.anchorXcm*s+anchor.anchorYcm*c
      if(!anchorWithinCutline({x:anchor.anchorXcm,y:anchor.anchorYcm},vertices)){
        issues.push(issue('REPEAT_ANCHOR_OUTSIDE_PIECE',`placement ${i}: anchor outside graded cutline`))
      }else{
        const world={X:p.x+rawX-Math.min(...xs),Y:p.y+rawY-Math.min(...ys)}
        for(const [axis,period,origin,target] of repeatAxes.filter(([,period])=>repeatConfig[period]!==undefined)){
          if(repeatPhaseError(world[axis],repeatConfig[origin],anchor[target],repeatConfig[period])>repeatConfig.toleranceCm+EPS)
            issues.push(issue('REPEAT_PHASE_MISMATCH',`placement ${i}: ${axis} phase outside declared tolerance`))
        }
      }
    }
    if(p.width!==undefined&&(!valid(p.width)||Math.abs(p.width-width)>0.01)||p.height!==undefined&&(!valid(p.height)||Math.abs(p.height-height)>0.01))issues.push(issue('SIZE_MISMATCH',`placement ${i}`))
    if(p.x< -EPS||p.y< -EPS||p.x+width>fabricWidthCm+EPS||p.y+height>maxLengthCm+EPS)issues.push(issue('OUT_OF_FABRIC',`placement ${i}`))
    const area=Math.abs(points.reduce((sum,q,j)=>sum+q.x*points[(j+1)%points.length].y-q.y*points[(j+1)%points.length].x,0)/2)
    if(!(area>EPS)){issues.push(issue('DEGENERATE_AREA',`placement ${i}`));continue}
    seen.add(key)
    accepted.push({...p,width,height,area})
  }
  for(let i=0;i<accepted.length;i++)for(let j=i+1;j<accepted.length;j++){
    const a=accepted[i],b=accepted[j]
    if(a.x+a.width+spacingCm>b.x+EPS&&b.x+b.width+spacingCm>a.x+EPS&&a.y+a.height+spacingCm>b.y+EPS&&b.y+b.height+spacingCm>a.y+EPS)
      issues.push(issue('PLACEMENT_OVERLAP',`${a.size}/${a.pieceId}/${a.instance} vs ${b.size}/${b.pieceId}/${b.instance}`))
  }
  const unplaced=required.filter(d=>!seen.has(`${d.size}\0${d.pieceId}\0${d.instance}`))
  if(unplaced.length)issues.push(issue('UNPLACED_REQUIRED_INSTANCES',`${unplaced.length} required instances absent`))
  const lengthCm=accepted.length?Math.max(...accepted.map(p=>p.y+p.height)):0
  const totalAreaCm2=accepted.reduce((sum,p)=>sum+p.area,0)
  const utilization=lengthCm>0?totalAreaCm2/(fabricWidthCm*lengthCm):0
  if(utilization>1+EPS)issues.push(issue('INVALID_UTILIZATION','Area exceeds available marker area'))
  const meters=lengthCm/100,cost=meters*costPerMeter
  if(!Number.isFinite(cost))issues.push(issue('COST_OVERFLOW','Computed cost exceeds numeric range'))
  return {ok:issues.length===0,issues,unplaced,placed:seen.size,required:required.length,
    metrics:{lengthCm,meters,areaCm2:totalAreaCm2,utilization,estimatedFabricCost:cost},cuttingAuthorized:false}
}

/** Compare two measured ruler directions from the existing 100 mm plot checks. */
export function checkAccuMarkPlotCalibration({expectedMm=100,measuredXmm,measuredYmm,tolerancePct=0.5}={}){
  if(![expectedMm,measuredXmm,measuredYmm,tolerancePct].every(valid)||expectedMm<=0||expectedMm>1000||measuredXmm<=0||measuredYmm<=0||tolerancePct<0||tolerancePct>10)
    return {ok:false,issues:[issue('INVALID_CALIBRATION','Provide valid measured and expected distances')],cuttingAuthorized:false}
  const errorXPct=(measuredXmm/expectedMm-1)*100,errorYPct=(measuredYmm/expectedMm-1)*100
  const issues=[]
  if(Math.abs(errorXPct)>tolerancePct)issues.push(issue('PLOT_X_SCALE','Horizontal ruler outside tolerance'))
  if(Math.abs(errorYPct)>tolerancePct)issues.push(issue('PLOT_Y_SCALE','Vertical ruler outside tolerance'))
  return {ok:issues.length===0,errorXPct,errorYPct,issues,cuttingAuthorized:false}
}

/** Deterministic production planning, never a cutting approval.
 * Each garment creates one full graded size run; runs are stacked along
 * fabric length, separated by spacingCm. Requested count includes all
 * piece.cutQuantity instances for each garment/size.
 */
export function buildAccuMarkMarkerOrder(project,{
  quantitiesBySize,fabricWidthCm,spacingCm=1.5,costPerMeter=0,
  nap=false,fabricId='main',maxLengthCm=100000,
}={}){
  let demand
  try{demand=expandAccuMarkMarkerDemand(project,quantitiesBySize)}
  catch(e){
    const validation={ok:false,issues:[issue(e.message,'Cannot expand requested marker order')],unplaced:[],required:0,placed:0,metrics:null,cuttingAuthorized:false}
    return {placements:[],validation,unplaced:[],cuttingAuthorized:false}
  }
  const required=demand.filter(d=>d.fabricId===fabricId)
  const sourceSettings={quantitiesBySize,fabricWidthCm,spacingCm,costPerMeter,nap,fabricId,maxLengthCm}
  const placements=[],failures=[]
  const badConfig=validateAccuMarkMarkerProduction(project,{...sourceSettings,placements:[]})
    .issues.filter(i=>i.code!=='UNPLACED_REQUIRED_INSTANCES')
  if(badConfig.length)return {
    placements,unplaced:required,validation:{ok:false,issues:badConfig,unplaced:required,placed:0,required:required.length,metrics:null,cuttingAuthorized:false},cuttingAuthorized:false,
  }
  let cursor=0
  for(const size of project.grading.sizes){
    const quantity=quantitiesBySize[size]
    if(!quantity||!required.some(d=>d.size===size))continue
    let graded
    try{graded=gradeProject(project,size)}
    catch(e){failures.push(issue('GRADE_FAILURE',`${size}: ${e.message}`));continue}
    const originalPieces=project.pieces.filter(p=>(p.fabricId||'main')===fabricId)
    const pieces=[]
    for(const original of originalPieces){
      const gradedPiece=graded.pieces.find(p=>p.id===original.id)
      if(!gradedPiece){failures.push(issue('MISSING_GRADED_PIECE',`${size}/${original.id}`));continue}
      pieces.push({...gradedPiece,cutQuantity:original.cutQuantity,grainAngleDeg:original.grainAngleDeg,marker:original.marker,fabricId})
    }
    if(pieces.length!==originalPieces.length)continue
    const runProject={...graded,pieces}
    for(let garment=0;garment<quantity;garment++){
      let marker
      try{marker=buildMarker(runProject,fabricWidthCm,spacingCm,{fabricId,nap,strictProductionDemand:true,
        repeatRegistrationValidatedElsewhere:true})}
      catch(e){failures.push(issue('MARKER_BUILD_FAILURE',`${size}/garment ${garment}: ${e.message}`));continue}
      const expected=pieces.reduce((sum,p)=>sum+p.cutQuantity,0)
      if(marker.requestedPieces!==expected||marker.unplaced?.length||marker.placements.length!==expected){
        failures.push(issue('UNPLACED_MARKER_PIECES',`${size}/garment ${garment}: ${expected-marker.placements.length} not placed`))
      }
      for(const p of marker.placements){
        const piece=pieces.find(item=>item.id===p.pieceId)
        if(!piece||!Number.isSafeInteger(p.instance)||p.instance<0||p.instance>=piece.cutQuantity){
          failures.push(issue('INVALID_MARKER_INSTANCE',`${size}/garment ${garment}`))
          continue
        }
        placements.push({...p,size,instance:garment*piece.cutQuantity+p.instance,y:p.y+cursor,
          outline:p.outline?.map(point=>({x:point.x,y:point.y+cursor}))})
      }
      if(!valid(marker.length)||marker.length<0){
        failures.push(issue('INVALID_MARKER_LENGTH',`${size}/garment ${garment}`))
        continue
      }
      cursor+=marker.length+spacingCm
    }
  }
  const validation=validateAccuMarkMarkerProduction(project,{...sourceSettings,placements})
  validation.issues.push(...failures)
  validation.ok=validation.ok&&failures.length===0
  return {placements,validation,unplaced:validation.unplaced,cuttingAuthorized:false}
}
