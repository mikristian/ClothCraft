// Research-only, independent certificate for ONE interior edge flip.
// Unlike vertex smoothing, a valid flip leaves every 2D material coordinate
// unchanged. It does not certify strain, sewing, contact or avatar entry.
const point=p=>Array.isArray(p)?p:[p?.x,p?.y]
const edge=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const triangleKey=face=>[...face].sort((a,b)=>a-b).join(':')
const area=(vertices,face)=>{
  const [a,b,c]=face.map(i=>point(vertices[i]))
  return ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
}
const edgeCounts=faces=>{
  const counts=new Map()
  for(const [a,b,c] of faces)for(const [i,j] of [[a,b],[b,c],[c,a]]){
    const id=edge(i,j);counts.set(id,(counts.get(id)||0)+1)
  }
  return counts
}
const boundary=counts=>[...counts].filter(([,n])=>n===1).map(([id])=>id).sort()
const quality=(vertices,face)=>{
  const [a,b,c]=face.map(i=>point(vertices[i]))
  const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
    Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
  const altitude=longest?2*Math.abs(area(vertices,face))/longest:0
  return {altitude,aspect:altitude?longest/altitude:Infinity,
    poor:altitude<.2||longest/altitude>25} // input is centimeters
}

export function auditSingleMaterialEdgeFlip(reference,candidate,{protectedEdges=[]}={}){
  const a=reference?.vertices,b=candidate?.vertices
  const old=reference?.faces,next=candidate?.faces
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||
    !Array.isArray(old)||!Array.isArray(next)||old.length!==next.length||
    !Array.isArray(protectedEdges))throw new TypeError('Invalid edge-flip audit inputs')
  for(let i=0;i<a.length;i++){
    const p=point(a[i]),q=point(b[i])
    if(p?.length<2||q?.length<2||!p.slice(0,2).every(Number.isFinite)||
      !q.slice(0,2).every(Number.isFinite)||p[0]!==q[0]||p[1]!==q[1])
      throw new RangeError('Material coordinates changed during edge flip')
  }
  for(const face of [...old,...next])if(!Array.isArray(face)||face.length!==3||
    new Set(face).size!==3||face.some(i=>!Number.isInteger(i)||i<0||i>=a.length))
    throw new RangeError('Invalid edge-flip triangle')
  const changed=[]
  for(let i=0;i<old.length;i++)if(triangleKey(old[i])!==triangleKey(next[i]))changed.push(i)
  if(changed.length!==2)throw new RangeError('Only one interior edge flip may be certified')
  const [f,g]=changed
  const shared=old[f].filter(i=>old[g].includes(i))
  if(shared.length!==2)throw new RangeError('Changed faces do not share an interior edge')
  const [i,j]=shared,c=old[f].find(k=>!shared.includes(k)),d=old[g].find(k=>!shared.includes(k))
  if(c===d||new Set([i,j,c,d]).size!==4)
    throw new RangeError('Edge flip lacks four distinct corners')
  const expected=[triangleKey([c,d,i]),triangleKey([c,d,j])].sort()
  if(JSON.stringify([triangleKey(next[f]),triangleKey(next[g])].sort())!==JSON.stringify(expected))
    throw new RangeError('Candidate is not the corresponding diagonal replacement')
  const oldCounts=edgeCounts(old),newCounts=edgeCounts(next)
  if([...oldCounts.values(),...newCounts.values()].some(n=>n>2)||
    oldCounts.get(edge(i,j))!==2||newCounts.has(edge(i,j))||
    newCounts.get(edge(c,d))!==2||
    JSON.stringify(boundary(oldCounts))!==JSON.stringify(boundary(newCounts)))
    throw new RangeError('Edge flip changes the material boundary or manifoldness')
  for(const pair of protectedEdges){
    if(!Array.isArray(pair)||pair.length!==2||pair.some(k=>
      !Number.isInteger(k)||k<0||k>=a.length)||!oldCounts.has(edge(...pair)))
      throw new RangeError('Invalid protected material edge')
    if(!newCounts.has(edge(...pair)))throw new RangeError('Protected material edge removed')
  }
  const oldAreas=[area(a,old[f]),area(a,old[g])]
  const newAreas=[area(a,next[f]),area(a,next[g])]
  const sign=Math.sign(oldAreas[0])
  if(!sign||oldAreas.some(n=>Math.sign(n)!==sign)||
    newAreas.some(n=>Math.sign(n)!==sign)||
    Math.abs(oldAreas.reduce((s,n)=>s+n,0)-newAreas.reduce((s,n)=>s+n,0))>1e-9)
    throw new RangeError('Edge flip changes material coverage or orientation')
  const before=[quality(a,old[f]),quality(a,old[g])]
  const after=[quality(a,next[f]),quality(a,next[g])]
  const poorBefore=before.filter(q=>q.poor).length
  const poorAfter=after.filter(q=>q.poor).length
  return {approved:poorAfter<=poorBefore,geometryPreserved:true,
    replacedEdge:[i,j],replacementEdge:[c,d],changedFaces:changed,
    poorBefore,poorAfter,minimumAltitudeBeforeCm:Math.min(...before.map(q=>q.altitude)),
    minimumAltitudeAfterCm:Math.min(...after.map(q=>q.altitude)),
    originalVerticesUnchanged:true,materialBoundaryUnchanged:true,
    fitCertified:false,continuousCollisionDetectionVerified:false}
}

