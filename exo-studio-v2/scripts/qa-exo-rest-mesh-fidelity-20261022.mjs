// Independent negative controls for research-only rest-mesh conditioning.
// No native build, project save, application modification or checkpoint write.
import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {inspectClothMesh} from '../src/core/physics/meshQuality.js'
import {auditRestMeshFidelity} from '../src/core/physics/restMeshFidelityResearch.js'
import {smoothInteriorTriangleQuality} from '../src/core/physics/interiorMeshSmoothingResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'

const sample={vertices:[[0,0],[.6,0],[.6,.6],[0,.6],[.3,.3]],
  faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]}
const meters=mesh=>({faces:mesh.faces,
  vertices:mesh.vertices.map(v=>[v[0]/100,v[1]/100])})

test('identity and genuinely small interior adjustments pass without mutating reference',()=>{
  const frozen=JSON.stringify(sample)
  const identity=auditRestMeshFidelity(sample,sample)
  assert.equal(identity.approved,true)
  assert.equal(identity.maximumRelativeEdgeDriftPercent,0)
  const candidate={...sample,vertices:sample.vertices.map(p=>[...p])}
  candidate.vertices[4][0]+=.001 // 0.01 mm, far below the 2 mm displacement cap
  const result=auditRestMeshFidelity(sample,candidate)
  assert.equal(result.approved,true)
  assert.ok(result.maximumRelativeEdgeDriftPercent<10)
  assert.equal(JSON.stringify(sample),frozen)
})

test('a boundary-preserving area-preserving sliver repair can still invalidate material edge lengths',()=>{
  const distorted={...sample,vertices:sample.vertices.map(p=>[...p])}
  distorted.vertices[4]=[.02,.02]
  const result=auditRestMeshFidelity(sample,distorted)
  assert.equal(result.areaDriftPercent,0)
  assert.equal(result.maximumFixedDisplacementMm,0)
  assert.equal(result.flippedFaces,0)
  assert.equal(result.approved,false)
  assert.ok(result.maximumRelativeEdgeDriftPercent>10)
  assert.ok(result.maximumInteriorDisplacementMm>2)
})

test('protected fold vertex, boundary and face connectivity are enforced',()=>{
  const moved={...sample,vertices:sample.vertices.map(p=>[...p])}
  moved.vertices[4][0]+=.001
  assert.equal(auditRestMeshFidelity(sample,moved,{protectedVertices:[4]}).approved,false)
  moved.vertices[0][0]+=.001
  assert.equal(auditRestMeshFidelity(sample,moved).approved,false)
  assert.throws(()=>auditRestMeshFidelity(sample,{...sample,faces:[...sample.faces].reverse()}),
    /topology changed/)
  assert.throws(()=>auditRestMeshFidelity(sample,sample,{maxRelativeEdgeDriftPercent:-1}),
    /Invalid maxRelativeEdgeDriftPercent/)
})

test('cumulative smoothing limits reject repeated drift and preserve source',()=>{
  const mesh={vertices:[[0,0],[.6,0],[.6,.6],[0,.6],[.1,.1]],
    faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4]]}
  const frozen=JSON.stringify(mesh)
  const result=smoothInteriorTriangleQuality(mesh,{passes:12,
    fidelityLimits:{maxInteriorDisplacementMm:2,maxRelativeEdgeDriftPercent:10}})
  const audit=auditRestMeshFidelity(meters(mesh),meters(result),{
    maxInteriorDisplacementMm:2,maxRelativeEdgeDriftPercent:10})
  assert.equal(audit.approved,true)
  assert.equal(JSON.stringify(mesh),frozen)
  assert.throws(()=>smoothInteriorTriangleQuality(mesh,{fidelityLimits:{maxRelativeEdgeDriftPercent:-1}}),
    /Invalid interior smoothing fidelity limits/)
  assert.throws(()=>smoothInteriorTriangleQuality(mesh,{fidelityLimits:{unknownCap:1}}),
    /Invalid interior smoothing fidelity limits/)
})

