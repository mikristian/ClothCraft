// Bounded, opt-in topology-only research search. It never applies a remesh,
// installs constraints, modifies the editable garment, or certifies contact.
import {inspectNativeCreaseRepairCandidate20261024} from './nativeCreaseRepairCandidateGate20261024.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const signed=(vertices,face)=>cross(...face.map(i=>vertices[i]))
const quality=(vertices,face)=>{
  const points=face.map(i=>vertices[i])
  const longest=Math.max(...[0,1,2].map(i=>
    Math.hypot(points[i][0]-points[(i+1)%3][0],
      points[i][1]-points[(i+1)%3][1])))
  const altitude=Math.abs(signed(vertices,face))/longest
  return altitude<.002||longest/altitude>25
}
const orient=(vertices,face,sign)=>
  Math.sign(signed(vertices,face))===sign?face:[face[0],face[2],face[1]]
const lexLess=(a,b)=>{
  for(let i=0;i<a.length;i++){
    if(a[i]<b[i])return true
    if(a[i]>b[i])return false
  }
  return false
}

export function searchNativeCreaseRepairFlips20261024(reference,{
  maxEvaluations=48,witnessFaces=[97,104],clearanceM=.001,
}={}){
  if(!Number.isInteger(maxEvaluations)||maxEvaluations<1||maxEvaluations>64||
     !Array.isArray(witnessFaces)||witnessFaces.length>8||
     witnessFaces.some(i=>!Number.isInteger(i)||i<0||
       i>=reference?.faces?.length))
    throw new RangeError('Invalid bounded crease repair search budget')
  // The existing gate validates all source material/provenance before any
  // proposal is considered. Its flat-contact screen is not a CCD certificate.
  const baseline=inspectNativeCreaseRepairCandidate20261024(
    reference,reference,{clearanceM})
  const original=JSON.stringify(reference)
  const vertices=reference.verticesM,faces=reference.faces
  const incidence=new Map()
  for(let i=0;i<faces.length;i++)for(let j=0;j<3;j++){
    const f=faces[i],a=f[j],b=f[(j+1)%3],c=f[(j+2)%3]
    const key=edgeKey(a,b)
    if(!incidence.has(key))incidence.set(key,[])
    incidence.get(key).push({face:i,a,b,c})
  }
  const crease=new Set(reference.creaseEdges.map(([a,b])=>edgeKey(a,b)))
  const witness=new Set(witnessFaces)
  const poor=new Set(faces.flatMap((f,i)=>quality(vertices,f)?[i]:[]))
  const proposals=[]
  for(const [key,uses] of incidence){
    if(uses.length!==2||crease.has(key))continue
    const [u,v]=uses
    if(u.c===v.c||incidence.has(edgeKey(u.c,v.c)))continue
    const a=vertices[u.a],b=vertices[u.b],c=vertices[u.c],d=vertices[v.c]
    const ca=cross(a,b,c),da=cross(a,b,d)
    const ac=cross(c,d,a),bc=cross(c,d,b)
    if(ca*da>=-1e-14||ac*bc>=-1e-14)continue
    const sign=Math.sign(signed(vertices,faces[u.face]))
    if(!sign||Math.sign(signed(vertices,faces[v.face]))!==sign)continue
    const first=orient(vertices,[u.c,v.c,u.a],sign)
    const second=orient(vertices,[v.c,u.c,u.b],sign)
    if(signed(vertices,first)*sign<=1e-14||
       signed(vertices,second)*sign<=1e-14)continue
    if([first,second].some(f=>{
      const xs=f.map(i=>vertices[i][0])
      return Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9
    }))continue
    proposals.push({key,faces:[u.face,v.face],replacement:[first,second],
      priority:Number(witness.has(u.face)||witness.has(v.face))*2+
        Number(poor.has(u.face)||poor.has(v.face))})
  }
  proposals.sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key))
  let evaluated=0,rejected=0,nonregressingCounts=0,improved=0
  let best=null
  for(const proposal of proposals.slice(0,maxEvaluations)){
    const candidate={...reference,faces:faces.map(f=>[...f])}
    candidate.faces[proposal.faces[0]]=proposal.replacement[0]
    candidate.faces[proposal.faces[1]]=proposal.replacement[1]
    let result
    try{
      result=inspectNativeCreaseRepairCandidate20261024(
        reference,candidate,{clearanceM})
    }catch{
      rejected++
      continue
    }
    evaluated++
    const q=result.candidate,p=baseline.candidate
    const noRegression=q.illConditioned<=p.illConditioned&&
      q.nearClearancePairs<=p.nearClearancePairs&&
      q.intersectingPairs<=p.intersectingPairs
    if(!noRegression)continue
    nonregressingCounts++
    const improves=q.illConditioned<p.illConditioned||
      q.nearClearancePairs<p.nearClearancePairs||
      q.intersectingPairs<p.intersectingPairs
    if(!improves)continue
    improved++
    // Prefer fewer poor elements, then fewer clearance warnings. Do not
    // trade away one safety metric for another or auto-apply the candidate.
    const score=[q.illConditioned,q.intersectingPairs,
      q.nearClearancePairs,q.maxAspect,-q.minAltitudeMm]
    if(!best||lexLess(score,best.score)){
      best={edge:proposal.key,score,metrics:q,faces:candidate.faces}
    }
  }
  if(JSON.stringify(reference)!==original)
    throw new Error('Crease repair search mutated reference')
  // Count reductions can conceal a WORSE closest pair. Reconstruct the
  // minimum exact static clearance independently for the reported tradeoff.
  const minimumContact=triangles=>inspectNativeIntrapanelStaticContact({
    pieces:[{id:reference.panelId||'research-sleeve',
      particleIndices:vertices.map((_,i)=>i),faces:triangles}],
    particles:vertices.map(position=>({position}))},{
    clearanceM,maxPairs:512*511/2}).minimumNearClearanceMm
  const baselineMinimumClearanceMm=best?minimumContact(faces):null
  const candidateMinimumClearanceMm=best?minimumContact(best.faces):null
  return {baseline:baseline.candidate,possibleFlips:proposals.length,
    attempted:Math.min(maxEvaluations,proposals.length),evaluated,rejected,
    nonregressingCounts,improved,best:best&&{
      edge:best.edge,metrics:best.metrics,faces:best.faces,
      minimumAltitudeRegressed:
        best.metrics.minAltitudeMm+1e-9<baseline.candidate.minAltitudeMm,
      maximumAspectRegressed:
        best.metrics.maxAspect>baseline.candidate.maxAspect+1e-9,
      baselineMinimumClearanceMm,candidateMinimumClearanceMm,
      minimumClearanceRegressed:
        (candidateMinimumClearanceMm??Infinity)+1e-9<
          (baselineMinimumClearanceMm??Infinity),
      flatContactStillBlocked:best.metrics.nearClearancePairs>0||
        best.metrics.intersectingPairs>0,
      meshQualityStillBlocked:best.metrics.illConditioned>0},
    sourceUnchanged:true,candidateApplied:false,physicalAcceptance:false,
    foldContactChecked:false,sweptCollisionCertified:false,
    safeToAutoApply:false}
}
