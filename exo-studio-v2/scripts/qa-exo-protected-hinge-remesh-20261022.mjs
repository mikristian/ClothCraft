// Opt-in, physically constrained mesh-topology research. Regenerates all
// native constraints from the new mesh, preserving sewing and saved garments.
// Does NOT approve physical fit, avatar entry or swept triangle CCD.
import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {optimizeTriangleQuality,materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {discoverNativeDevelopableHinges,searchNativeDevelopableHingeCandidates} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const hasEdge=(faces,[a,b])=>faces.some(face=>
  [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]].some(pair=>
    edgeKey(...pair)===edgeKey(a,b)))
function poorRestFaces(payload){
  return payload.pieces.reduce((sum,piece)=>sum+piece.faces.filter(face=>{
    const [a,b,c]=face.map(i=>piece.flatVerticesM[i])
    const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])]
    const longest=Math.max(...lengths)
    const doubleArea=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
    const altitude=longest>0?doubleArea/longest:0
    return altitude<.002||longest/altitude>25
  }).length,0)
}

test('protected internal fold edge cannot be flipped even when the quality score favors flipping',()=>{
  const mesh={vertices:[[0,0],[3,0],[4,1],[0,1]],faces:[[0,1,2],[0,2,3]]}
  const frozen=JSON.stringify(mesh)
  const unprotected=optimizeTriangleQuality(mesh)
  assert.equal(unprotected.flips,1)
  assert.equal(hasEdge(unprotected.faces,[0,2]),false)
  const protectedEdges=materialHingeProtectedEdges(mesh,[0,2])
  assert.deepEqual(protectedEdges,[[0,2]])
  const result=optimizeTriangleQuality(mesh,{protectedEdges})
  assert.equal(result.flips,0)
  assert.equal(hasEdge(result.faces,[0,2]),true)
  assert.equal(JSON.stringify(mesh),frozen)
})
test('protected material fold validates topology, not arbitrary diagonal or malformed data',()=>{
  const mesh={vertices:[[0,0],[3,0],[4,1],[0,1]],faces:[[0,1,2],[0,2,3]]}
  assert.throws(()=>materialHingeProtectedEdges(mesh,[0,1]),/does not partition/)
  assert.throws(()=>materialHingeProtectedEdges(mesh,[0,0]),/Invalid material hinge axis/)
  assert.throws(()=>materialHingeProtectedEdges(mesh,[0,7]),/Invalid material hinge axis/)
  assert.throws(()=>materialHingeProtectedEdges(mesh,[0,2],{tolerance:Infinity}),/tolerance/)
  assert.throws(()=>optimizeTriangleQuality(mesh,{protectedEdges:[[1,3]]}),/not present/)
  assert.throws(()=>optimizeTriangleQuality(mesh,{protectedEdges:[[0,7]]}),/Invalid protected/)
  assert.throws(()=>optimizeTriangleQuality(mesh,{protectedEdges:[[0,0]]}),/Invalid protected/)
  assert.throws(()=>optimizeTriangleQuality(mesh,{protectedEdges:new Set()}),/index pairs/)
})