test('four-panel bounded material-preserving smoothing does not mask rest distortion',()=>{
  const project=createTemplateProject('tee'),frozen=JSON.stringify(project)
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const hinges=discoverNativeDevelopableHinges(original,{maxResults:128})
  const axes=Object.fromEntries(original.pieces.map(piece=>[piece.id,[
    hinges.returned.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive').axisVertices]]))
  const baseline=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes})
  const baselineJSON=JSON.stringify(baseline)
  const start=performance.now()
  const candidatePayload=JSON.parse(baselineJSON)
  const results=baseline.pieces.map(piece=>{
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),faces:piece.faces}
    const protectedEdges=materialHingeProtectedEdges(mesh,axes[piece.id][0])
    const candidate=smoothInteriorTriangleQuality(mesh,{protectedEdges,
      fidelityLimits:{maxInteriorDisplacementMm:2,maxRelativeEdgeDriftPercent:10}})
    const fidelity=auditRestMeshFidelity(meters(mesh),meters(candidate),{
      protectedVertices:[...new Set(protectedEdges.flat())],
      maxInteriorDisplacementMm:2,maxRelativeEdgeDriftPercent:10})
    const before=inspectClothMesh(mesh.vertices,mesh.faces)
    const after=inspectClothMesh(candidate.vertices,candidate.faces)
    assert.equal(fidelity.approved,true)
    assert.ok(after.slenderFaces<=before.slenderFaces)
    candidatePayload.pieces.find(p=>p.id===piece.id).flatVerticesM=
      candidate.vertices.map(v=>[v[0]/100,v[1]/100,0])
    return {panel:piece.id,beforePoorFaces:before.slenderFaces,
      afterPoorFaces:after.slenderFaces,movedVertices:candidate.movedVertices,
      maxEdgeDriftPercent:fidelity.maximumRelativeEdgeDriftPercent,
      maxInteriorMoveMm:fidelity.maximumInteriorDisplacementMm}
  })
  assert.equal(results.reduce((n,p)=>n+p.beforePoorFaces,0),37)
  assert.ok(results.reduce((n,p)=>n+p.movedVertices,0)>0)
  const seamsA=measureNativeSeamResiduals(baseline)
  const seamsB=measureNativeSeamResiduals(candidatePayload)
  const strainA=auditNativePrincipalStrain(baseline)
  const strainB=auditNativePrincipalStrain(candidatePayload)
  const avatarA=inspectStagedAvatarContact(baseline)
  const avatarB=inspectStagedAvatarContact(candidatePayload)
  const selfA=inspectNativeIntrapanelStaticContact(baseline)
  const selfB=inspectNativeIntrapanelStaticContact(candidatePayload)
  const interA=inspectNativeInterpanelBroadphase(baseline)
  const interB=inspectNativeInterpanelBroadphase(candidatePayload)
  assert.deepEqual(seamsA,seamsB)
  assert.deepEqual(avatarA,avatarB)
  assert.deepEqual(selfA,selfB)
  assert.deepEqual(interA,interB)
  assert.equal(strainB.withinDeclaredStrainLimit,false)
  assert.equal(JSON.stringify(baseline),baselineJSON)
  assert.equal(JSON.stringify(project),frozen)
  console.log('FOUR_PANEL_CAPPED_SMOOTHING '+JSON.stringify({
    results,initialMaxGapMm:seamsA.maxGapMm,candidateMaxGapMm:seamsB.maxGapMm,
    initialRmsGapMm:seamsA.rmsGapMm,candidateRmsGapMm:seamsB.rmsGapMm,
    initialPrincipalExtensionPercent:strainA.maximumPrincipalExtensionPercent,
    candidatePrincipalExtensionPercent:strainB.maximumPrincipalExtensionPercent,
    initialAvatarPenetrations:avatarA.penetrating,candidateAvatarPenetrations:avatarB.penetrating,
    initialStaticSelfIntersections:selfA.intersectingTrianglePairs,
    candidateStaticSelfIntersections:selfB.intersectingTrianglePairs,
    initialInterpanelPotentialContacts:interA.possibleContactPairs,
    candidateInterpanelPotentialContacts:interB.possibleContactPairs,
    elapsedMs:+(performance.now()-start).toFixed(2),
    sourceNonmutation:true,fitCertified:false,avatarEntryCertified:false}))
})

