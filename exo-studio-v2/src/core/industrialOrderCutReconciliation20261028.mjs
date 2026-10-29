// Read-only all-size factory order ↔ per-fabric cut-ticket reconciliation.
// No command is emitted to a cutter and no physical release can be inferred.
const own=(o,k)=>Object.hasOwn(o,k)
const record=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(o))
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]{1,64}$/.test(s)
const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e6
const key=(...items)=>JSON.stringify(items)
const refusal=issues=>({ok:false,status:'BLOCKED',issues,expectedPieces:0,observedPieces:0,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false})

/** Compare an independently authored size order with ALL fabric-specific lay
 * tickets. Never silently substitute a missing fabric, size or cut instance.
 * `explorer` is the output of buildAccuMarkExplorerOrder20261024 and each plan
 * is a buildAccuMarkCutRoomPlan result, not a receiving factory acceptance.
 */
export function inspectIndustrialOrderCutReconciliation20261028(project,explorer,plansByFabric){
 const issues=[]
 const add=(code,detail)=>issues.push({code,detail})
 const sizes=project?.grading?.sizes
 const pieces=project?.pieces
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
   sizes.some(s=>!validId(s))||new Set(sizes.map(s=>s.toLowerCase())).size!==sizes.length||
   !sizes.includes(project?.grading?.baseSize)||!Array.isArray(pieces)||!pieces.length||pieces.length>80||
   pieces.some(p=>!validId(p?.id)||!validId(p?.fabricId||'main')||!count(p?.cutQuantity)||p.cutQuantity===0)||
   new Set(pieces.map(p=>p.id.toLowerCase())).size!==pieces.length)return refusal([{code:'INVALID_SOURCE',detail:'Unique physical graded sizes, fabric IDs and positive source cut counts required'}])
 const order=explorer?.order,model=explorer?.model
 if(explorer?.ok!==true||!record(order)||!record(model)||!record(order.quantitiesBySize)||
   !Array.isArray(order.demand)||!Array.isArray(model.pieces)||
   JSON.stringify(model.gradeSizes)!==JSON.stringify(sizes)||
   !validId(order.orderId)||order.styleId!==model.styleId||order.variantId!==model.variantId||
   order.colorway!==model.colorway||
   Object.keys(order.quantitiesBySize).length!==sizes.length||
   sizes.some(s=>!own(order.quantitiesBySize,s)||!count(order.quantitiesBySize[s]))||
   !sizes.some(s=>order.quantitiesBySize[s]>0))return refusal([{code:'INVALID_ORDER',detail:'Complete source-linked order and all-size quantities required'}])
 const fabrics=[...new Set(pieces.map(p=>p.fabricId||'main'))]
 const orderedGarments=sizes.reduce((n,s)=>n+order.quantitiesBySize[s],0)
 const orderedPieces=pieces.reduce((n,p)=>n+p.cutQuantity*orderedGarments,0)
 if(order.totalGarments!==orderedGarments||order.totalPieces!==orderedPieces||
   model.sourceProjectId!==(project.id||null))add('ORDER_TOTAL_OR_SOURCE_DRIFT','Order summary or source project identity differs from authored garment')
 if(!record(plansByFabric)||Object.keys(plansByFabric).length!==fabrics.length||
   fabrics.some(f=>!own(plansByFabric,f)))return refusal([{code:'MISSING_FABRIC_PLAN',detail:'One verified cut plan per source fabric is mandatory'}])
 const expected=new Map(),sourceRows=new Map()
 for(const piece of pieces){sourceRows.set(piece.id,{fabricId:piece.fabricId||'main',cutQuantity:piece.cutQuantity})}
 for(const size of sizes)for(const piece of pieces){
  const quantity=order.quantitiesBySize[size]*piece.cutQuantity
  if(!Number.isSafeInteger(quantity))return refusal([{code:'QUANTITY_OVERFLOW',detail:`${size}/${piece.id}`}])
  if(quantity>0)expected.set(key(size,piece.id,piece.fabricId||'main'),quantity)
 }
 const modelPieces=new Map(model.pieces.map(p=>[p.pieceId,p]))
 if(modelPieces.size!==pieces.length)add('MODEL_PIECE_SET','Source piece count differs from Explorer model')
 for(const piece of pieces){
  const m=modelPieces.get(piece.id)
  if(!m||m.fabricId!==(piece.fabricId||'main')||m.cutQuantity!==piece.cutQuantity)add('MODEL_PIECE_DRIFT',piece.id)
 }
 const claimed=new Map()
 for(const row of order.demand){
  const k=key(row?.size,row?.pieceId,row?.fabricId)
  if(claimed.has(k))add('DUPLICATE_ORDER_DEMAND',k)
  claimed.set(k,row?.required)
  if(row?.orderId!==order.orderId||row?.styleId!==order.styleId||row?.variantId!==order.variantId||
    row?.colorway!==order.colorway||row?.perGarment!==sourceRows.get(row?.pieceId)?.cutQuantity)add('ORDER_IDENTITY_DRIFT',k)
 }
 if(claimed.size!==expected.size)add('ORDER_DEMAND_SET','Demand has missing or unexpected size/piece/fabric rows')
 for(const [k,n] of expected)if(claimed.get(k)!==n)add('ORDER_DEMAND_DRIFT',k)
 const observed=new Map(),seenRolls=new Set()
 for(const fabricId of fabrics){
  const plan=plansByFabric[fabricId],manifest=plan?.manifest
  if(plan?.ok!==true||!record(manifest)||manifest.fabricId!==fabricId||
    !Array.isArray(plan.lays)||!Array.isArray(plan.cutTickets)||!Array.isArray(plan.rollAllocation)||
    plan.lays.length===0||plan.cutTickets.length!==plan.lays.length||
    plan.factoryApproved!==false||plan.cuttingAuthorized!==false||
    manifest.factoryApproved!==false||manifest.cuttingAuthorized!==false){
   add('UNVERIFIED_FABRIC_PLAN',fabricId);continue
  }
  if(JSON.stringify(manifest.lays)!==JSON.stringify(plan.lays)||
    JSON.stringify(manifest.cutTickets)!==JSON.stringify(plan.cutTickets)||
    JSON.stringify(manifest.rollAllocation)!==JSON.stringify(plan.rollAllocation))
    add('PLAN_MANIFEST_DRIFT',fabricId)
  if(!record(manifest.quantitiesBySize)||Object.keys(manifest.quantitiesBySize).length!==sizes.length||
    sizes.some(s=>manifest.quantitiesBySize[s]!==order.quantitiesBySize[s]))add('PLAN_SIZE_QUANTITIES',fabricId)
  const lays=new Map()
  const rollUse=new Map()
  const rollIndex=new Map(plan.rollAllocation.map(r=>[r.rollId,r]))
  for(const lay of plan.lays){
   if(!validId(lay?.layId)||lays.has(lay.layId)||!sizes.includes(lay.size)||
     !count(lay.plyCount)||lay.plyCount===0||lay.garments!==lay.plyCount||
     !validId(lay.rollId)||!validId(lay.batchId)||!validId(lay.shade))add('INVALID_LAY',`${fabricId}/${lay?.layId}`)
   else lays.set(lay.layId,lay)
   const roll=rollIndex.get(lay?.rollId)
   const marker=manifest.markerTemplates?.[lay?.size]
   const start=lay?.startOffsetCm,end=lay?.endOffsetCm,used=lay?.consumedCm
   if(!roll||roll.batchId!==lay.batchId||roll.shade!==lay.shade||
     !Number.isFinite(lay.markerLengthCm)||lay.markerLengthCm<=0||
     !Number.isFinite(marker?.lengthCm)||Math.abs(lay.markerLengthCm-marker.lengthCm)>1e-4||
     !Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(used)||
     start<0||end<start||Math.abs(end-start-used)>1e-4||
     Math.abs(used-lay.markerLengthCm*lay.plyCount)>1e-4)
     add('LAY_ROLL_LENGTH_DRIFT',`${fabricId}/${lay?.layId}`)
   if(roll){
    const use=rollUse.get(roll.rollId)||{length:0,intervals:[]}
    use.length+=Number.isFinite(used)?used:0
    use.intervals.push([start,end])
    rollUse.set(roll.rollId,use)
   }
  }
  const seenTickets=new Set(),ticketLays=new Set()
  for(const ticket of plan.cutTickets){
   if(!validId(ticket?.ticketId)||seenTickets.has(ticket.ticketId))add('DUPLICATE_CUT_TICKET',`${fabricId}/${ticket?.ticketId}`)
   seenTickets.add(ticket?.ticketId)
   const lay=lays.get(ticket?.layId)
   if(!lay||ticketLays.has(ticket.layId)||ticket.size!==lay.size||ticket.plyCount!==lay.plyCount||
     ticket.rollId!==lay.rollId||ticket.batchId!==lay.batchId||ticket.shade!==lay.shade||
     ticket.factoryApproved!==false){add('CUT_TICKET_LAY_DRIFT',`${fabricId}/${ticket?.ticketId}`);continue}
   ticketLays.add(ticket.layId)
   if(!Array.isArray(ticket.pieces)||ticket.pieces.length!==pieces.filter(p=>(p.fabricId||'main')===fabricId).length){
    add('CUT_TICKET_PIECE_SET',`${fabricId}/${ticket.ticketId}`);continue
   }
   const seenPieces=new Set()
   for(const cut of ticket.pieces){
    const source=sourceRows.get(cut?.pieceId)
    if(!source||source.fabricId!==fabricId||seenPieces.has(cut.pieceId)||
      cut.perPly!==source.cutQuantity||cut.total!==cut.perPly*ticket.plyCount||!count(cut.total)){
      add('CUT_TICKET_QUANTITY_DRIFT',`${fabricId}/${ticket.ticketId}/${cut?.pieceId}`);continue
    }
    seenPieces.add(cut.pieceId)
    const k=key(ticket.size,cut.pieceId,fabricId)
    observed.set(k,(observed.get(k)||0)+cut.total)
   }
  }
  if(ticketLays.size!==lays.size)add('MISSING_CUT_TICKET',fabricId)
  for(const roll of plan.rollAllocation){
   if(!validId(roll?.rollId)||seenRolls.has(roll.rollId)||!Number.isFinite(roll.usableLengthCm)||
     !Number.isFinite(roll.consumedCm)||!Number.isFinite(roll.remainingCm)||
     roll.consumedCm<0||roll.remainingCm<0||roll.consumedCm>roll.usableLengthCm+1e-5||
     Math.abs(roll.consumedCm+roll.remainingCm-roll.usableLengthCm)>1e-4)
     add('ROLL_TRACEABILITY_DRIFT',`${fabricId}/${roll?.rollId}`)
   const use=rollUse.get(roll?.rollId)
   if(!use||Math.abs(use.length-roll.consumedCm)>1e-4)
     add('ROLL_LAY_CONSUMPTION_DRIFT',`${fabricId}/${roll?.rollId}`)
   if(use){
    const intervals=use.intervals.sort((a,b)=>a[0]-b[0])
    for(let i=0;i<intervals.length;i++){
     if(!Number.isFinite(intervals[i][0])||!Number.isFinite(intervals[i][1])||
       Math.abs(intervals[i][0]-(i===0?0:intervals[i-1][1]))>1e-4)
       add('ROLL_LAY_OFFSET_DRIFT',`${fabricId}/${roll?.rollId}`)
    }
   }
   seenRolls.add(roll?.rollId)
  }
  if(plan.totals?.garments!==sizes.reduce((n,s)=>n+order.quantitiesBySize[s],0))add('PLAN_GARMENT_TOTAL',fabricId)
 }
 for(const [k,n] of expected)if(observed.get(k)!==n)add('CUT_DEMAND_MISMATCH',`${k}: expected ${n}, observed ${observed.get(k)||0}`)
 for(const k of observed.keys())if(!expected.has(k))add('UNORDERED_CUT',k)
 const expectedPieces=[...expected.values()].reduce((n,v)=>n+v,0)
 const observedPieces=[...observed.values()].reduce((n,v)=>n+v,0)
 return {ok:issues.length===0,status:issues.length?'BLOCKED':'DIGITAL_ORDER_CUT_RECONCILED',issues,
  sourceSizes:[...sizes],fabricCount:fabrics.length,expectedPieces,observedPieces,
  cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
  limitations:'Local order/lay/ticket arithmetic and identity only. No physical cut count, licensed receiver acceptance, shade inspection, cutter protocol or signed factory release.'}
}
