// Research-only bounded two-edge retriangulation. The first flip is allowed
// to be an intermediate geometry; only the final pair is safety-ranked.
// No production solver, garment state, or installed app is modified.
import {inspectNativeCreaseRepairCandidate20261024 as gate} from './nativeCreaseRepairCandidateGate20261024.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const signed=(vertices,face)=>cross(...face.map(i=>vertices[i]))
const orient=(v,face,sign)=>Math.sign(signed(v,face))===sign?
  face:[face[0],face[2],face[1]]
const poor=(v,face)=>{
  const lengths=[0,1,2].map(i=>Math.hypot(
    v[face[i]][0]-v[face[(i+1)%3]][0],
    v[face[i]][1]-v[face[(i+1)%3]][1]))
  const longest=Math.max(...lengths),altitude=Math.abs(signed(v,face))/longest
  return altitude<.002||longest/altitude>25
}
const apply=(piece,flip)=>{
  const faces=piece.faces.map(f=>[...f])
  faces[flip.faces[0]]=flip.replacement[0]
  faces[flip.faces[1]]=flip.replacement[1]
  return {...piece,faces}
}
// Two disjoint flips commute: canonicalize final faces so the same
// triangulation is not evaluated again through the opposite flip order.
const topologyKey=faces=>faces.map(face=>[...face]
  .sort((a,b)=>a-b).join(':')).sort().join('|')

function flips(piece,witness){
  const v=piece.verticesM,incidence=new Map(),bad=new Set()
  for(let i=0;i<piece.faces.length;i++){
    const face=piece.faces[i]
    if(poor(v,face))bad.add(i)
    for(let j=0;j<3;j++){
      const a=face[j],b=face[(j+1)%3],c=face[(j+2)%3]
      const k=key(a,b)
      if(!incidence.has(k))incidence.set(k,[])
      incidence.get(k).push({face:i,a,b,c})
    }
  }
  const crease=new Set(piece.creaseEdges.map(([a,b])=>key(a,b)))
  const result=[]
  for(const [edge,uses] of incidence){
    if(uses.length!==2||crease.has(edge))continue
    const [u,w]=uses
    if(u.c===w.c||incidence.has(key(u.c,w.c)))continue
    const [a,b,c,d]=[v[u.a],v[u.b],v[u.c],v[w.c]]
    if(cross(a,b,c)*cross(a,b,d)>=-1e-14||
       cross(c,d,a)*cross(c,d,b)>=-1e-14)continue
    const sign=Math.sign(signed(v,piece.faces[u.face]))
    if(!sign||Math.sign(signed(v,piece.faces[w.face]))!==sign)continue
    const replacement=[
      orient(v,[u.c,w.c,u.a],sign),
      orient(v,[w.c,u.c,u.b],sign)]
    if(replacement.some(face=>{
      const xs=face.map(i=>v[i][0])
      return signed(v,face)*sign<=1e-14||
        Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9
    }))continue
    result.push({edge,faces:[u.face,w.face],replacement,
      priority:Number(witness.has(u.face)||witness.has(w.face))*2+
        Number(bad.has(u.face)||bad.has(w.face))})
  }
  return result.sort((a,b)=>b.priority-a.priority||
    a.edge.localeCompare(b.edge))
}

export function measureNativeCreaseDisjointMinimum20261024(piece,clearanceM=.001){
  const contact=inspectNativeIntrapanelStaticContact({
    pieces:[{id:piece.panelId||'research-sleeve',
      particleIndices:piece.verticesM.map((_,i)=>i),faces:piece.faces}],
    particles:piece.verticesM.map(position=>({position}))},{
    clearanceM,maxPairs:512*511/2})
  if(contact.minimumNearClearanceMm!==null)
    return contact.minimumNearClearanceMm
  // The static screen intentionally measures exact distance only BELOW its
  // warning threshold. A no-warning result is a lower bound, NOT an exact
  // minimum. Measure all disjoint material pairs before ranking improvements.
  const v=piece.verticesM
  const triangles=piece.faces.map(face=>face.map(i=>v[i]))
  const boxes=triangles.map(points=>({
    min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),
    max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))}))
  let minimumM=Infinity
  for(let i=0;i<piece.faces.length;i++)
    for(let j=i+1;j<piece.faces.length;j++){
      if(piece.faces[i].some(index=>piece.faces[j].includes(index)))continue
      const a=boxes[i],b=boxes[j]
      const lowerBound=Math.hypot(...[0,1,2].map(k=>
        Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))
      if(lowerBound>=minimumM)continue
      minimumM=Math.min(minimumM,
        measureNativeTriangleDistanceM(triangles[i],triangles[j]))
    }
  if(!Number.isFinite(minimumM))
    throw new Error('No disjoint material faces for exact clearance ranking')
  return minimumM*1000
}
const tol=1e-9
const noRegression=(a,b)=>b.illConditioned<=a.illConditioned&&
  b.nearClearancePairs<=a.nearClearancePairs&&
  b.intersectingPairs<=a.intersectingPairs&&
  b.minAltitudeMm+tol>=a.minAltitudeMm&&
  b.maxAspect<=a.maxAspect+tol
const better=(a,b,baseClear,newClear)=>
  b.illConditioned<a.illConditioned||
  b.nearClearancePairs<a.nearClearancePairs||
  b.intersectingPairs<a.intersectingPairs||
  b.minAltitudeMm>a.minAltitudeMm+tol||
  b.maxAspect<a.maxAspect-tol||
  newClear>baseClear+tol
const score=(m,clear)=>[m.illConditioned,m.intersectingPairs,
  m.nearClearancePairs,-clear,m.maxAspect,-m.minAltitudeMm]