test('actual four-panel smoothing quality gain is not confused with material-pattern fidelity',()=>{
  const project=createTemplateProject('tee'),originalProject=JSON.stringify(project)
  const initial=buildNativeSimulationPayload(project,{quality:'quality'})
  const initialJSON=JSON.stringify(initial)
  const hinges=discoverNativeDevelopableHinges(initial,{maxResults:128})
  const axes=Object.fromEntries(initial.pieces.map(piece=>[piece.id,[
    hinges.returned.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive').axisVertices]]))
  const common={quality:'quality',experimentalOptimizeMesh:true,
    experimentalProtectedHingeAxesByPiece:axes}
  const before=buildNativeSimulationPayload(project,common)
  const beforeJSON=JSON.stringify(before)
  const start=performance.now()
  const after=buildNativeSimulationPayload(project,{...common,experimentalSmoothInteriorMesh:true})
  const buildMs=performance.now()-start
  const perPanel=before.pieces.map((piece,index)=>{
    const other=after.pieces[index]
    assert.equal(piece.id,other.id)
    const mesh=x=>({vertices:x.flatVerticesM,faces:x.faces})
    const quality=x=>inspectClothMesh(x.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),x.faces)
    const protectedVertices=[...new Set(materialHingeProtectedEdges(mesh(piece),
      axes[piece.id][0]).flat())]
    const audit=auditRestMeshFidelity(mesh(piece),mesh(other),{
      protectedVertices})
    assert.equal(auditRestMeshFidelity(mesh(piece),mesh(piece)).approved,true)
    assert.equal(audit.flippedFaces,0)
    assert.ok(audit.maximumFixedDisplacementMm<1e-6)
    assert.ok(audit.areaDriftPercent<1e-7)
    return {id:piece.id,beforeSlivers:quality(piece).slenderFaces,
      afterSlivers:quality(other).slenderFaces,...audit}
  })
  const seamsA=measureNativeSeamResiduals(before),seamsB=measureNativeSeamResiduals(after)
  const strainA=auditNativePrincipalStrain(before),strainB=auditNativePrincipalStrain(after)
  const avatarA=inspectStagedAvatarContact(before),avatarB=inspectStagedAvatarContact(after)
  const selfA=inspectNativeIntrapanelStaticContact(before)
  const selfB=inspectNativeIntrapanelStaticContact(after)
  const interA=inspectNativeInterpanelBroadphase(before)
  const interB=inspectNativeInterpanelBroadphase(after)
  assert.equal(perPanel.reduce((n,p)=>n+p.beforeSlivers,0),37)
  assert.equal(perPanel.reduce((n,p)=>n+p.afterSlivers,0),0)
  assert.ok(perPanel.some(p=>!p.approved),
    'Unconstrained smoothing must not silently pass material-pattern fidelity')
  assert.ok(Math.max(...perPanel.map(p=>p.maximumRelativeEdgeDriftPercent))>100)
  assert.deepEqual(seamsA.groups,seamsB.groups)
  assert.equal(avatarA.penetrating,avatarB.penetrating)
  assert.ok(selfB.intersectingTrianglePairs<=selfA.intersectingTrianglePairs)
  assert.ok(interB.possibleContactPairs<=interA.possibleContactPairs)
  assert.equal(JSON.stringify(before),beforeJSON)
  assert.equal(JSON.stringify(initial),initialJSON)
  assert.equal(JSON.stringify(project),originalProject)
  console.log('FOUR_PANEL_REST_MESH_FIDELITY '+JSON.stringify({
    beforePoorFaces:perPanel.reduce((n,p)=>n+p.beforeSlivers,0),
    afterPoorFaces:perPanel.reduce((n,p)=>n+p.afterSlivers,0),
    maxMaterialEdgeDriftPercent:Math.max(...perPanel.map(p=>p.maximumRelativeEdgeDriftPercent)),
    maxInteriorMoveMm:Math.max(...perPanel.map(p=>p.maximumInteriorDisplacementMm)),
    initialMaxGapMm:seamsA.maxGapMm,candidateMaxGapMm:seamsB.maxGapMm,
    initialRmsGapMm:seamsA.rmsGapMm,candidateRmsGapMm:seamsB.rmsGapMm,
    initialPrincipalExtensionPercent:strainA.maximumPrincipalExtensionPercent,
    candidatePrincipalExtensionPercent:strainB.maximumPrincipalExtensionPercent,
    initialAvatarPenetrations:avatarA.penetrating,
    candidateAvatarPenetrations:avatarB.penetrating,
    initialStaticSelfIntersections:selfA.intersectingTrianglePairs,
    candidateStaticSelfIntersections:selfB.intersectingTrianglePairs,
    initialInterpanelPotentialContacts:interA.possibleContactPairs,
    candidateInterpanelPotentialContacts:interB.possibleContactPairs,
    materialFidelityApproved:perPanel.every(p=>p.approved),
    perPanel:perPanel.map(({id,approved,maximumRelativeEdgeDriftPercent,
      maximumInteriorDisplacementMm,beforeSlivers,afterSlivers})=>({id,approved,
      maximumRelativeEdgeDriftPercent,maximumInteriorDisplacementMm,
      beforeSlivers,afterSlivers})),
    candidateBuildMs:+buildMs.toFixed(2),sourceNonmutation:true,
    physicallyFitted:false,avatarEntryCertified:false}))
})
