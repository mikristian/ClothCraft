// Research-only coupled STATIC fold-pose screen for independently remeshed
// panels. A pair of individually isometric/clear folds may intersect once
// placed together. No trajectory, avatar, or production solver is certified.
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const subtract=(a,b)=>a.map((x,i)=>x-b[i])
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const norm=a=>Math.hypot(...a)

export function screenNativeCoupledCreasePoseContact20261024(panels,{
  anglesRadians={},sewingPairs=[],clearanceM=.001,
  strainLimitPercent=5,maxPairs=250000,
}={}){
  if(!Array.isArray(panels)||panels.length<2||panels.length>4||
     !Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.01||
     !Number.isInteger(maxPairs)||maxPairs<1||maxPairs>1_000_000||
     !Number.isFinite(strainLimitPercent)||strainLimitPercent<0||
     strainLimitPercent>100||!Array.isArray(sewingPairs)||sewingPairs.length>512||
     !anglesRadians||Object.getPrototypeOf(anglesRadians)!==Object.prototype)
    throw new RangeError('Invalid coupled crease screen settings')
  const ids=panels.map(p=>p?.panelId)
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
     Object.keys(anglesRadians).some(id=>!ids.includes(id)))
    throw new Error('Invalid coupled crease panel identities')
  const totalFaces=panels.reduce((n,p)=>n+(p?.faces?.length||0),0)
  const intra=panels.reduce((n,p)=>n+(p.faces?.length||0)*((p.faces?.length||0)-1)/2,0)
  const inter=panels.reduce((n,p,i)=>n+panels.slice(i+1).reduce((s,q)=>
    s+(p.faces?.length||0)*(q.faces?.length||0),0),0)
  if(!Number.isSafeInteger(intra+inter)||intra+inter>maxPairs||totalFaces<2)
    throw new RangeError('Coupled crease contact pair budget exceeded')
  const snapshot=JSON.stringify(panels)
  const particles=[],pieces=[]
  const positionsById=new Map()
  for(const panel of panels){
    const {verticesM,worldPositionsM,faces,creaseEdges}=panel
    if(!Array.isArray(verticesM)||verticesM.length<4||verticesM.length>512||
       !Array.isArray(worldPositionsM)||worldPositionsM.length!==verticesM.length||
       !verticesM.every(finite3)||!worldPositionsM.every(finite3)||
       !Array.isArray(faces)||faces.length<2||faces.length>512||
       !Array.isArray(creaseEdges)||creaseEdges.length<1)
      throw new Error('Invalid coupled crease panel geometry')
    const angle=anglesRadians[panel.panelId]??0
    if(!Number.isFinite(angle)||Math.abs(angle)>Math.PI)
      throw new RangeError('Invalid coupled crease angle')
    const axisEdge=creaseEdges[0]
    if(!Array.isArray(axisEdge)||axisEdge.length!==2||
       axisEdge.some(i=>!Number.isInteger(i)||i<0||i>=verticesM.length)||
       axisEdge[0]===axisEdge[1])throw new Error('Invalid coupled crease axis')
    const origin=worldPositionsM[axisEdge[0]]
    const direction=subtract(worldPositionsM[axisEdge[1]],origin)
    const length=norm(direction)
    if(length<1e-6)throw new Error('Degenerate coupled crease axis')
    const unit=direction.map(x=>x/length)
    if(verticesM.some((p,i)=>Math.abs(p[0])<=1e-8&&
         norm(cross(subtract(worldPositionsM[i],origin),unit))>1e-6)||
       creaseEdges.some(edge=>!Array.isArray(edge)||edge.length!==2||
      edge.some(i=>!Number.isInteger(i)||i<0||i>=verticesM.length||
        Math.abs(verticesM[i][0])>1e-8||
        norm(cross(subtract(worldPositionsM[i],origin),unit))>1e-6)))
      throw new Error('Coupled crease axis is not collinear in world space')
    for(const face of faces){
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=verticesM.length))
        throw new Error('Invalid coupled crease face')
      const xs=face.map(i=>verticesM[i][0])
      if(Math.min(...xs)<-1e-8&&Math.max(...xs)>1e-8)
        throw new Error('Coupled crease fold cuts a material triangle')
    }
    const c=Math.cos(angle),s=Math.sin(angle)
    const positions=worldPositionsM.map((point,i)=>{
      if(verticesM[i][0]<=1e-8)return [...point]
      const v=subtract(point,origin),spin=cross(unit,v),along=dot(unit,v)
      return origin.map((x,k)=>x+v[k]*c+spin[k]*s+unit[k]*along*(1-c))
    })
    const start=particles.length
    particles.push(...positions.map(position=>({position})))
    pieces.push({id:panel.panelId,flatVerticesM:verticesM.map(p=>[...p]),
      faces:faces.map(f=>[...f]),
      particleIndices:positions.map((_,i)=>start+i)})
    positionsById.set(panel.panelId,positions)
  }
  const payload={pieces,particles}
  const strain=auditNativePrincipalStrain(payload,{limitPercent:strainLimitPercent})
  const self=inspectNativeIntrapanelStaticContact(payload,{clearanceM,maxPairs})
  const between=inspectNativeInterpanelExactStaticContact(payload,{
    clearanceM,maxPairs,maxNarrowphasePairs:maxPairs})
  const gaps=[]
  for(const pair of sewingPairs){
    const a=pair?.a,b=pair?.b
    if(!a||!b||!positionsById.has(a.panelId)||
       !positionsById.has(b.panelId)||
       !Number.isInteger(a.vertex)||!Number.isInteger(b.vertex)||
       !positionsById.get(a.panelId)[a.vertex]||
       !positionsById.get(b.panelId)[b.vertex])
      throw new Error('Invalid coupled crease sewing correspondence')
    gaps.push(norm(subtract(positionsById.get(a.panelId)[a.vertex],
      positionsById.get(b.panelId)[b.vertex]))*1000)
  }
  if(JSON.stringify(panels)!==snapshot)
    throw new Error('Coupled crease screen mutated source panels')
  return {maximumSeamGapMm:gaps.length?Math.max(...gaps):null,
    rmsSeamGapMm:gaps.length?Math.hypot(...gaps)/Math.sqrt(gaps.length):null,
    sewnPairsChecked:gaps.length,
    maximumPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    principalStrainValid:strain.withinDeclaredStrainLimit,
    intrapanelIntersections:self.intersectingTrianglePairs,
    intrapanelNearClearancePairs:self.nonadjacentNearClearancePairs,
    interpanelNearClearancePairs:between.nearClearancePairs,
    interpanelMinimumPotentialGapMm:between.minimumExactGapMm,
    staticContactClear:self.staticDisjointThicknessScreenClear&&
      between.staticInterpanelExactClear,
    sourceUnchanged:true,staticOnly:true,avatarContactChecked:false,
    intervalContactChecked:false,sweptCollisionCertified:false,
    physicalAcceptance:false,safeToAutoApply:false}
}
