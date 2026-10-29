// Detached, bounded crease-preserving material edge flips. This is a topology
// research preview, NOT a regenerated cloth solver or certified collision path.
import {auditSingleMaterialEdgeFlip} from '../physics/materialRetriangulationResearch.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {researchFoundationTeeSleeveCreaseMesh20261025} from './nativeSleeveCreaseConformingMeshResearch20261025.js'

const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const area2=(v,[a,b,c])=>(v[b][0]-v[a][0])*(v[c][1]-v[a][1])-
  (v[b][1]-v[a][1])*(v[c][0]-v[a][0])
const twiceWorldArea=(v,[a,b,c])=>{
  const u=v[b].map((x,k)=>x-v[a][k]),w=v[c].map((x,k)=>x-v[a][k])
  return Math.hypot(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],
    u[0]*w[1]-u[1]*w[0])
}
const quality=(v,f)=>{
  const [a,b,c]=f.map(i=>v[i])
  const longest=Math.max(...[[a,b],[b,c],[c,a]].map(([x,y])=>
    Math.hypot(x[0]-y[0],x[1]-y[1])))
  const altitude=Math.abs(area2(v,f))/longest,aspect=longest/altitude
  return {altitude,aspect,poor:altitude<.002||aspect>25}
}
const summary=(v,faces)=>{
  let poor=0,maximumAspect=0,minimumAltitudeM=Infinity
  for(const f of faces){
    const q=quality(v,f)
    poor+=Number(q.poor)
    maximumAspect=Math.max(maximumAspect,q.aspect)
    minimumAltitudeM=Math.min(minimumAltitudeM,q.altitude)
  }
  return {illConditionedFaces:poor,maximumAspect,minimumAltitudeM}
}
const contactFields=['intersectingTrianglePairs','edgeNeighborNearFoldoverPairs',
  'nonadjacentNearClearancePairs']
const contactSummary=c=>Object.fromEntries(contactFields.map(k=>[k,c[k]]))
const materialOverlapArea=(v,a,b)=>{
  let polygon=a.map(i=>v[i].slice(0,2))
  const clip=b.map(i=>v[i]),orientation=Math.sign(area2(v,b))
  for(let k=0;k<3;k++){
    const x=clip[k],y=clip[(k+1)%3],old=polygon
    polygon=[]
    const side=p=>orientation*((y[0]-x[0])*(p[1]-x[1])-
      (y[1]-x[1])*(p[0]-x[0]))
    for(let j=0;j<old.length;j++){
      const p=old[j],q=old[(j+1)%old.length],dp=side(p),dq=side(q)
      if((dp>=0)!==(dq>=0)){
        const t=dp/(dp-dq)
        polygon.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])
      }
      if(dq>=0)polygon.push(q)
    }
    if(!polygon.length)return 0
  }
  let twice=0
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length]
    twice+=a[0]*b[1]-a[1]*b[0]
  }
  return Math.abs(twice)/2
}

