const finite=n=>typeof n==='number'&&Number.isFinite(n)
const fail=reason=>({ok:false,reason,manufacturingApproved:false,foldContactCertified:false})

/**
 * Read-only provisional manufacturing safety gate for persisted Rust tuck
 * seams. Compiled constraints are necessary, but seam convergence, bounded
 * textile strain and contact certification must be independent checks.
 *
 * No current solver result constitutes accredited physical or factory QA.
 */
export function inspectNativeTuckFitReadiness20261025(snapshot,{panelId,
  seamGapReferenceMm=2,strainReference=0.25,residualReferenceN=10}={}){
 try{
  if(!snapshot?.template||typeof panelId!=='string'||!panelId||
    !snapshot.template.panels?.some(p=>p.id===panelId))
    throw Error('An existing native source panel is required')
  if(!finite(seamGapReferenceMm)||seamGapReferenceMm<=0||seamGapReferenceMm>10||
    !finite(strainReference)||strainReference<=0||strainReference>1||
    !finite(residualReferenceN)||residualReferenceN<=0||residualReferenceN>1000)
    throw Error('Invalid provisional fit tolerance')
  const seams=(snapshot.template.seams||[]).filter(seam=>seam.id?.startsWith('tuck_')&&
    seam.a?.panel===panelId&&seam.b?.panel===panelId)
  if(!seams.length)throw Error('No saved physical tuck seams on this panel')
  const rows=seams.map(seam=>{
   const matches=(snapshot.tuckFit||[]).filter(t=>t.seamId===seam.id)
   if(matches.length!==1)throw Error('Missing or ambiguous Rust physical tuck-fit metric for '+seam.id)
   const t=matches[0]
   if(!finite(t.maxGapMm)||t.maxGapMm<0||!finite(t.rmsGapMm)||t.rmsGapMm<0||
    !Array.isArray(t.lengthsMm)||t.lengthsMm.length!==2||t.lengthsMm.some(x=>!finite(x)||x<=0)||
    t.physicalSewingConstraint!==true)
    throw Error('Invalid native sewn fold measurement for '+seam.id)
   return{seamId:seam.id,maxGapMm:t.maxGapMm,rmsGapMm:t.rmsGapMm,
    lengthsMm:[...t.lengthsMm],gapWithinReference:t.maxGapMm<=seamGapReferenceMm,
    lineLengthMismatchMm:Math.abs(t.lengthsMm[0]-t.lengthsMm[1]),
    foldContactCertified:t.foldContactCertified===true}
  })
  const metrics=snapshot.metrics
  // The installed EXO VBD/OGC solver reports extension_max_percent and
  // iterations. The older Newton solver's max_strain, converged and energy
  // fields are NOT part of current exo-session step snapshots.
  const simulated=Boolean(finite(snapshot.time)&&snapshot.time>0&&
    metrics&&Number.isSafeInteger(metrics.iterations)&&metrics.iterations>0)
  const maxStrain=simulated&&finite(metrics.extension_max_percent)?
    metrics.extension_max_percent/100:simulated&&finite(metrics.max_strain)?metrics.max_strain:null
  const residualRmsN=simulated&&finite(metrics.residual_rms_n)?metrics.residual_rms_n:null
  const minContactDistanceM=simulated&&finite(metrics.minimum_distance_m)?
    metrics.minimum_distance_m:null
  const gapPass=rows.every(row=>row.gapWithinReference)
  const strainPass=maxStrain!==null&&maxStrain<=strainReference
  const solverPass=Boolean(simulated&&residualRmsN!==null&&
    residualRmsN<=residualReferenceN&&minContactDistanceM!==null&&minContactDistanceM>=0)
  const issues=[]
  if(!simulated)issues.push('Native simulation has not yet reported a solver step after construction')
  if(!gapPass)issues.push('Physical sewn tuck gap exceeds '+seamGapReferenceMm+' mm provisional tolerance')
  if(!strainPass)issues.push('Physical solver strain is unavailable or exceeds '+(strainReference*100).toFixed(0)+'% reference')
  if(!solverPass)issues.push('Native VBD residual/contact metrics are unavailable or exceed the '+residualReferenceN+' N provisional reference; the solver does not certify equilibrium')
  // The current vertex contact / OGC system is not an independent textile
  // layer-by-layer penetration certificate or a preferred fold-angle model.
  issues.push('Fold direction, textile self-contact and grade-specific factory signoff remain unverified')
  return{ok:true,panelId,seamCount:rows.length,rows,simulated:!!simulated,
   maxStrain,maxStrainPercent:maxStrain===null?null:maxStrain*100,
   residualRmsN,minContactDistanceM,gapPass,strainPass,solverPass,
   reference:{seamGapReferenceMm,strainReference,residualReferenceN},
   provisionalFitChecksPass:gapPass&&strainPass&&solverPass,
   foldContactCertified:false,manufacturingApproved:false,issues}
 }catch(error){return fail(error.message||String(error))}
}
