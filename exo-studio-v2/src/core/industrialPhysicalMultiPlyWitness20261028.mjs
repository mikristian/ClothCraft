// Read-only physical multilayer witness. Source-supplied observations are not
// independent factory signoff, calibrated cutter qualification, or CAD parity.
const blocked=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
 physicallyMeasured:false,independentWitnessAuthenticated:false,
 cuttingAuthorized:false,factoryApproved:false,machineReady:false})
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,96}$/.test(value)
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 [Object.prototype,null].includes(Object.getPrototypeOf(value))

export function inspectIndustrialPhysicalMultiPlyWitness20261028(plan,observations,{toleranceMm=.5}={}){
 if(plan?.ok!==true||!Array.isArray(plan.lays)||!plan.lays.length||
  !Array.isArray(plan.cutTickets)||plan.cutTickets.length!==plan.lays.length||
  plan.cuttingAuthorized!==false||plan.factoryApproved!==false)
  return blocked('UNVERIFIED_DIGITAL_LAY_PLAN')
 if(!finite(toleranceMm)||toleranceMm<0||toleranceMm>2)return blocked('INVALID_MEASUREMENT_TOLERANCE')
 if(!record(observations)||observations.format!=='exo.physical-multiply-measurement.v1'||
  !Array.isArray(observations.lays)||observations.lays.length!==plan.lays.length||
  !id(observations.factory)||!id(observations.operator)||!id(observations.calibrationId)||
  !id(observations.signedReportReference))return blocked('MISSING_PHYSICAL_WITNESS')
 const layIds=new Set(),ticketIds=new Set()
 for(const lay of plan.lays){
  if(!id(lay?.layId)||layIds.has(lay.layId)||!id(lay.rollId)||!id(lay.size)||
   !Number.isSafeInteger(lay.plyCount)||lay.plyCount<1||!finite(lay.markerLengthCm)||lay.markerLengthCm<=0)
   return blocked('INVALID_DIGITAL_LAY_IDENTITY')
  layIds.add(lay.layId)
 }
 for(const ticket of plan.cutTickets){
  if(!id(ticket?.layId)||ticketIds.has(ticket.layId)||!layIds.has(ticket.layId)||
   !Array.isArray(ticket.pieces)||!ticket.pieces.length||
   ticket.pieces.some(piece=>!Number.isSafeInteger(piece?.total)||piece.total<1))
   return blocked('INVALID_DIGITAL_CUT_TICKET')
  ticketIds.add(ticket.layId)
 }
 if(ticketIds.size!==layIds.size)return blocked('UNMATCHED_DIGITAL_CUT_TICKETS')
 const seen=new Set(),issues=[]
 for(const sample of observations.lays){
  const lay=plan.lays.find(row=>row.layId===sample?.layId)
  if(!lay||seen.has(sample.layId)){issues.push({code:'UNKNOWN_OR_DUPLICATE_LAY',detail:sample?.layId});continue}
  seen.add(sample.layId)
  const intended=plan.cutTickets.find(ticket=>ticket.layId===lay.layId)
  if(!intended||sample.rollId!==lay.rollId||sample.size!==lay.size||
    sample.plyCount!==lay.plyCount||sample.measuredPieceCount!==intended.pieces.reduce((n,p)=>n+p.total,0)){
    issues.push({code:'MEASURED_LAY_INVENTORY_DRIFT',detail:lay.layId});continue
  }
  if(!Array.isArray(sample.plies)||sample.plies.length!==lay.plyCount||
    sample.plies.some((ply,i)=>!record(ply)||ply.index!==i+1||
      !finite(ply.measuredMarkerLengthMm)||ply.measuredMarkerLengthMm<=0||
      !finite(ply.registrationOffsetMm)||!finite(ply.foldOffsetMm)||
      Math.abs(ply.measuredMarkerLengthMm-lay.markerLengthCm*10)>toleranceMm||
      Math.abs(ply.registrationOffsetMm)>toleranceMm||Math.abs(ply.foldOffsetMm)>toleranceMm))
   issues.push({code:'PHYSICAL_PLY_TOLERANCE_EXCEEDED',detail:lay.layId})
 }
 if(issues.length)return {...blocked('PHYSICAL_MULTIPLY_REVIEW_REFUSED'),issues}
 return {ok:true,status:'SELF_REPORTED_PHYSICAL_MEASUREMENTS_WITHIN_TOLERANCE',issues:[],
  inspectedLays:seen.size,inspectedPlies:plan.lays.reduce((n,l)=>n+l.plyCount,0),
  physicallyMeasured:false,independentWitnessAuthenticated:false,
  cuttingAuthorized:false,factoryApproved:false,machineReady:false,
  limitations:'Numerical observations checked against digital lays only. Actual physical measurement provenance and licensed factory release remain unverified.'}
}