export function optimizeCreaseSplitQualityContactResearch20261025(preview,{
  maxFlips=16,maxCandidates=4000,maxContactChecks=64,clearanceM=.001,
}={}){
  if(!Number.isInteger(maxFlips)||maxFlips<0||maxFlips>16||
     !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>6000||
     !Number.isInteger(maxContactChecks)||maxContactChecks<1||maxContactChecks>128||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01)
    throw new RangeError('Invalid crease quality/contact budgets')
  const rest=preview?.flatVerticesM,world=preview?.worldVerticesM
  const originalFaces=preview?.faces,origin=preview?.creaseOriginM,
    direction=preview?.creaseDirection,provenance=preview?.vertexProvenance,
    sourceIndices=preview?.sourceFaceIndices
  if(!Array.isArray(rest)||rest.length<4||rest.length>512||
     !Array.isArray(world)||world.length!==rest.length||
     ![...rest,...world].every(p=>Array.isArray(p)&&p.length===3&&
       p.every(x=>Number.isFinite(x)&&Math.abs(x)<=100))||
     !Array.isArray(originalFaces)||originalFaces.length<2||originalFaces.length>256||
     !Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||
     !Array.isArray(direction)||direction.length!==2||
     !direction.every(Number.isFinite)||Math.abs(Math.hypot(...direction)-1)>1e-8||
     !Array.isArray(provenance)||provenance.length!==rest.length||
     !Number.isInteger(preview.originalVertexCount)||
     preview.originalVertexCount<3||preview.originalVertexCount>rest.length||
     !Number.isInteger(preview.originalFaceCount)||
     preview.originalFaceCount<1||preview.originalFaceCount>2048||
     !Array.isArray(sourceIndices)||sourceIndices.length!==originalFaces.length||
     sourceIndices.some(i=>!Number.isInteger(i)||i<0||i>=preview.originalFaceCount))
    throw new Error('Invalid crease quality/contact preview')
  for(let i=0;i<provenance.length;i++){
    const p=provenance[i]
    if(i<preview.originalVertexCount){
      if(p?.kind!=='original'||p.originalVertex!==i)
        throw new Error('Invalid original crease vertex provenance')
    }else{
      if(p?.kind!=='edge-intersection'||!Array.isArray(p.edge)||p.edge.length!==2||
         p.edge.some(j=>!Number.isInteger(j)||j<0||j>=preview.originalVertexCount)||
         p.edge[0]===p.edge[1]||!Array.isArray(p.weights)||p.weights.length!==2||
         p.weights.some(w=>!Number.isFinite(w)||w<=0||w>=1)||
         Math.abs(p.weights[0]+p.weights[1]-1)>1e-9)
        throw new Error('Invalid cut-vertex provenance')
      for(const coords of [rest,world])for(let k=0;k<3;k++){
        const expected=p.edge.reduce((s,j,t)=>s+p.weights[t]*coords[j][k],0)
        if(Math.abs(expected-coords[i][k])>1e-9)
          throw new Error('Cut-vertex provenance does not reconstruct position')
      }
    }
  }
  const faces=originalFaces.map(f=>{
    if(!Array.isArray(f)||f.length!==3||new Set(f).size!==3||
       f.some(i=>!Number.isInteger(i)||i<0||i>=rest.length)||
       Math.abs(area2(rest,f))<1e-14||twiceWorldArea(world,f)<1e-14)
      throw new Error('Invalid crease quality/contact face')
    return [...f]
  })
  const signed=p=>direction[0]*(p[1]-origin[1])-direction[1]*(p[0]-origin[0])
  const signs=rest.map(signed)
  const crosses=f=>f.some(i=>signs[i]>1e-8)&&f.some(i=>signs[i]<-1e-8)
  if(faces.some(crosses))throw new Error('Crease preview contains crossing faces')
  const adjacency=fs=>{
    const edges=new Map()
    fs.forEach((f,index)=>f.forEach((a,k)=>{
      const b=f[(k+1)%3],key=edgeKey(a,b)
      if(!edges.has(key))edges.set(key,[])
      edges.get(key).push({index,a,b,opposite:f[(k+2)%3]})
    }))
    if([...edges.values()].some(pair=>pair.length>2||
       pair.length===2&&pair[0].a===pair[1].a))
      throw new Error('Nonmanifold or inconsistent crease mesh winding')
    return edges
  }
  const initialEdges=adjacency(faces)
  const faceKeys=new Set()
  for(const f of faces){
    const key=[...f].sort((a,b)=>a-b).join(':')
    if(faceKeys.has(key))throw new Error('Duplicate overlapping crease face')
    faceKeys.add(key)
  }
  // The split producer rejects source T-junctions. Repeat that independent
  // preflight here so direct callers cannot smuggle an invalid detached mesh.
  for(const pair of initialEdges.values()){
    const {a,b}=pair[0],dx=rest[b][0]-rest[a][0],dy=rest[b][1]-rest[a][1]
    const length2=dx*dx+dy*dy
    if(length2<1e-16)throw new Error('Degenerate crease material edge')
    for(let i=0;i<rest.length;i++){
      if(i===a||i===b)continue
      const t=((rest[i][0]-rest[a][0])*dx+(rest[i][1]-rest[a][1])*dy)/length2
      if(t>1e-9&&t<1-1e-9&&
         Math.hypot(rest[i][0]-rest[a][0]-t*dx,
           rest[i][1]-rest[a][1]-t*dy)<=1e-10)
        throw new Error('Source crease preview contains a T-junction')
    }
  }
  if(new Set(faces.flat()).size!==rest.length)
    throw new Error('Orphan vertex in crease material topology')
  // Overlapping rest triangles invalidate any topology/quality certificate,
  // even if the world-space contact screen happens to be clear.
  const boxes=faces.map(f=>({min:[0,1].map(k=>Math.min(...f.map(i=>rest[i][k]))),
    max:[0,1].map(k=>Math.max(...f.map(i=>rest[i][k])))}))
  for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
    if([0,1].some(k=>boxes[i].max[k]<=boxes[j].min[k]||
       boxes[j].max[k]<=boxes[i].min[k]))continue
    if(materialOverlapArea(rest,faces[i],faces[j])>1e-12)
      throw new Error('Overlapping crease material triangles')
  }
  const protectedEdges=[...initialEdges.values()].filter(pair=>{
    const {a,b}=pair[0]
    return Math.abs(signs[a])<=1e-8&&Math.abs(signs[b])<=1e-8
  }).map(pair=>[pair[0].a,pair[0].b])
  const protectedKeys=new Set(protectedEdges.map(([a,b])=>edgeKey(a,b)))
  const boundaryKeys=()=>[...adjacency(faces)].filter(([,pair])=>pair.length===1)
    .map(([key])=>key).sort()
  const originalBoundary=boundaryKeys()
  const contact=fs=>inspectNativeIntrapanelStaticContact({
    particles:world.map(position=>({position})),
    pieces:[{id:'detached-crease-preview',particleIndices:world.map((_,i)=>i),faces:fs}],
  },{clearanceM,maxPairs:600_000})
  const beforeContact=contact(faces)
  let currentContact=beforeContact
  const beforeQuality=summary(rest,faces),lineage=sourceIndices.map(i=>[i])
  const accepted=[]
  let scanned=0,certified=0,contactChecked=0
  const materialCm=rest.map(([x,y])=>[x*100,y*100])
  for(let pass=0;pass<maxFlips&&scanned<maxCandidates&&
      contactChecked<maxContactChecks;pass++){
    const proposals=[]
    for(const [key,pair] of adjacency(faces)){
      if(pair.length!==2||protectedKeys.has(key))continue
      if(scanned>=maxCandidates)break
      scanned++
      const [left,right]=pair,{a,b,opposite:c}=left,d=right.opposite
      if(new Set([a,b,c,d]).size!==4)continue
      const old=[faces[left.index],faces[right.index]]
      const orient=(f,reference)=>Math.sign(area2(rest,f))===
        Math.sign(area2(rest,reference))?f:[f[0],f[2],f[1]]
      const next=[orient([c,d,a],old[0]),orient([d,c,b],old[1])]
      if(next.some(f=>crosses(f)||Math.abs(area2(rest,f))<1e-14||
         twiceWorldArea(world,f)<1e-14))continue
      // A new diagonal passing through an unrelated vertex creates a hidden
      // T-junction even when the edge-flip area certificate passes.
      const dx=rest[d][0]-rest[c][0],dy=rest[d][1]-rest[c][1],length2=dx*dx+dy*dy
      if(length2<1e-16||rest.some((p,i)=>{
        if(i===c||i===d)return false
        const t=((p[0]-rest[c][0])*dx+(p[1]-rest[c][1])*dy)/length2
        return t>1e-9&&t<1-1e-9&&
          Math.hypot(p[0]-rest[c][0]-t*dx,p[1]-rest[c][1]-t*dy)<=1e-10
      }))continue
      const oldQ=old.map(f=>quality(rest,f)),newQ=next.map(f=>quality(rest,f))
      const reduction=oldQ.filter(q=>q.poor).length-newQ.filter(q=>q.poor).length
      const altitudeGain=Math.min(...newQ.map(q=>q.altitude))-
        Math.min(...oldQ.map(q=>q.altitude))
      if(reduction<=0||altitudeGain< -1e-12||
         newQ.some(q=>q.aspect>beforeQuality.maximumAspect+1e-8))continue
      const candidate=faces.map(f=>[...f])
      candidate[left.index]=next[0];candidate[right.index]=next[1]
      let certificate
      try{
        certificate=auditSingleMaterialEdgeFlip({vertices:materialCm,faces},
          {vertices:materialCm,faces:candidate},{protectedEdges})
      }catch{continue}
      if(!certificate.approved)continue
      certified++
      proposals.push({candidate,changed:[left.index,right.index],reduction,
        altitudeGain,certificate})
    }
    proposals.sort((a,b)=>b.reduction-a.reduction||
      b.altitudeGain-a.altitudeGain||a.changed[0]-b.changed[0])
    let chosen=null
    for(const proposal of proposals){
      if(contactChecked>=maxContactChecks)break
      contactChecked++
      let nextContact
      try{nextContact=contact(proposal.candidate)}catch{continue}
      if(contactFields.some(k=>nextContact[k]>currentContact[k]))continue
      chosen={...proposal,nextContact};break
    }
    if(!chosen)break
    faces.splice(0,faces.length,...chosen.candidate)
    currentContact=chosen.nextContact
    const [a,b]=chosen.changed
    const ancestry=[...new Set([...lineage[a],...lineage[b]])].sort((x,y)=>x-y)
    lineage[a]=[...ancestry];lineage[b]=[...ancestry]
    accepted.push({changedFaces:chosen.changed,poorReduction:chosen.reduction,
      replacedEdge:chosen.certificate.replacedEdge,
      replacementEdge:chosen.certificate.replacementEdge})
  }
  const afterQuality=summary(rest,faces)
  if(JSON.stringify(boundaryKeys())!==JSON.stringify(originalBoundary)||
     [...protectedKeys].some(k=>!adjacency(faces).has(k))||
     afterQuality.illConditionedFaces!==beforeQuality.illConditionedFaces-
       accepted.reduce((sum,x)=>sum+x.poorReduction,0)||
     afterQuality.maximumAspect>beforeQuality.maximumAspect+1e-8||
     afterQuality.minimumAltitudeM<beforeQuality.minimumAltitudeM-1e-12||
     contactFields.some(k=>currentContact[k]>beforeContact[k])||faces.some(crosses))
    throw new Error('Crease quality/contact invariant failed')
  return {flatVerticesM:rest.map(p=>[...p]),worldVerticesM:world.map(p=>[...p]),
    faces,vertexProvenance:provenance.map(p=>structuredClone(p)),
    faceSourceLineage:lineage,originalVertexCount:preview.originalVertexCount,
    protectedCreaseEdges:protectedEdges,originalBoundaryEdges:originalBoundary,
    beforeQuality,afterQuality,beforeContact:contactSummary(beforeContact),
    afterContact:contactSummary(currentContact),accepted,scanned,certified,
    contactChecked,budgetExhausted:scanned>=maxCandidates||
      contactChecked>=maxContactChecks,
    materialCoordinatesUnchanged:true,originalSewingVerticesUnchanged:true,
    solverConstraintsRebuilt:false,principalStrainCertified:false,
    staticContactValid:contactFields.every(k=>currentContact[k]===0),
    continuousContactCertified:false,physicalAcceptance:false,safeToAutoApply:false}
}

export function researchFoundationTeeSleeveQualityContact20261025(payload,panelId,options){
  const preview=researchFoundationTeeSleeveCreaseMesh20261025(payload,panelId)
  return {panelId,...optimizeCreaseSplitQualityContactResearch20261025(preview,options)}
}
