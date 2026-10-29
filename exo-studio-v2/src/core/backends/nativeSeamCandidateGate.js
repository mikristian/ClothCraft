// Research-only candidate acceptance screen for EXO's *real* native payload.
// A seam-only win is never enough: compare max + RMS sewn residuals, full
// principal material stretch/compression, pins and endpoint body samples.
// Even an accepted screen is NOT a fitting or swept-triangle CCD certificate.
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {verifyNativeSeamSourceIntegrity20261027} from './nativeSeamSourceIntegrity20261027.js'

const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])
const finite3=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)

// Recompute rest-mesh conditioning from the actual material coordinates,
// never trust a cached qualityApproved flag. Inverse-rest-matrix strain
// constraints are unreliable on slender triangles even when a rigid pose
// happens to pass the spectral strain screen.
function inspectRestConditioning(pieces,{maxAspect=25,minAltitudeM=.002}={}){
  let faces=0,illConditionedFaces=0,maximumAspect=0,minimumAltitudeM=Infinity
  for(const piece of pieces){
    for(const face of piece.faces){
      const [a,b,c]=face.map(i=>piece.flatVerticesM[i])
      if(![a,b,c].every(finite3))throw new RangeError('Invalid rest triangle in mesh conditioning')
      const ab=Math.hypot(a[0]-b[0],a[1]-b[1])
      const bc=Math.hypot(b[0]-c[0],b[1]-c[1])
      const ca=Math.hypot(c[0]-a[0],c[1]-a[1])
      const longest=Math.max(ab,bc,ca)
      const twiceArea=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
      const altitude=longest>0?twiceArea/longest:0
      const aspect=altitude>0?longest/altitude:Infinity
      faces++
      maximumAspect=Math.max(maximumAspect,aspect)
      minimumAltitudeM=Math.min(minimumAltitudeM,altitude)
      if(aspect>maxAspect||altitude<minAltitudeM)illConditionedFaces++
    }
  }
  return {faces,illConditionedFaces,maximumAspect,minimumAltitudeM,
    thresholds:{maxAspect,minAltitudeM},approved:faces>0&&illConditionedFaces===0}
}

function point(payload,index){
  if(!Number.isInteger(index)||index<0||index>=payload.particles.length)
    throw new RangeError('Seam endpoint particle index outside mesh')
  const p=payload.particles[index]?.position
  if(!finite3(p))throw new RangeError('Nonfinite seam endpoint position')
  return p
}
function weighted(payload,indices,weights){
  if(!Array.isArray(indices)||!Array.isArray(weights)||indices.length===0||indices.length!==weights.length)
    throw new TypeError('Invalid weighted seam correspondence')
  const out=[0,0,0]
  let sum=0
  indices.forEach((index,i)=>{
    const weight=weights[i]
    if(!Number.isFinite(weight)||weight<0)throw new RangeError('Invalid seam barycentric weight')
    sum+=weight
    const p=point(payload,index)
    for(let j=0;j<3;j++)out[j]+=p[j]*weight
  })
  if(Math.abs(sum-1)>1e-5)throw new RangeError('Seam barycentric weights must sum to one')
  return out
}

export function measureNativeSeamResiduals(payload){
  if(!payload||!Array.isArray(payload.particles)||!Array.isArray(payload.constraints))
    throw new TypeError('Native payload requires particles and constraints')
  verifyNativeSeamSourceIntegrity20261027(payload)
  const groups=new Map()
  let sum=0,squared=0,count=0,max=0
  function add(id,a,b){
    const mm=distance(a,b)*1000
    if(!Number.isFinite(mm))throw new RangeError('Nonfinite seam gap')
    const key=String(id||'unlabeled-seam')
    const row=groups.get(key)||{id:key,count:0,maxGapMm:0,sumGapMm:0,sumSquaredGapMm:0}
    row.count++;row.sumGapMm+=mm;row.sumSquaredGapMm+=mm*mm
    row.maxGapMm=Math.max(row.maxGapMm,mm)
    groups.set(key,row)
    sum+=mm;squared+=mm*mm;count++;max=Math.max(max,mm)
  }
  for(const seam of payload.constraints){
    if(seam.type!=='seam')continue
    add(seam.seamId,point(payload,seam.a),point(payload,seam.b))
  }
  for(const seam of payload.virtualSeams||[]){
    add(seam.seamId||seam.id,
      weighted(payload,seam.sourceIndices,seam.sourceWeights),
      weighted(payload,seam.targetIndices,seam.targetWeights))
  }
  if(count===0)throw new Error('Cannot compare a candidate with no sewing correspondences')
  return {
    pairCount:count,maxGapMm:max,rmsGapMm:Math.sqrt(squared/count),
    meanGapMm:sum/count,
    groups:[...groups.values()].map(x=>({
      id:x.id,pairCount:x.count,maxGapMm:x.maxGapMm,
      rmsGapMm:Math.sqrt(x.sumSquaredGapMm/x.count),meanGapMm:x.sumGapMm/x.count,
    })).sort((a,b)=>b.maxGapMm-a.maxGapMm),
  }
}

