// Research-only, bounded clearance-aware material edge-flip proposal.
// World positions and 2D material coordinates are NEVER changed. A changed
// triangulation is not a solver-ready garment: structural/bend constraints
// would have to be regenerated and independently checked before use.
// Static self-contact only; no cloth thickness or swept CCD certification.
import {auditSingleMaterialEdgeFlip} from './materialRetriangulationResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../backends/nativeIntrapanelContactResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const signedArea=(vertices,face)=>{
  const [a,b,c]=face.map(i=>vertices[i])
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
}
const orientLike=(vertices,original,face)=>
  Math.sign(signedArea(vertices,original))===Math.sign(signedArea(vertices,face))?
    face:[face[0],face[2],face[1]]
const defectCount=a=>a.intersectingTrianglePairs+
  a.edgeNeighborNearFoldoverPairs+a.nonadjacentNearClearancePairs

export function searchNativeClearanceAwareMaterialFlips(mesh,worldPositionsM,{
  protectedEdges=[],targetFaces=null,clearanceM=.001,maxCandidates=16,
  maxPairs=500_000,
}={}){
  if(!Array.isArray(mesh?.vertices)||!Array.isArray(mesh?.faces)||
     !Array.isArray(worldPositionsM)||mesh.vertices.length!==worldPositionsM.length||
     mesh.vertices.length<4||mesh.faces.length<2||mesh.faces.length>1024||
     !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>64||
     !Number.isInteger(maxPairs)||maxPairs<1||maxPairs>500_000||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.1||
     !Array.isArray(protectedEdges))
    throw new RangeError('Invalid bounded clearance-flip search')
  const vertices=mesh.vertices.map(p=>Array.isArray(p)?p.slice():null)
  if(vertices.some(p=>!p||p.length!==2||!p.every(Number.isFinite))||
     worldPositionsM.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))
    throw new RangeError('Invalid clearance-flip material/world coordinates')
  const faces=mesh.faces.map(f=>Array.isArray(f)?f.slice():null)
  const contact=fs=>inspectNativeIntrapanelStaticContact({
    particles:worldPositionsM.map(position=>({position})),
    pieces:[{id:'research-panel',particleIndices:worldPositionsM.map((_,i)=>i),faces:fs}],
  },{clearanceM,maxPairs})
  const before=contact(faces) // fail closed on malformed or nonmanifold geometry
  const targets=targetFaces===null?
    [...new Set(before.nearClearanceExamples.flatMap(x=>[x.faceA,x.faceB]))]:targetFaces
  if(!Array.isArray(targets)||targets.length>32||targets.some(i=>
    !Number.isInteger(i)||i<0||i>=faces.length))
    throw new RangeError('Invalid clearance-flip target faces')
  const targetSet=new Set(targets)
  const owners=new Map()
  faces.forEach((face,index)=>{
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
      const id=key(a,b)
      if(!owners.has(id))owners.set(id,[])
      owners.get(id).push(index)
    }
  })
  const protectedKeys=new Set(protectedEdges.map(pair=>{
    if(!Array.isArray(pair)||pair.length!==2||pair.some(i=>
      !Number.isInteger(i)||i<0||i>=vertices.length)||
      !owners.has(key(...pair)))throw new RangeError('Invalid protected clearance-flip edge')
    return key(...pair)
  }))
  let scanned=0,certified=0,contactChecked=0,best=null,budgetExhausted=false
  for(const [id,pair] of owners){
    if(pair.length!==2||protectedKeys.has(id)||
       !pair.some(i=>targetSet.has(i)))continue
    if(scanned>=maxCandidates){budgetExhausted=true;break}
    scanned++
    const [f,g]=pair
    const shared=faces[f].filter(i=>faces[g].includes(i))
    if(shared.length!==2)continue
    const [a,b]=shared,c=faces[f].find(i=>!shared.includes(i)),
      d=faces[g].find(i=>!shared.includes(i))
    if(new Set([a,b,c,d]).size!==4)continue
    const candidateFaces=faces.map(face=>face.slice())
    candidateFaces[f]=orientLike(vertices,faces[f],[c,d,a])
    candidateFaces[g]=orientLike(vertices,faces[g],[c,d,b])
    let certificate
    try{
      certificate=auditSingleMaterialEdgeFlip({vertices,faces},
        {vertices,faces:candidateFaces},{protectedEdges})
    }catch{continue} // reject nonconvex/invalid/coverage-changing proposals
    if(!certificate.approved)continue
    certified++
    let after
    try{after=contact(candidateFaces)}catch{continue}
    contactChecked++
    // A local flip may improve one witness while introducing a worse fold or
    // a new intersection elsewhere. Require all three global defect counts
    // to be nonincreasing, and at least one strict reduction.
    const metrics=['intersectingTrianglePairs','edgeNeighborNearFoldoverPairs',
      'nonadjacentNearClearancePairs']
    if(metrics.some(k=>after[k]>before[k])||defectCount(after)>=defectCount(before))
      continue
    if(!best||defectCount(after)<defectCount(best.after))
      best={mesh:{vertices:vertices.map(p=>p.slice()),faces:candidateFaces},
        certificate,after}
  }
  return {before:{intersections:before.intersectingTrianglePairs,
      nearFoldovers:before.edgeNeighborNearFoldoverPairs,
      nearClearancePairs:before.nonadjacentNearClearancePairs,
      minimumNearClearanceMm:before.minimumNearClearanceMm},
    after:best?{intersections:best.after.intersectingTrianglePairs,
      nearFoldovers:best.after.edgeNeighborNearFoldoverPairs,
      nearClearancePairs:best.after.nonadjacentNearClearancePairs,
      minimumNearClearanceMm:best.after.minimumNearClearanceMm}:null,
    best:best?{mesh:best.mesh,certificate:best.certificate}:null,
    scanned,certified,contactChecked,budgetExhausted,
    originalWorldPositionsUnchanged:true,materialCoordinatesUnchanged:true,
    constraintsRegenerated:false,safeToAutoApply:false,
    fitCertified:false,sweptCollisionCertified:false}
}
