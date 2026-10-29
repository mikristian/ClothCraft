/**
 * Consume ONLY observed, currently activated, size-linked Rust scene metrics.
 * Simulation progress is engineering evidence, never drape acceptance,
 * collision proof, complete seam closure or garment manufacturing approval.
 */
const LEGACY_SIZES=['XS','S','M','L','XL','XXL']
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const blocked=(reason,size=null)=>({ok:false,size,reason,stage:'unverified',stepVerified:false,
  provisionalSeamGapWithin2Mm:false,fitCertified:false,manufacturingApproved:false,rows:[]})
export function inspectNativeGradedFitEvidence20261025(snapshot){
  const size=snapshot?.activeGradedSize
  if(size==null)return blocked('Activate one saved native grade size before inspecting 3D fit.')
  const catalog=snapshot?.gradeRun??snapshot?.gradeCatalog??snapshot?.gradeRunCatalog
  const canonicalSizes=Array.isArray(catalog?.sizes)?catalog.sizes:null
  const aliases=catalog?.sizeCorrespondence??{}
  if(canonicalSizes&&(
   canonicalSizes.length<2||canonicalSizes.length>24||
   canonicalSizes.some(s=>typeof s!=='string'||!s.trim())||
   new Set(canonicalSizes).size!==canonicalSizes.length||
   !aliases||typeof aliases!=='object'||Array.isArray(aliases)||
   Object.entries(aliases).some(([alias,target])=>!alias.trim()||!canonicalSizes.includes(target))))
   return blocked('Invalid native size catalog or correspondence.')
  if(canonicalSizes?!canonicalSizes.includes(size)&&!Object.hasOwn(aliases,size):!LEGACY_SIZES.includes(size))
   return blocked('Unknown native graded fitting size.')
  const evidence=snapshot?.gradedFitEvidence
  if(!evidence)return blocked('This running native backend has not supplied size-specific graded fitting evidence. Rebuild and verify the Rust session before relying on fit statistics.',size)
  if(evidence.size!==size||evidence.nativeMeshCompiled!==true||
    evidence.fitCertified!==false||evidence.manufacturingApproved!==false)
    return blocked('Native size-specific fitting evidence disagrees with the currently visible mesh or approval flags.',size)
  if(evidence.nativeStepEvidence!==true){
    if(evidence.nativeStepEvidence!==false||evidence.maxSeamGapMm!=null||
      evidence.maxRmsSeamGapMm!=null||evidence.simulationTimeSeconds!=null)
      return blocked('Unstepped native fitting preview claimed unverified simulation measurements.',size)
    return {ok:true,size,stage:'compiled-only',stepVerified:false,simulationTimeSeconds:null,
      seamCount:Number.isSafeInteger(evidence.seamCount)?evidence.seamCount:null,
      provisionalSeamGapWithin2Mm:false,
      reason:'The sized mesh compiled, but no successful graded simulation step has been measured.',
      rows:[],fitCertified:false,manufacturingApproved:false}
  }
  if(!finite(evidence.simulationTimeSeconds)||evidence.simulationTimeSeconds<=0||
    !finite(snapshot.time)||Math.abs(snapshot.time-evidence.simulationTimeSeconds)>1e-6||
    !snapshot.metrics||typeof snapshot.metrics!=='object'||
    !Number.isSafeInteger(evidence.seamCount)||evidence.seamCount<0||
    !Array.isArray(snapshot.seams)||snapshot.seams.length!==evidence.seamCount||
    evidence.measurementsFinite!==true)
    return blocked('Missing successful, current native solver step or inconsistent sewn-mesh metadata.',size)
  if(!Array.isArray(snapshot.positions)||!snapshot.positions.length||
    snapshot.positions.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!finite(n))))
    return blocked('Native graded garment 3D vertices are missing or not finite.',size)
  const rows=[]
  const seamIds=new Set()
  for(const seam of snapshot.seams){
    if(typeof seam?.id!=='string'||!seam.id||!finite(seam.gap_m)||!finite(seam.rms_gap_m)||
      seamIds.has(seam.id)||seam.gap_m<0||seam.rms_gap_m<0||
      seam.rms_gap_m>seam.gap_m+1e-9)
      return blocked('Native sewn gap statistics or seam identities are absent, duplicate or invalid.',size)
    seamIds.add(seam.id)
    rows.push({seamId:seam.id,maxGapMm:seam.gap_m*1000,
      rmsGapMm:seam.rms_gap_m*1000,withinProvisional2Mm:seam.gap_m<=.002})
  }
  const maxGapMm=rows.length?Math.max(...rows.map(row=>row.maxGapMm)):null
  const maxRmsGapMm=rows.length?Math.max(...rows.map(row=>row.rmsGapMm)):null
  if((maxGapMm===null)!==(evidence.maxSeamGapMm==null)||
    (maxRmsGapMm===null)!==(evidence.maxRmsSeamGapMm==null)||
    maxGapMm!==null&&(!finite(evidence.maxSeamGapMm)||!finite(evidence.maxRmsSeamGapMm)||
      Math.abs(maxGapMm-evidence.maxSeamGapMm)>1e-4||
      Math.abs(maxRmsGapMm-evidence.maxRmsSeamGapMm)>1e-4))
    return blocked('Native size-specific fitting gap summary disagrees with the measured sewn mesh.',size)
  const provisionalSeamGapWithin2Mm=rows.length>0&&rows.every(row=>row.withinProvisional2Mm)
  return {ok:true,size,stage:rows.length?'stepped-with-seams':'stepped-without-seams',
    stepVerified:true,simulationTimeSeconds:evidence.simulationTimeSeconds,
    seamCount:evidence.seamCount,maxGapMm,maxRmsGapMm,rows,
    provisionalSeamGapWithin2Mm,fitCertified:false,manufacturingApproved:false,
    reason:!rows.length?'Native steps were measured, but no sewn constraints exist.':
      provisionalSeamGapWithin2Mm?'Sewn gaps are provisionally within 2 mm. Fit, collision and durability remain unverified.':
        'Measured native sewn gaps still exceed provisional 2 mm closure tolerance.'}
}