export function compareNativeSeamMerit(before,after,{toleranceMm=1e-6}={}){
  if(!Number.isFinite(toleranceMm)||toleranceMm<0)throw new RangeError('Invalid seam tolerance')
  const valid=[before,after].every(x=>
    x&&x.pairCount>0&&Number.isFinite(x.maxGapMm)&&Number.isFinite(x.rmsGapMm))
  if(!valid||before.pairCount!==after.pairCount)throw new Error('Incompatible seam metrics')
  const maxNonworse=after.maxGapMm<=before.maxGapMm+toleranceMm
  const rmsNonworse=after.rmsGapMm<=before.rmsGapMm+toleranceMm
  return {
    maxNonworse,rmsNonworse,
    strictlyImproved:(after.maxGapMm<before.maxGapMm-toleranceMm||
      after.rmsGapMm<before.rmsGapMm-toleranceMm),
    maxDeltaMm:after.maxGapMm-before.maxGapMm,
    rmsDeltaMm:after.rmsGapMm-before.rmsGapMm,
    // Cannot trade a badly worsened RMS for a better single worst seam.
    paretoImproved:maxNonworse&&rmsNonworse&&
      (after.maxGapMm<before.maxGapMm-toleranceMm||
       after.rmsGapMm<before.rmsGapMm-toleranceMm),
  }
}

// A global Pareto improvement can conceal an individual seam becoming
// worse: e.g. closing the bodice while pulling an underarm seam apart.
// Guard every named sewn group independently, including its worst and RMS
// residual. This is conservative for research acceptance, not a solver loss.
export function compareNativeSeamGroups(before,after,{toleranceMm=1e-6}={}){
  if(!Number.isFinite(toleranceMm)||toleranceMm<0)throw new RangeError('Invalid seam group tolerance')
  const old=before?.groups,newGroups=after?.groups
  if(!Array.isArray(old)||!Array.isArray(newGroups)||old.length===0)
    throw new Error('Missing seam group measurements')
  const map=new Map(newGroups.map(g=>[g.id,g]))
  if(map.size!==newGroups.length||
    new Set(old.map(g=>g.id)).size!==old.length||
    old.length!==newGroups.length)
    throw new Error('Candidate changed seam group identity')
  const regressions=[]
  for(const group of old){
    const next=map.get(group.id)
    if(!next||next.pairCount!==group.pairCount||
      ![group.maxGapMm,group.rmsGapMm,next.maxGapMm,next.rmsGapMm].every(Number.isFinite))
      throw new Error('Candidate changed seam group samples or supplied invalid residuals')
    const maxDeltaMm=next.maxGapMm-group.maxGapMm
    const rmsDeltaMm=next.rmsGapMm-group.rmsGapMm
    if(maxDeltaMm>toleranceMm||rmsDeltaMm>toleranceMm)
      regressions.push({id:group.id,maxDeltaMm,rmsDeltaMm})
  }
  return {allGroupsNonworse:regressions.length===0,regressions,
    checkedGroupCount:old.length}
}