const less=(a,b)=>{
  for(let i=0;i<a.length;i++){
    if(a[i]<b[i]-tol)return true
    if(a[i]>b[i]+tol)return false
  }
  return false
}

// Exposed as a pure safety decision so an independent test can verify that
// fewer warning pairs never overrides a worse exact minimum clearance.
export function classifyNativeCreaseRepairSafety20261024(
  baseline,candidate,baselineMinimumClearanceMm,candidateMinimumClearanceMm){
  if(![baselineMinimumClearanceMm,candidateMinimumClearanceMm].every(
    x=>Number.isFinite(x)&&x>=0)||
    ![baseline,candidate].every(m=>m&&[
      m.illConditioned,m.nearClearancePairs,m.intersectingPairs,
      m.minAltitudeMm,m.maxAspect].every(Number.isFinite)&&
      [m.illConditioned,m.nearClearancePairs,m.intersectingPairs].every(
        x=>Number.isInteger(x)&&x>=0)&&
      m.minAltitudeMm>0&&m.maxAspect>=1))
    throw new TypeError('Invalid crease repair safety metrics')
  const qualityNonregression=noRegression(baseline,candidate)
  const clearanceNonregression=
    candidateMinimumClearanceMm+tol>=baselineMinimumClearanceMm
  return {qualityNonregression,clearanceNonregression,
    nonregressing:qualityNonregression&&clearanceNonregression,
    improved:qualityNonregression&&clearanceNonregression&&
      better(baseline,candidate,baselineMinimumClearanceMm,
        candidateMinimumClearanceMm)}
}

export function searchNativeCreaseRepairPairedFlips20261024(reference,{
  maxFirst=12,maxSecond=12,maxWallMs=15000,
  witnessFaces=[97,104],clearanceM=.001,
}={}){
  if(!Number.isInteger(maxFirst)||maxFirst<1||maxFirst>24||
     !Number.isInteger(maxSecond)||maxSecond<1||maxSecond>24||
     !Number.isInteger(maxWallMs)||maxWallMs<1000||maxWallMs>60000||
     !Array.isArray(witnessFaces)||witnessFaces.length>8||
     witnessFaces.some(i=>!Number.isInteger(i)||i<0||
       i>=reference?.faces?.length))
    throw new RangeError('Invalid paired crease repair search budget')
  const started=performance.now()
  const initial=gate(reference,reference,{clearanceM})
  const baseline=initial.candidate
  const baselineMinimumClearanceMm=
    measureNativeCreaseDisjointMinimum20261024(reference,clearanceM)
  const frozen=JSON.stringify(reference),witness=new Set(witnessFaces)
  const firstFlips=flips(reference,witness).slice(0,maxFirst)
  const seen=new Set()
  let evaluated=0,rejected=0,duplicatesSkipped=0,qualityRegressions=0
  let clearanceRegressions=0,nonregressing=0,improved=0,best=null
  let timeBudgetExhausted=false
  search: for(const first of firstFlips){
    if(performance.now()-started>=maxWallMs){
      timeBudgetExhausted=true;break
    }
    const intermediate=apply(reference,first)
    // Intermediate must still preserve every immutable material constraint.
    try{gate(reference,intermediate,{clearanceM})}
    catch{rejected++;continue}
    const secondFlips=flips(intermediate,witness)
      .filter(f=>f.edge!==key(first.replacement[0][0],
        first.replacement[0][1])).slice(0,maxSecond)
    for(const second of secondFlips){
      if(performance.now()-started>=maxWallMs){
        timeBudgetExhausted=true;break search
      }
      const candidate=apply(intermediate,second)
      const signature=topologyKey(candidate.faces)
      if(seen.has(signature)){duplicatesSkipped++;continue}
      seen.add(signature)
      let metrics
      try{metrics=gate(reference,candidate,{clearanceM}).candidate}
      catch{rejected++;continue}
      evaluated++
      if(!noRegression(baseline,metrics)){
        qualityRegressions++
        continue
      }
      const minimumClearanceMm=
        measureNativeCreaseDisjointMinimum20261024(candidate,clearanceM)
      const safety=classifyNativeCreaseRepairSafety20261024(
        baseline,metrics,baselineMinimumClearanceMm,minimumClearanceMm)
      if(!safety.clearanceNonregression){
        clearanceRegressions++
        continue
      }
      nonregressing++
      if(!safety.improved)continue
      improved++
      const candidateScore=score(metrics,minimumClearanceMm)
      if(!best||less(candidateScore,best.score))
        best={edges:[first.edge,second.edge],metrics,
          minimumClearanceMm,score:candidateScore,faces:candidate.faces}
    }
  }
  if(JSON.stringify(reference)!==frozen)
    throw new Error('Paired crease repair search mutated reference')
  return {baseline,baselineMinimumClearanceMm,firstFlips:firstFlips.length,
    pairBudget:maxFirst*maxSecond,evaluated,rejected,duplicatesSkipped,
    uniqueFinalTopologies:seen.size,qualityRegressions,
    clearanceRegressions,nonregressing,improved,best:best&&{
      edges:best.edges,metrics:best.metrics,
      minimumClearanceMm:best.minimumClearanceMm,faces:best.faces,
      flatContactStillBlocked:best.metrics.nearClearancePairs>0||
        best.metrics.intersectingPairs>0,
      meshQualityStillBlocked:best.metrics.illConditioned>0},
    timeBudgetExhausted,sourceUnchanged:true,candidateApplied:false,
    physicalAcceptance:false,
    foldContactChecked:false,sweptCollisionCertified:false,
    safeToAutoApply:false}
}
