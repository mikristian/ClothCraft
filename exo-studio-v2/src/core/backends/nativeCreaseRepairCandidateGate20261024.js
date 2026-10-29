// Research-only, fail-closed gate for topology-only crease repair proposals.
// Generated material vertices are interpolation-locked to earlier vertices
// (including already generated crease vertices): moving one is NOT a
// material-preserving repair. No solver, UI,
// garment, or production approval is modified by this evaluator.
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const area2=(v,f)=>{
  const [a,b,c]=f.map(i=>v[i])
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
}
const near=(a,b,tol=1e-10)=>a.length===b.length&&a.every((x,i)=>
  Math.abs(x-b[i])<=tol)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
// A topology-only candidate may replace faces, but it must not smuggle a
// changed world pose, cached constraint graph, sewing metadata or hidden
// property through the rest-only validator. JSON equality misses nonenumerable
// fields and silently converts nonfinite numbers to null.
const samePlainData=(a,b)=>{
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')
    return Object.is(a,b)
  if(Array.isArray(a)!==Array.isArray(b))return false
  const keysA=Reflect.ownKeys(a).sort(),keysB=Reflect.ownKeys(b).sort()
  if(keysA.length!==keysB.length||keysA.some((key,i)=>key!==keysB[i]))
    return false
  return keysA.every(key=>{
    const left=Object.getOwnPropertyDescriptor(a,key)
    const right=Object.getOwnPropertyDescriptor(b,key)
    return left.enumerable===right.enumerable&&
      left.configurable===right.configurable&&
      left.writable===right.writable&&
      samePlainData(left.value,right.value)
  })
}

function audit(piece,limit){
  const v=piece.verticesM,f=piece.faces
  if(!Array.isArray(v)||v.length<4||v.length>512||
     !v.every(p=>finite3(p)&&Math.abs(p[2])<1e-9)||
     !Array.isArray(f)||f.length<2||f.length>limit)
    throw new Error('Invalid bounded crease repair mesh')
  const incidence=new Map(),owners=new Map()
  let area=0,illConditioned=0,minAltitudeMm=Infinity,maxAspect=0
  let orientation=0
  for(const face of f){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       !same(Reflect.ownKeys(face).sort(),['0','1','2','length'])||
       face.some(i=>!Number.isInteger(i)||i<0||i>=v.length))
      throw new Error('Invalid crease repair face')
    const signed=area2(v,face)
    if(!Number.isFinite(signed)||Math.abs(signed)<1e-14)
      throw new Error('Degenerate crease repair face')
    const sign=Math.sign(signed)
    if(orientation&&sign!==orientation)
      throw new Error('Inconsistent crease repair face winding')
    orientation=sign
    const lengths=[0,1,2].map(j=>{
      const a=v[face[j]],b=v[face[(j+1)%3]]
      return Math.hypot(a[0]-b[0],a[1]-b[1])
    })
    const longest=Math.max(...lengths),altitude=Math.abs(signed)/longest
    const aspect=longest/altitude
    if(!Number.isFinite(aspect))throw new Error('Nonfinite crease repair quality')
    area+=Math.abs(signed)/2
    illConditioned+=Number(altitude<.002||aspect>25)
    minAltitudeMm=Math.min(minAltitudeMm,altitude*1000)
    maxAspect=Math.max(maxAspect,aspect)
    const xs=face.map(i=>v[i][0])
    if(Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9)
      throw new Error('Crease repair triangle crosses constrained axis')
    for(let j=0;j<3;j++){
      const k=key(face[j],face[(j+1)%3])
      incidence.set(k,(incidence.get(k)||0)+1)
      if(!owners.has(k))owners.set(k,[])
      owners.get(k).push(face[(j+2)%3])
      if(incidence.get(k)>2)throw new Error('Nonmanifold crease repair mesh')
    }
  }
  const boundary=[...incidence].filter(([,n])=>n===1).map(([k])=>k).sort()
  const crease=new Set((piece.creaseEdges||[]).map(([a,b])=>key(a,b)))
  if(crease.size!==(piece.creaseEdges||[]).length||!crease.size||
     [...crease].some(k=>{
       const [a,b]=k.split(':').map(Number)
       const opposite=owners.get(k)||[]
       return incidence.get(k)!==2||Math.abs(v[a]?.[0])>1e-9||
         Math.abs(v[b]?.[0])>1e-9||opposite.length!==2||
         v[opposite[0]][0]*v[opposite[1]][0]>=-1e-14
     }))throw new Error('Missing or invalid constrained crease edges')
  return {area,illConditioned,minAltitudeMm,maxAspect,boundary,
    crease:[...crease].sort()}
}