export function auditNativeSeamCandidate(reference,candidate,{
  strainLimitPercent=5,endpointContact=null,sampledPathContact=null,pinToleranceM=1e-9,
}={}){
  if(!reference||!candidate||!Array.isArray(reference.pieces)||
    !Array.isArray(candidate.pieces)||reference.particles?.length!==candidate.particles?.length)
    throw new Error('Candidate mesh is incompatible with reference')
  if(!Number.isFinite(pinToleranceM)||pinToleranceM<0||pinToleranceM>1e-3)
    throw new RangeError('Invalid pinned position tolerance')
  if(reference.pieces.length!==candidate.pieces.length)
    throw new Error('Candidate changed garment panel count')
  for(let i=0;i<reference.pieces.length;i++){
    const a=reference.pieces[i],b=candidate.pieces[i]
    if(a.id!==b.id||a.faces.length!==b.faces.length||
       a.particleIndices.length!==b.particleIndices.length||
       JSON.stringify(a.faces)!==JSON.stringify(b.faces)||
       JSON.stringify(a.flatVerticesM)!==JSON.stringify(b.flatVerticesM)||
       JSON.stringify(a.particleIndices)!==JSON.stringify(b.particleIndices))
      throw new Error('Candidate changed material mesh or topology')
  }
  if(JSON.stringify(reference.constraints)!==JSON.stringify(candidate.constraints)||
     JSON.stringify(reference.virtualSeams||[])!==JSON.stringify(candidate.virtualSeams||[]))
    throw new Error('Candidate changed sewing correspondences')
  verifyNativeSeamSourceIntegrity20261027(reference)
  verifyNativeSeamSourceIntegrity20261027(candidate)
  const before=measureNativeSeamResiduals(reference)
  const after=measureNativeSeamResiduals(candidate)
  const merit=compareNativeSeamMerit(before,after)
  const groupMerit=compareNativeSeamGroups(before,after)
  const strain=auditNativePrincipalStrain(candidate,{limitPercent:strainLimitPercent})
  const meshConditioning=inspectRestConditioning(candidate.pieces)
  let pinsUnchanged=true,maximumPinDisplacementM=0
  for(let i=0;i<reference.particles.length;i++){
    const a=reference.particles[i],b=candidate.particles[i]
    if((a.invMass??1)!==(b.invMass??1))
      throw new Error('Candidate changed inverse particle masses')
    if((a.invMass??1)!==0)continue
    const displacement=distance(point(reference,i),point(candidate,i))
    maximumPinDisplacementM=Math.max(maximumPinDisplacementM,displacement)
    if(displacement>pinToleranceM)pinsUnchanged=false
  }
  // The avatar screen samples every garment vertex and every triangle
  // centroid. A report covering only one easy point cannot establish
  // endpoint/path clearance for the entire garment. Validate its declared
  // sample coverage independently of the caller's cached success flag.
  const expectedContactSamples=candidate.pieces.reduce((sum,piece)=>
    sum+piece.particleIndices.length+piece.faces.length,0)
  const endpointChecked=endpointContact!==null&&
    Number.isInteger(endpointContact.checked)&&endpointContact.checked===expectedContactSamples&&
    Number.isInteger(endpointContact.penetrating)&&endpointContact.penetrating>=0&&
    endpointContact.penetrating<=endpointContact.checked&&
    endpointContact.sampledAvatarClearanceOnly===true
  const endpointClear=endpointChecked&&endpointContact.penetrating===0
  const pathChecked=sampledPathContact!==null&&
    Number.isInteger(sampledPathContact.checked)&&sampledPathContact.checked>0&&
    Number.isInteger(sampledPathContact.intermediateSamples)&&sampledPathContact.intermediateSamples>=1&&
    sampledPathContact.checked===expectedContactSamples*sampledPathContact.intermediateSamples&&
    // Aggregated counts alone can conceal an unchecked pose: e.g. one
    // intermediate sample checks only one point while another over-reports.
    // Require an auditable record for every sampled pose and recompute its
    // aggregate counters. Chord and hinge-arc trajectories may share the
    // same time fractions, so uniqueness is not assumed here.
    Array.isArray(sampledPathContact.samples)&&
    sampledPathContact.samples.length===sampledPathContact.intermediateSamples&&
    sampledPathContact.samples.every(sample=>
      Number.isFinite(sample.fraction)&&sample.fraction>0&&sample.fraction<1&&
      Number.isInteger(sample.checked)&&sample.checked===expectedContactSamples&&
      Number.isInteger(sample.penetrating)&&sample.penetrating>=0&&
      sample.penetrating<=sample.checked&&
      Number.isFinite(sample.maximumIntrusionMm)&&sample.maximumIntrusionMm>=0)&&
    sampledPathContact.samples.reduce((sum,sample)=>sum+sample.checked,0)===sampledPathContact.checked&&
    sampledPathContact.samples.reduce((sum,sample)=>sum+sample.penetrating,0)===sampledPathContact.penetrating&&
    Math.abs(Math.max(...sampledPathContact.samples.map(sample=>sample.maximumIntrusionMm))-
      sampledPathContact.maximumIntrusionMm)<1e-9&&
    Number.isInteger(sampledPathContact.penetrating)&&
    sampledPathContact.penetrating>=0&&sampledPathContact.penetrating<=sampledPathContact.checked&&
    Number.isFinite(sampledPathContact.maximumIntrusionMm)&&sampledPathContact.maximumIntrusionMm>=0&&
    sampledPathContact.sampledIntermediateClearanceOnly===true&&
    sampledPathContact.sweptCollisionCertified===false
  const pathClear=pathChecked&&sampledPathContact.penetrating===0
  return {
    before,after,merit,groupMerit,strain,meshConditioning,
    pinsUnchanged,maximumPinDisplacementM,
    endpointContactChecked:endpointChecked,
    endpointContactClear:endpointClear,
    sampledPathContactChecked:pathChecked,
    sampledPathContactClear:pathClear,
    // A valid candidate for further *research*, never a safe live fitting.
    researchScreenPassed:merit.paretoImproved&&groupMerit.allGroupsNonworse&&
      strain.withinDeclaredStrainLimit&&
      meshConditioning.approved&&
      pinsUnchanged&&endpointClear&&pathClear,
    sweptCollisionCertified:false,avatarEntryCertified:false,
    safeToAutoApply:false,fitCertified:false,
  }
}
