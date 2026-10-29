// Research-only topology inventory for a detached crease-conforming sleeve.
// These are NOT calibrated XPBD constraints: no stiffness, masses, contact
// exclusions, timestep stability or swept collision certification is supplied.
import {researchFoundationTeeSleeveQualityContact20261025} from './nativeSleeveCreaseQualityContactResearch20261025.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeUnderarmCenterCrease} from './nativeUnderarmCenterCreaseResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const subtract=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)
const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)

export function auditDetachedSleeveConstraintInventoryResearch20261025(payload,panelId,mesh){
  const piece=payload?.pieces?.find(p=>p.id===panelId)
  if(!['sleeve-left','sleeve-right'].includes(panelId)||!piece||
     !Array.isArray(payload?.particles)||!Array.isArray(payload?.constraints)||
     !Array.isArray(piece.particleIndices)||!Array.isArray(piece.flatVerticesM)||
     !Array.isArray(mesh?.faces)||mesh.faces.length<1||mesh.faces.length>256||
     !Array.isArray(mesh.flatVerticesM)||mesh.flatVerticesM.length>512||
     !Array.isArray(mesh.worldVerticesM)||
     mesh.flatVerticesM.length!==mesh.worldVerticesM.length||
     !Array.isArray(mesh.vertexProvenance)||
     mesh.vertexProvenance.length!==mesh.flatVerticesM.length||
     mesh.originalVertexCount!==piece.particleIndices.length||
     !Array.isArray(mesh.protectedCreaseEdges)||
     !mesh.flatVerticesM.every(p=>finite3(p)&&Math.abs(p[2])<=1e-10)||
     !mesh.worldVerticesM.every(finite3))
    throw new Error('Invalid detached sleeve constraint inputs')
  const n=mesh.flatVerticesM.length,original=mesh.originalVertexCount
  for(let i=0;i<n;i++){
    const provenance=mesh.vertexProvenance[i]
    if(i<original){
      if(provenance?.kind!=='original'||provenance.originalVertex!==i)
        throw new Error('Original sleeve vertex provenance invalid')
      continue
    }
    if(provenance?.kind!=='edge-intersection'||
       !Array.isArray(provenance.edge)||provenance.edge.length!==2||
       provenance.edge.some(j=>!Number.isInteger(j)||j<0||j>=original)||
       provenance.edge[0]===provenance.edge[1]||
       !Array.isArray(provenance.weights)||provenance.weights.length!==2||
       provenance.weights.some(w=>!Number.isFinite(w)||w<=0||w>=1)||
       Math.abs(provenance.weights[0]+provenance.weights[1]-1)>1e-9)
      throw new Error('Generated sleeve vertex provenance invalid')
    for(const positions of [mesh.flatVerticesM,mesh.worldVerticesM])
      for(let axis=0;axis<3;axis++){
        const expected=provenance.edge.reduce((s,j,k)=>
          s+provenance.weights[k]*positions[j][axis],0)
        if(Math.abs(expected-positions[i][axis])>1e-9)
          throw new Error('Generated sleeve vertex provenance mismatch')
      }
  }
  for(let i=0;i<original;i++){
    const global=piece.particleIndices[i]
    const world=payload.particles[global]?.position,rest=piece.flatVerticesM[i]
    if(!finite3(world)||!finite3(rest)||
       mesh.worldVerticesM[i].some((x,j)=>Math.abs(x-world[j])>1e-12)||
       mesh.flatVerticesM[i].some((x,j)=>Math.abs(x-rest[j])>1e-12))
      throw new Error('Original sleeve particle or material provenance changed')
  }
  const globalSet=new Set(piece.particleIndices)
  const local=new Map(piece.particleIndices.map((g,i)=>[g,i]))
  if(globalSet.size!==original)throw new Error('Duplicate source sleeve particle')
  const allSewing=payload.constraints.filter(c=>c.type==='seam')
  const sewn=allSewing.filter(c=>
    (globalSet.has(c.a)||globalSet.has(c.b)))
  // Frozen Foundation Tee fixture: never silently lose a sewing constraint.
  // This count check is NOT an independently signed sewing specification.
  if(allSewing.length!==102||sewn.length!==41||
     sewn.some(c=>typeof c.seamId!=='string'||!c.seamId||c.a===c.b)||
     sewn.some(c=>(globalSet.has(c.a)&&!local.has(c.a))||
     (globalSet.has(c.b)&&!local.has(c.b))||
     !Number.isInteger(c.a)||!Number.isInteger(c.b)))
    throw new Error('Invalid source sleeve sewing endpoints')
  const edges=new Map(),faces=mesh.faces
  for(let f=0;f<faces.length;f++){
    const face=faces[f]
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=n))
      throw new Error('Invalid remeshed sleeve triangle')
    const [a,b,c]=face.map(i=>mesh.flatVerticesM[i])
    const signed=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    const [wa,wb,wc]=face.map(i=>mesh.worldVerticesM[i])
    if(!(signed>1e-14)||norm(cross(subtract(wb,wa),subtract(wc,wa)))<=1e-14)
      throw new Error('Degenerate or reversed remeshed sleeve triangle')
    for(let j=0;j<3;j++){
      const u=face[j],v=face[(j+1)%3],id=key(u,v)
      if(!edges.has(id))edges.set(id,[])
      edges.get(id).push({face:f,u,v,opposite:face[(j+2)%3]})
    }
  }
  const protectedKeys=new Set()
  for(const pair of mesh.protectedCreaseEdges){
    if(!Array.isArray(pair)||pair.length!==2||pair.some(i=>
       !Number.isInteger(i)||i<0||i>=n)||pair[0]===pair[1])
      throw new Error('Invalid protected crease edge')
    const id=key(...pair)
    if(protectedKeys.has(id))throw new Error('Duplicate protected crease edge')
    protectedKeys.add(id)
  }
  const structural=[],hinges=[]
  if(new Set(faces.flat()).size!==n)
    throw new Error('Orphan remeshed sleeve vertex')
  for(const [id,incidents] of edges){
    if(incidents.length>2||incidents.length<1||
       (incidents.length===2&&incidents[0].u===incidents[1].u))
      throw new Error('Nonmanifold or inconsistently wound sleeve hinge')
    const [a,b]=id.split(':').map(Number),restEdge=norm(subtract(
      mesh.flatVerticesM[a],mesh.flatVerticesM[b]))
    if(!(restEdge>1e-8))throw new Error('Degenerate structural rest edge')
    structural.push({edge:[a,b],restLengthM:restEdge})
    if(incidents.length!==2)continue
    const [left,right]=incidents
    const world=mesh.worldVerticesM
    const normal=incident=>{
      const [x,y,z]=faces[incident.face].map(i=>world[i])
      const n=cross(subtract(y,x),subtract(z,x)),len=norm(n)
      return n.map(v=>v/len)
    }
    const axis=subtract(world[b],world[a]),axisLen=norm(axis)
    if(!(axisLen>1e-8))throw new Error('Collapsed world-space hinge edge')
    const u=normal(left),v=normal(right)
    const angle=Math.atan2(dot(axis.map(x=>x/axisLen),cross(u,v)),dot(u,v))
    if(!Number.isFinite(angle))throw new Error('Invalid sleeve hinge angle')
    hinges.push({edge:[a,b],opposite:[left.opposite,right.opposite],
      faces:[left.face,right.face],restDihedralRad:0,initialWorldDihedralRad:angle,
      crease:protectedKeys.has(id)})
  }
  if([...protectedKeys].some(id=>edges.get(id)?.length!==2))
    throw new Error('Missing or boundary-only protected crease hinge')
  const authored=inspectNativeUnderarmCenterCrease(payload).panels.find(
    p=>p.panelId===panelId)
  if(!authored)throw new Error('Missing authored underarm crease')
  const signed=p=>authored.creaseDirection[0]*(p[1]-authored.creaseOriginM[1])-
    authored.creaseDirection[1]*(p[0]-authored.creaseOriginM[0])
  const actualCreaseEdges=new Set([...edges.keys()].filter(id=>{
    const [a,b]=id.split(':').map(Number)
    return Math.abs(signed(mesh.flatVerticesM[a]))<=1e-8&&
      Math.abs(signed(mesh.flatVerticesM[b]))<=1e-8
  }))
  if(actualCreaseEdges.size!==protectedKeys.size||
     [...actualCreaseEdges].some(id=>!protectedKeys.has(id)))
    throw new Error('Protected hinges disagree with authored underarm crease')
  const sourceSewingEndpoints=sewn.flatMap(c=>[c.a,c.b].filter(g=>globalSet.has(g)))
  if(sourceSewingEndpoints.length!==46||
     sourceSewingEndpoints.some(g=>local.get(g)>=original))
    throw new Error('Sewing endpoint moved to generated vertex')
  const detached={particles:mesh.worldVerticesM.map(position=>({position})),
    pieces:[{id:panelId,particleIndices:mesh.worldVerticesM.map((_,i)=>i),
      flatVerticesM:mesh.flatVerticesM,faces}]}
  const strain=auditNativePrincipalStrain(detached)
  const contact=inspectNativeIntrapanelStaticContact(detached,
    {clearanceM:.001,maxPairs:500000})
  const contactValid=contact.intersectingTrianglePairs===0&&
    contact.edgeNeighborNearFoldoverPairs===0&&
    contact.nonadjacentNearClearancePairs===0
  return {panelId,vertexCount:n,faceCount:faces.length,
    structural,hinges,structuralCount:structural.length,bendingHingeCount:hinges.length,
    creaseHingeCount:hinges.filter(h=>h.crease).length,
    sourceSewingConstraints:sewn.length,sourceSewingEndpointReferences:sourceSewingEndpoints.length,
    maximumPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    contact:{intersections:contact.intersectingTrianglePairs,
      nearFoldovers:contact.edgeNeighborNearFoldoverPairs,
      nearClearance:contact.nonadjacentNearClearancePairs},
    staticContactValid:contactValid,withinDeclaredStrainLimit:strain.withinDeclaredStrainLimit,
    stiffnessCalibrated:false,solverConstraintsRebuilt:false,
    samePanelContactExclusionsRebuilt:false,continuousContactCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}

export function researchFoundationTeeSleeveConstraintInventory20261025(payload,panelId){
  const mesh=researchFoundationTeeSleeveQualityContact20261025(payload,panelId)
  return auditDetachedSleeveConstraintInventoryResearch20261025(payload,panelId,mesh)
}
