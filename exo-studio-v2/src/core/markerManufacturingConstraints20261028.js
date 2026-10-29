// Shared fail-closed marker constraints, independent of 2D preview rendering.
// All distances here are centimetres. These guards do not certify cutting.
const declared=value=>value!==undefined&&value!==null&&value!==false&&value!==''
const finite=value=>typeof value==='number'&&Number.isFinite(value)
export const markerIssue20261028=(code,detail)=>({code,detail})

export function inspectMarkerManufacturingConstraints20261028(project,{fabricId='main',nap=false,repeatRegistrationValidatedElsewhere=false}={}){
 const issues=[]
 if(!Array.isArray(project?.pieces))return [markerIssue20261028('INVALID_PIECES','Pattern pieces missing')]
 const pieces=project.pieces.filter(p=>(p?.fabricId||'main')===fabricId)
 const settings=project.markerSettings||{}
 // Defect maps must describe excluded physical fabric zones. The current
 // marker engines have no shared defect-aware placement oracle; refuse the
 // production proposal instead of dropping declared roll imperfections.
 const defects=settings.fabricDefectsByFabric?.[fabricId]??
  settings.defectZonesByFabric?.[fabricId]??settings.rollDefectsByFabric?.[fabricId]
 if(pieces.length&&(declared(defects)||declared(settings.fabricDefects)||declared(settings.rollDefects)))
  issues.push(markerIssue20261028('FABRIC_DEFECT_LAYOUT_UNVERIFIED',`${fabricId}: physical defect exclusion is not verified`))
 for(const [key,code] of [['pairConstraints','PAIR_LAYOUT_UNVERIFIED'],['fusingConstraints','FUSING_LAYOUT_UNVERIFIED'],['foldConstraints','FOLD_LAYOUT_UNVERIFIED']]){
  if(pieces.length&&declared(settings[key]))issues.push(markerIssue20261028(code,`${key}: independent cut-layout verification required`))
 }
 for(const piece of pieces){
  const mark=piece?.marker||{}
  if(!finite(piece?.grainAngleDeg??0))issues.push(markerIssue20261028('INVALID_GRAIN',`${piece?.id||'unknown'}: finite grain angle required`))
  if([piece.fold,piece.onFold,piece.cutOnFold,mark.fold,mark.onFold,mark.cutOnFold,mark.foldEdgeIndex].some(declared))
   issues.push(markerIssue20261028('FOLD_LAYOUT_UNVERIFIED',`${piece.id}: fold edge positioning has not been verified`))
  if([piece.fusing,piece.fusedToPieceId,piece.liningForPieceId,piece.interfacingForPieceId,mark.fusing].some(declared))
   issues.push(markerIssue20261028('FUSING_LAYOUT_UNVERIFIED',`${piece.id}: multi-layer/fusing relationship unverified`))
  if([piece.pairing,piece.pairedWith,piece.mirrorPairId,mark.pairing,mark.pairedWith,mark.mirrorPairId].some(declared))
   issues.push(markerIssue20261028('PAIR_LAYOUT_UNVERIFIED',`${piece.id}: paired placement unverified`))
  if(mark.allowReverseGrain===true&&(nap===true||mark.nap==='one-way'||mark.directionalPrint===true))
   issues.push(markerIssue20261028('INVALID_ROTATION_OR_NAP',`${piece.id}: reverse grain conflicts with directional fabric`))
  if(mark.nap!==undefined&&!['one-way','two-way','none'].includes(mark.nap))
   issues.push(markerIssue20261028('INVALID_NAP',`${piece.id}: unsupported nap declaration`))
  if(mark.allowCrossGrain!==undefined&&typeof mark.allowCrossGrain!=='boolean')
   issues.push(markerIssue20261028('INVALID_ROTATION',`${piece.id}: cross-grain permission must be boolean`))
  if(!repeatRegistrationValidatedElsewhere&&(mark.repeat||mark.stripe||mark.plaid||mark.motif||mark.repeatAnchorsBySize||settings.repeatRegistrationByFabric?.[fabricId]))
   issues.push(markerIssue20261028('REPEAT_LAYOUT_UNVERIFIED',`${piece.id}: use independently validated repeat registration before production`))
 }
 return issues
}