test('real four-panel research remesh preserves four executable hinge axes without worsening rest conditioning',()=>{
  const project=createTemplateProject('tee'),frozenProject=JSON.stringify(project)
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalState=JSON.stringify(original)
  const normal=buildNativeSimulationPayload(project,{quality:'quality',experimentalOptimizeMesh:true})
  const originalAxes=discoverNativeDevelopableHinges(original,{maxResults:128})
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=originalAxes.returned.find(item=>item.panelId===piece.id&&
      item.worldAxisAligned&&item.side==='positive')
    assert.ok(hinge,`No executable hinge axis for ${piece.id}`)
    return [piece.id,[hinge.axisVertices]]
  }))
  const started=performance.now()
  const protectedPayload=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
    experimentalProtectedHingeAxesByPiece:axes})
  const elapsedMs=performance.now()-started
  const state=JSON.stringify(protectedPayload)
  const regularHinges=discoverNativeDevelopableHinges(normal,{maxResults:128})
  const protectedHinges=discoverNativeDevelopableHinges(protectedPayload,{maxResults:128})
  const originalSeams=measureNativeSeamResiduals(original)
  const regularSeams=measureNativeSeamResiduals(normal)
  const protectedSeams=measureNativeSeamResiduals(protectedPayload)
  const regularStrain=auditNativePrincipalStrain(normal)
  const protectedStrain=auditNativePrincipalStrain(protectedPayload)
  const regularContact=inspectStagedAvatarContact(normal)
  const protectedContact=inspectStagedAvatarContact(protectedPayload)
  assert.equal(protectedPayload.pieces.length,4)
  assert.equal(protectedPayload.particles.length,500)
  assert.equal(protectedPayload.constraints.length,normal.constraints.length)
  assert.deepEqual(protectedPayload.virtualSeams,normal.virtualSeams)
  assert.deepEqual(protectedPayload.anchors,normal.anchors)
  assert.deepEqual(protectedSeams.groups,originalSeams.groups)
  assert.deepEqual(protectedSeams.groups,regularSeams.groups)
  assert.equal(poorRestFaces(protectedPayload),poorRestFaces(normal))
  assert.equal(poorRestFaces(protectedPayload),37)
  assert.ok(protectedHinges.executableHingeSides>regularHinges.executableHingeSides)
  for(const piece of protectedPayload.pieces)for(const axis of axes[piece.id]){
    assert.equal(hasEdge(piece.faces,axis),true,`${piece.id} fold axis was removed`)
    assert.ok(protectedHinges.returned.some(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&edgeKey(...h.axisVertices)===edgeKey(...axis)))
  }
  assert.ok(Math.abs(regularStrain.maximumPrincipalExtensionPercent-
    protectedStrain.maximumPrincipalExtensionPercent)<1e-8)
  assert.equal(protectedContact.penetrating,regularContact.penetrating)
  assert.equal(JSON.stringify(protectedPayload),state)
  assert.equal(JSON.stringify(original),originalState)
  assert.equal(JSON.stringify(project),frozenProject)
  assert.throws(()=>buildNativeSimulationPayload(project,{
    experimentalProtectedHingeAxesByPiece:axes}),/require experimental/)
  assert.deepEqual(buildNativeSimulationPayload(project,{quality:'quality'}),original,
    'Research-only option must not alter default EXO native payload')
  console.log('FOUR_PANEL_PROTECTED_FOLD_MESH '+JSON.stringify({
    poorRestFacesBefore:poorRestFaces(original),poorRestFacesAfter:poorRestFaces(protectedPayload),
    regularExecutableHingeSides:regularHinges.executableHingeSides,
    protectedExecutableHingeSides:protectedHinges.executableHingeSides,
    regularMaxSeamGapMm:regularSeams.maxGapMm,protectedMaxSeamGapMm:protectedSeams.maxGapMm,
    regularRmsGapMm:regularSeams.rmsGapMm,protectedRmsGapMm:protectedSeams.rmsGapMm,
    regularPrincipalExtensionPercent:regularStrain.maximumPrincipalExtensionPercent,
    protectedPrincipalExtensionPercent:protectedStrain.maximumPrincipalExtensionPercent,
    regularPenetratingSamples:regularContact.penetrating,
    protectedPenetratingSamples:protectedContact.penetrating,
    experimentalPayloadBuildMs:+elapsedMs.toFixed(2),
    garmentUnchanged:true,fitCertified:false,sweptCCDVerified:false,
  }))
})

test('newly preserved real garment hinge remains rejected when fabric and avatar checks fail',()=>{
  const project=createTemplateProject('tee')
  const base=buildNativeSimulationPayload(project,{quality:'quality'})
  const baseAxes=discoverNativeDevelopableHinges(base,{maxResults:128})
  const axes=Object.fromEntries(base.pieces.map(piece=>[piece.id,[baseAxes.returned.find(h=>
    h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive').axisVertices]]))
  const payload=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes})
  const before=JSON.stringify(payload)
  const hinge=discoverNativeDevelopableHinges(payload,{maxResults:128}).returned.find(h=>
    h.panelId==='back'&&h.worldAxisAligned&&h.side==='positive'&&
    edgeKey(...h.axisVertices)===edgeKey(...axes.back[0]))
  assert.ok(hinge)
  const start=performance.now()
  const result=searchNativeDevelopableHingeCandidates(payload,{
    ...hinge,anglesRadians:[-.2,.2],steps:8,checkPose:inspectStagedAvatarContact})
  const ms=performance.now()-start
  assert.equal(result.trials.length,2)
  assert.equal(result.acceptedCount,0)
  assert.equal(result.best,null)
  assert.ok(result.trials.some(row=>row.maximumSeamGapMm<188.4521&&
    row.rmsSeamGapMm<117.401))
  assert.ok(result.trials.every(row=>row.maximumPrincipalExtensionPercent>5&&
    row.endpointPenetrations>0&&row.sampledPathPenetrations>0))
  assert.equal(JSON.stringify(payload),before)
  console.log('FOUR_PANEL_PROTECTED_HINGE_REJECTED '+JSON.stringify({
    trials:result.trials,experimentalSearchMs:+ms.toFixed(2),
    sourceUnchanged:true,fitCertified:false,sweptCCDVerified:false,
  }))
})
