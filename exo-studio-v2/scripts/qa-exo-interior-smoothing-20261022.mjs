// Single bounded opt-in research comparison. No native build, save, or UI edit.
import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'
import {inspectClothMesh} from '../src/core/physics/meshQuality.js'
import {smoothInteriorTriangleQuality} from '../src/core/physics/interiorMeshSmoothingResearch.js'

test('local smoothing leaves a polygon boundary fixed and rejects invalid protected edges',()=>{
  const mesh={vertices:[[0,0],[.1,0],[.1,.1],[0,.1],[.001,.001]],
    faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]}
  const frozen=JSON.stringify(mesh)
  const result=smoothInteriorTriangleQuality(mesh)
  assert.ok(result.movedVertices>0)
  for(let i=0;i<4;i++)assert.deepEqual(result.vertices[i],mesh.vertices[i])
  assert.deepEqual(result.faces,mesh.faces)
  assert.equal(JSON.stringify(mesh),frozen)
  assert.throws(()=>smoothInteriorTriangleQuality(mesh,{protectedEdges:[[0,4],[1,99]]}),
    /Invalid protected edge/)
  assert.throws(()=>smoothInteriorTriangleQuality(mesh,{passes:100}),/Invalid interior/)
})

test('interior smoothing uses the same 2 mm altitude threshold as the mesh quality gate',()=>{
  // All four initial faces have aspect <25, but two have altitude 1 mm.
  // A mistaken 0.002 cm threshold would do nothing here.
  const mesh={vertices:[[0,0],[.6,0],[.6,.6],[0,.6],[.1,.1]],
    faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]}
  const before=inspectClothMesh(mesh.vertices,mesh.faces)
  assert.ok(before.slenderFaces>0)
  assert.ok(before.maximumAspect<25)
  const frozen=JSON.stringify(mesh)
  const improved=smoothInteriorTriangleQuality(mesh)
  const after=inspectClothMesh(improved.vertices,improved.faces)
  assert.equal(after.slenderFaces,0)
  assert.ok(improved.movedVertices>0)
  assert.deepEqual(improved.vertices.slice(0,4),mesh.vertices.slice(0,4))
  assert.equal(JSON.stringify(mesh),frozen)
})