// Research-only bounded greedy search. Every accepted step is independently
// certified against its immediate predecessor, not merely the initial mesh.
// A flip must strictly remove a poor face and cannot lower the minimum local
// altitude. This intentionally cannot repair boundary slivers by moving the
// original material coordinates; that would require a different certificate.
export function searchCertifiedPoorFaceFlips(mesh,{
  protectedEdges=[],maxFlips=4,maxCandidates=2400
}={}){
  if(!Array.isArray(mesh?.vertices)||!Array.isArray(mesh?.faces)||
    !Number.isInteger(maxFlips)||maxFlips<0||maxFlips>16||
    !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>10000||
    !Array.isArray(protectedEdges))throw new RangeError('Invalid bounded retriangulation search')
  const vertices=mesh.vertices.map(p=>[...point(p)])
  if(vertices.some(p=>p.length!==2||!p.every(Number.isFinite)))
    throw new RangeError('Invalid material vertex')
  const faces=mesh.faces.map(f=>[...f])
  if(faces.some(f=>f.length!==3||new Set(f).size!==3||
    f.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length)||
    !Number.isFinite(area(vertices,f))||Math.abs(area(vertices,f))<1e-12))
    throw new RangeError('Invalid source triangle')
  const originalCounts=edgeCounts(faces)
  if([...originalCounts.values()].some(n=>n>2))
    throw new RangeError('Nonmanifold source mesh')
  const protectedKeys=new Set(protectedEdges.map(pair=>{
    if(!Array.isArray(pair)||pair.length!==2||
      pair.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length)||
      !originalCounts.has(edge(...pair)))throw new RangeError('Invalid protected material edge')
    return edge(...pair)
  }))
  const poorCount=fs=>fs.filter(f=>quality(vertices,f).poor).length
  const initialPoor=poorCount(faces)
  const accepted=[]
  let scanned=0,certifiedCandidates=0
  for(let pass=0;pass<maxFlips&&scanned<maxCandidates;pass++){
    const adjacency=new Map()
    faces.forEach((f,index)=>{
      for(let k=0;k<3;k++){
        const a=f[k],b=f[(k+1)%3],opposite=f[(k+2)%3],id=edge(a,b)
        if(!adjacency.has(id))adjacency.set(id,[])
        adjacency.get(id).push({index,a,b,opposite})
      }
    })
    let best=null
    for(const [id,pair] of adjacency){
      if(scanned>=maxCandidates)break
      if(pair.length!==2||protectedKeys.has(id))continue
      scanned++
      const [left,right]=pair
      const [a,b,c,d]=[left.a,left.b,left.opposite,right.opposite]
      if(new Set([a,b,c,d]).size!==4)continue
      const oldQ=[quality(vertices,faces[left.index]),quality(vertices,faces[right.index])]
      const oldPoor=oldQ.filter(q=>q.poor).length
      if(!oldPoor)continue
      const orient=(face,old)=>Math.sign(area(vertices,face))===Math.sign(area(vertices,old))?
        face:[face[0],face[2],face[1]]
      const nextA=orient([c,d,a],faces[left.index])
      const nextB=orient([d,c,b],faces[right.index])
      const nextQ=[quality(vertices,nextA),quality(vertices,nextB)]
      const reduction=oldPoor-nextQ.filter(q=>q.poor).length
      const gain=Math.min(...nextQ.map(q=>q.altitude))-
        Math.min(...oldQ.map(q=>q.altitude))
      if(reduction<=0||gain< -1e-9)continue
      const candidate={vertices,faces:faces.map(f=>[...f])}
      candidate.faces[left.index]=nextA
      candidate.faces[right.index]=nextB
      try{
        const certificate=auditSingleMaterialEdgeFlip({vertices,faces},candidate,{protectedEdges})
        if(!certificate.approved)continue
        certifiedCandidates++
        if(!best||reduction>best.reduction||
          reduction===best.reduction&&gain>best.gain){
          best={candidate,certificate,reduction,gain}
        }
      }catch{/* Invalid convexity/coverage/orientation: fail closed. */}
    }
    if(!best)break
    faces.splice(0,faces.length,...best.candidate.faces)
    accepted.push({...best.certificate,poorReduction:best.reduction})
  }
  const finalPoor=poorCount(faces)
  if(finalPoor!==initialPoor-accepted.reduce((s,c)=>s+c.poorReduction,0))
    throw new Error('Inconsistent retriangulation poor-face accounting')
  return {mesh:{vertices,faces},initialPoor,finalPoor,
    remainingPoorFaces:faces.flatMap((f,i)=>quality(vertices,f).poor?[i]:[]),
    accepted,scanned,certifiedCandidates,budgetExhausted:scanned>=maxCandidates,
    materialCoordinatesUnchanged:true,fitCertified:false,
    continuousCollisionDetectionVerified:false}
}