export function inspectNativeCreaseRepairCandidate20261024(reference,candidate,{
  maxFaces=512,clearanceM=.001,
}={}){
  if(!Number.isInteger(maxFaces)||maxFaces<2||maxFaces>512||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01)
    throw new RangeError('Invalid crease repair evaluation budget')
  // Explicitly reject accessor-backed or non-plain data before reading it;
  // JSON cloning is not a safe substitute for input validation.
  const active=new WeakSet()
  let visited=0
  const plain=(x,depth=0)=>{
    if(x===null||typeof x==='string'||typeof x==='boolean')return true
    if(typeof x==='number')return Number.isFinite(x)
    if(typeof x!=='object'||depth>16||++visited>20000||active.has(x)||
       !(Array.isArray(x)||Object.getPrototypeOf(x)===Object.prototype))return false
    active.add(x)
    const valid=Reflect.ownKeys(x).every(k=>{
      if(typeof k!=='string')return false
      const desc=Object.getOwnPropertyDescriptor(x,k)
      return desc&&Object.hasOwn(desc,'value')&&plain(desc.value,depth+1)
    })
    active.delete(x)
    return valid
  }
  if(!plain(reference)||!plain(candidate))
    throw new TypeError('Crease repair requires plain data without accessors')
  const beforeJSON=JSON.stringify(reference),candidateJSON=JSON.stringify(candidate)
  if(!Number.isInteger(reference.originalVertexCount)||
     reference.originalVertexCount<3||
     reference.originalVertexCount>reference.verticesM?.length||
     reference.originalVertexCount!==candidate.originalVertexCount||
     !Array.isArray(reference.newVertexProvenance)||
     !same(reference.newVertexProvenance,candidate.newVertexProvenance)||
     !same(reference.originalParticleIndices,candidate.originalParticleIndices)||
     !same(reference.creaseEdges,candidate.creaseEdges)||
     !Array.isArray(candidate.verticesM)||
     candidate.verticesM.length!==reference.verticesM.length||
     candidate.faces?.length!==reference.faces?.length)
    throw new Error('Crease repair changed sewing ownership, provenance or topology budget')
  if(!Array.isArray(reference.originalParticleIndices)||
     reference.originalParticleIndices.length!==reference.originalVertexCount||
     new Set(reference.originalParticleIndices).size!==reference.originalVertexCount||
     reference.originalParticleIndices.some(i=>!Number.isInteger(i)||i<0))
    throw new Error('Invalid original sewing particle ownership')
  if(candidate.newVertexProvenance.some(entry=>
    !same(Reflect.ownKeys(entry).sort(),['edge','index','weights'])))
    throw new Error('Invalid candidate crease vertex provenance fields')
  const n=reference.originalVertexCount
  const provenance=new Set()
  for(const entry of reference.newVertexProvenance){
    if(!same(Reflect.ownKeys(entry).sort(),['edge','index','weights'])||
       !Number.isInteger(entry?.index)||entry.index<n||
       entry.index>=reference.verticesM.length||provenance.has(entry.index)||
       !Array.isArray(entry.edge)||entry.edge.length!==2||
       // A generated vertex may depend on an earlier generated vertex, but
       // never on itself or a future vertex. This also rejects cycles.
       entry.edge.some(i=>!Number.isInteger(i)||i<0||i>=entry.index)||
       !Array.isArray(entry.weights)||entry.weights.length!==2||
       entry.weights.some(w=>!Number.isFinite(w)||w<0||w>1)||
       Math.abs(entry.weights[0]+entry.weights[1]-1)>1e-9)
      throw new Error('Invalid crease repair vertex provenance')
    provenance.add(entry.index)
    const expected=[0,1,2].map(j=>entry.edge.reduce((sum,id,k)=>
      sum+reference.verticesM[id][j]*entry.weights[k],0))
    if(!near(reference.verticesM[entry.index],expected)||
       !near(candidate.verticesM[entry.index],expected))
      throw new Error('Generated crease vertex violates parent-edge interpolation')
  }
  // Do not permit a missing generated vertex to escape the interpolation
  // audit, even if a later entry happens to reference that missing vertex.
  if(provenance.size!==reference.verticesM.length-n||
     Array.from({length:reference.verticesM.length-n},(_,i)=>n+i)
       .some(index=>!provenance.has(index))||
     reference.verticesM.some((v,i)=>!finite3(v)||
       !near(v,candidate.verticesM[i])))
    throw new Error('Crease repair changed original or generated material coordinates')
  // Preserve historical, specific provenance/geometry diagnostics above;
  // then enforce the stronger invariant across every other field, including
  // nested nonenumerable world pose and cached constraint metadata.
  const referenceKeys=Reflect.ownKeys(reference).sort()
  const candidateKeys=Reflect.ownKeys(candidate).sort()
  const referenceFaces=Object.getOwnPropertyDescriptor(reference,'faces')
  const candidateFaces=Object.getOwnPropertyDescriptor(candidate,'faces')
  if(!samePlainData(referenceKeys,candidateKeys)||
     referenceKeys.some(key=>key!=='faces'&&
       !samePlainData(reference[key],candidate[key]))||
     !referenceFaces||!candidateFaces||
     referenceFaces.enumerable!==candidateFaces.enumerable||
     referenceFaces.configurable!==candidateFaces.configurable||
     referenceFaces.writable!==candidateFaces.writable)
    throw new Error('Crease repair changed non-topology metadata or world pose')
  const original=audit(reference,maxFaces)
  const proposed=audit(candidate,maxFaces)
  if(original.crease.length!==proposed.crease.length||
     !same(original.boundary,proposed.boundary)||
     !same(original.crease,proposed.crease)||
     Math.abs(original.area-proposed.area)>Math.max(1e-11,original.area*1e-8))
    throw new Error('Crease repair changed material boundary, area or hinge')
  // Re-evaluate clearance with the requested threshold (audit's default
  // contact is retained only as a fixed 1 mm baseline for comparisons).
  const screen=piece=>inspectNativeIntrapanelStaticContact({
    pieces:[{id:piece.panelId||'research-sleeve',
      particleIndices:piece.verticesM.map((_,i)=>i),faces:piece.faces}],
    particles:piece.verticesM.map(position=>({position}))},
  {clearanceM,maxPairs:maxFaces*(maxFaces-1)/2})
  const baselineContact=screen(reference),candidateContact=screen(candidate)
  const improved=proposed.illConditioned<original.illConditioned
  const staticClear=candidateContact.staticDisjointThicknessScreenClear
  if(JSON.stringify(reference)!==beforeJSON||JSON.stringify(candidate)!==candidateJSON)
    throw new Error('Crease repair evaluator mutated source')
  return {baseline:{illConditioned:original.illConditioned,
    minAltitudeMm:original.minAltitudeMm,maxAspect:original.maxAspect,
    nearClearancePairs:baselineContact.nonadjacentNearClearancePairs,
    intersectingPairs:baselineContact.intersectingTrianglePairs},
  candidate:{illConditioned:proposed.illConditioned,
    minAltitudeMm:proposed.minAltitudeMm,maxAspect:proposed.maxAspect,
    nearClearancePairs:candidateContact.nonadjacentNearClearancePairs,
    intersectingPairs:candidateContact.intersectingTrianglePairs},
  improvedRestConditioning:improved,staticContactClear:staticClear,
  researchGeometryScreenPassed:proposed.illConditioned===0&&staticClear,
  flatStaticOnly:true,foldContactChecked:false,restGeometryCandidateOnly:true,
  materialCoordinatesLocked:true,originalSewingEndpointsPreserved:true,
  boundaryAndCreasePreserved:true,sourceUnchanged:true,
  candidateApplied:false,structuralConstraintsInstalled:false,
  physicalAcceptance:false,clothThicknessCertified:false,
  sweptCollisionCertified:false,avatarContactChecked:false,safeToAutoApply:false}
}