test('experimental interior smoothing retains sewing, boundary, hinges and the original four-panel project',()=>{
  const project=createTemplateProject('tee'),frozen=JSON.stringify(project)
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalState=JSON.stringify(original)
  const found=discoverNativeDevelopableHinges(original,{maxResults:128})
  const axes=Object.fromEntries(original.pieces.map(piece=>[piece.id,[
    found.returned.find(item=>item.panelId===piece.id&&item.worldAxisAligned&&item.side==='positive').axisVertices]]))
  const common={quality:'quality',experimentalOptimizeMesh:true,
    experimentalProtectedHingeAxesByPiece:axes}
  const baseline=buildNativeSimulationPayload(project,common)
  const start=performance.now()
  const candidate=buildNativeSimulationPayload(project,{...common,experimentalSmoothInteriorMesh:true})
  const elapsedMs=performance.now()-start
  const sourceSeams=measureNativeSeamResiduals(baseline)
  const candidateSeams=measureNativeSeamResiduals(candidate)
  const baseStrain=auditNativePrincipalStrain(baseline)
  const newStrain=auditNativePrincipalStrain(candidate)
  const baseContact=inspectStagedAvatarContact(baseline)
  const newContact=inspectStagedAvatarContact(candidate)
  const baseInterpanel=inspectNativeInterpanelBroadphase(baseline)
  const baseIntrapanel=inspectNativeIntrapanelStaticContact(baseline)
  const interpanel=inspectNativeInterpanelBroadphase(candidate)
  const intrapanel=inspectNativeIntrapanelStaticContact(candidate)
  const quality=payload=>payload.pieces.map(piece=>
    inspectClothMesh(piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),piece.faces))
  const oldQuality=quality(baseline),newQuality=quality(candidate)
  assert.equal(candidate.pieces.length,4)
  assert.equal(candidate.particles.length,500)
  assert.equal(candidate.pieces.reduce((n,p)=>n+p.faces.length,0),768)
  assert.deepEqual(candidate.virtualSeams,baseline.virtualSeams)
  assert.deepEqual(candidate.anchors,baseline.anchors)
  assert.deepEqual(candidateSeams.groups,sourceSeams.groups)
  assert.ok(intrapanel.intersectingTrianglePairs<=baseIntrapanel.intersectingTrianglePairs,
    'Rest mesh improvement must not introduce additional static self-intersections')
  assert.ok(interpanel.possibleContactPairs<=baseInterpanel.possibleContactPairs,
    'Rest mesh improvement must not introduce additional cross-panel potential contacts')
  for(let i=0;i<4;i++){
    assert.deepEqual(candidate.pieces[i].particleIndices,baseline.pieces[i].particleIndices)
    assert.deepEqual(candidate.pieces[i].faces,baseline.pieces[i].faces)
    const a=baseline.pieces[i],b=candidate.pieces[i]
    const boundary=new Set()
    const edges=new Map()
    for(const face of a.faces)for(const [x,y] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
      const key=[x,y].sort((x,y)=>x-y).join(':')
      edges.set(key,(edges.get(key)||0)+1)
    }
    for(const [key,n] of edges)if(n===1)key.split(':').forEach(i=>boundary.add(Number(i)))
    for(const index of boundary)assert.deepEqual(b.flatVerticesM[index],a.flatVerticesM[index])
    for(const index of axes[a.id][0])assert.deepEqual(b.flatVerticesM[index],a.flatVerticesM[index])
    assert.ok(newQuality[i].slenderFaces<=oldQuality[i].slenderFaces,
      'Rest conditioning cannot regress on any panel')
  }
  assert.deepEqual(buildNativeSimulationPayload(project,{quality:'quality'}),original)
  assert.equal(JSON.stringify(original),originalState)
  assert.equal(JSON.stringify(project),frozen)
  assert.throws(()=>buildNativeSimulationPayload(project,{experimentalSmoothInteriorMesh:true}),
    /requires experimental mesh optimization/)
  const result={
    panels:4,triangles:768,
    originalPoorRestFaces:oldQuality.reduce((n,q)=>n+q.slenderFaces,0),
    candidatePoorRestFaces:newQuality.reduce((n,q)=>n+q.slenderFaces,0),
    originalWorstAspect:Math.max(...oldQuality.map(q=>q.maximumAspect)),
    candidateWorstAspect:Math.max(...newQuality.map(q=>q.maximumAspect)),
    initialMaxGapMm:sourceSeams.maxGapMm,candidateMaxGapMm:candidateSeams.maxGapMm,
    initialRmsGapMm:sourceSeams.rmsGapMm,candidateRmsGapMm:candidateSeams.rmsGapMm,
    initialMaxPrincipalExtensionPercent:baseStrain.maximumPrincipalExtensionPercent,
    candidateMaxPrincipalExtensionPercent:newStrain.maximumPrincipalExtensionPercent,
    initialMaxPrincipalCompressionPercent:baseStrain.maximumPrincipalCompressionPercent,
    candidateMaxPrincipalCompressionPercent:newStrain.maximumPrincipalCompressionPercent,
    initialAvatarPenetrations:baseContact.penetrating,
    candidateAvatarPenetrations:newContact.penetrating,
    initialInterpanelPotentialContacts:baseInterpanel.possibleContactPairs,
    candidateInterpanelPotentialContacts:interpanel.possibleContactPairs,
    initialIntrapanelIntersections:baseIntrapanel.intersectingTrianglePairs,
    candidateIntrapanelIntersections:intrapanel.intersectingTrianglePairs,
    elapsedMs:+elapsedMs.toFixed(3),
    fitCertified:false,continuousCollisionDetectionVerified:false,
  }
  console.log('FOUR_PANEL_INTERIOR_SMOOTHING_RESEARCH '+JSON.stringify(result))
})
