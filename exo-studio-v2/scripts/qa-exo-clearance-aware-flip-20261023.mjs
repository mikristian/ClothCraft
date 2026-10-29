// Independent research QA: local material-preserving topology can eliminate
// static submillimetre fold-clearance defects without moving a single vertex.
// The resulting face list is NOT solver-ready until springs are regenerated.
import assert from 'node:assert/strict'
import test from 'node:test'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'

const mesh={vertices:[[0,0],[2,0],[2,2],[0,2],[.9,.9],[1.1,.9],[1,1.1]],
  faces:[[0,1,2],[0,2,3],[4,5,6]]}
const world=[[0,0,0],[.02,0,0],[.02,.02,.004],[0,.02,0],
  [.009,.009,.0024],[.011,.009,.0024],[.01,.011,.0024]]
const frozen=x=>JSON.stringify(x)
const independentStatic=(faces,positions)=>inspectNativeIntrapanelStaticContact({
  particles:positions.map(position=>({position})),
  pieces:[{id:'independent',particleIndices:positions.map((_,i)=>i),faces}],
})
const structuralEdges=payload=>new Set(payload.pieces.flatMap(piece=>
  piece.faces.flatMap(([a,b,c])=>[[a,b],[b,c],[c,a]].map(([i,j])=>{
    const x=piece.particleIndices[i],y=piece.particleIndices[j]
    return [x,y].sort((u,v)=>u-v).join(':')
  }))))
const originalSpringEdges=payload=>new Set(payload.constraints.filter(c=>
  c.type==='structural').map(c=>[c.a,c.b].sort((a,b)=>a-b).join(':')))
const poorRestFaces=payload=>payload.pieces.reduce((sum,piece)=>sum+
  piece.faces.filter(face=>{
    const [a,b,c]=face.map(i=>piece.flatVerticesM[i])
    const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
    const altitude=Math.abs((b[0]-a[0])*(c[1]-a[1])-
      (b[1]-a[1])*(c[0]-a[0]))/longest
    return altitude<.002||longest/altitude>25
  }).length,0)

test('warped quad: a certified edge flip clears a real near contact without moving world/material vertices',()=>{
  const oldMesh=frozen(mesh),oldWorld=frozen(world)
  const before=independentStatic(mesh.faces,world)
  assert.equal(before.nonadjacentNearClearancePairs,2)
  const result=searchNativeClearanceAwareMaterialFlips(mesh,world)
  assert.ok(result.best)
  assert.equal(result.before.nearClearancePairs,2)
  assert.equal(result.after.nearClearancePairs,0)
  assert.equal(result.after.intersections,0)
  assert.equal(result.after.nearFoldovers,0)
  assert.equal(result.best.certificate.materialBoundaryUnchanged,true)
  assert.equal(result.best.certificate.approved,true)
  assert.deepEqual(result.best.mesh.vertices,mesh.vertices)
  assert.equal(independentStatic(result.best.mesh.faces,world).nonadjacentNearClearancePairs,0)
  assert.equal(result.constraintsRegenerated,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(frozen(mesh),oldMesh)
  assert.equal(frozen(world),oldWorld)
})

test('protected diagonal vetoes the only synthetic repair, and search remains bounded',()=>{
  const blocked=searchNativeClearanceAwareMaterialFlips(mesh,world,{
    protectedEdges:[[0,2]],maxCandidates:1})
  assert.equal(blocked.best,null)
  assert.equal(blocked.before.nearClearancePairs,2)
  assert.equal(blocked.scanned,0)
  const noTarget=searchNativeClearanceAwareMaterialFlips(mesh,world,{targetFaces:[]})
  assert.equal(noTarget.best,null)
  assert.equal(noTarget.scanned,0)
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(mesh,world,{maxCandidates:65}),/bounded/)
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(mesh,world,{maxPairs:1}),/budget/)
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(mesh,world,{
    protectedEdges:[[0,999]]}),/protected/)
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(mesh,world,{
    targetFaces:[999]}),/target/)
})

test('invalid geometry and nonmanifold faces fail closed without source mutation',()=>{
  const before=frozen(mesh),worldBefore=frozen(world)
  const invalid=structuredClone(mesh);invalid.faces[0]=[0,0,2]
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(invalid,world),/triangle/)
  const nonmanifold=structuredClone(mesh);nonmanifold.faces.push([2,0,4])
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(nonmanifold,world),/Nonmanifold/)
  const badWorld=structuredClone(world);badWorld[0]=[Infinity,0,0]
  assert.throws(()=>searchNativeClearanceAwareMaterialFlips(mesh,badWorld),/coordinates/)
  assert.equal(frozen(mesh),before)
  assert.equal(frozen(world),worldBefore)
})

test('actual four-panel off-body research pose: two protected local flips eliminate static near-clearance witnesses',()=>{
  const project=createTemplateProject('tee'),projectBefore=frozen(project)
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalBefore=frozen(original)
  const discovered=discoverNativeDevelopableHinges(original,{maxResults:128})
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=discovered.returned.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge,`Missing protected hinge on ${piece.id}`)
    return [piece.id,[hinge.axisVertices]]
  }))
  const payload=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes,
    experimentalCertifiedPoorFaceFlips:true})
  const payloadBefore=frozen(payload)
  const pose=rejectedOffbodyDiagnosticPose(payload),poseBefore=frozen(pose)
  const before=inspectNativeIntrapanelStaticContact(pose)
  const beforeStrain=auditNativePrincipalStrain(pose)
  const beforeSeams=measureNativeSeamResiduals(pose)
  const beforeAvatar=inspectStagedAvatarContact(pose)
  const beforeInterpanel=inspectNativeInterpanelExactStaticContact(pose)
  const beforePoor=poorRestFaces(pose)
  assert.equal(before.nonadjacentNearClearancePairs,2)
  assert.equal(before.intersectingTrianglePairs,0)
  assert.equal(beforeStrain.withinDeclaredStrainLimit,true)
  const diagnostic=structuredClone(pose)
  let scans=0,certified=0,checks=0
  const start=performance.now()
  for(const piece of diagnostic.pieces.filter(p=>['front','back'].includes(p.id))){
    const panelMesh={vertices:piece.flatVerticesM.map(p=>[p[0]*100,p[1]*100]),
      faces:piece.faces.map(face=>face.slice())}
    const protectedEdges=materialHingeProtectedEdges(panelMesh,axes[piece.id][0])
    const worldPositionsM=piece.particleIndices.map(i=>diagnostic.particles[i].position)
    const result=searchNativeClearanceAwareMaterialFlips(panelMesh,worldPositionsM,{
      protectedEdges,maxCandidates:12})
    assert.ok(result.best,`Expected research-only clearance improvement for ${piece.id}`)
    assert.equal(result.before.nearClearancePairs,1)
    assert.equal(result.after.nearClearancePairs,0)
    assert.equal(result.best.certificate.materialBoundaryUnchanged,true)
    assert.equal(result.constraintsRegenerated,false)
    piece.faces=result.best.mesh.faces
    scans+=result.scanned;certified+=result.certified;checks+=result.contactChecked
  }
  const elapsedMs=performance.now()-start
  const after=inspectNativeIntrapanelStaticContact(diagnostic)
  const afterStrain=auditNativePrincipalStrain(diagnostic)
  const afterSeams=measureNativeSeamResiduals(diagnostic)
  const afterAvatar=inspectStagedAvatarContact(diagnostic)
  const afterInterpanel=inspectNativeInterpanelExactStaticContact(diagnostic)
  const afterPoor=poorRestFaces(diagnostic)
  const springs=originalSpringEdges(diagnostic)
  const expected=structuralEdges(diagnostic)
  const staleStructuralEdges=[...springs].filter(x=>!expected.has(x)).length
  const missingStructuralEdges=[...expected].filter(x=>!springs.has(x)).length
  assert.deepEqual(structuralEdges(pose),originalSpringEdges(pose),
    'Baseline native structural graph should be current')
  assert.ok(staleStructuralEdges>0&&missingStructuralEdges>0,
    'Proposed faces must not be treated as solver-ready with stale springs')
  assert.equal(after.nonadjacentNearClearancePairs,0)
  assert.equal(after.intersectingTrianglePairs,0)
  assert.equal(after.edgeNeighborNearFoldoverPairs,0)
  assert.equal(after.staticDisjointThicknessScreenClear,true)
  assert.equal(afterStrain.withinDeclaredStrainLimit,true)
  assert.ok(Math.abs(afterStrain.maximumPrincipalExtensionPercent-
    beforeStrain.maximumPrincipalExtensionPercent)<1e-7)
  assert.equal(afterSeams.maxGapMm,beforeSeams.maxGapMm)
  assert.equal(afterSeams.rmsGapMm,beforeSeams.rmsGapMm)
  assert.equal(afterAvatar.penetrating,beforeAvatar.penetrating)
  assert.equal(afterInterpanel.nearClearancePairs,beforeInterpanel.nearClearancePairs)
  assert.ok(afterPoor<=beforePoor,'Contact repair must not increase ill-conditioned rest faces')
  assert.equal(frozen(project),projectBefore)
  assert.equal(frozen(original),originalBefore)
  assert.equal(frozen(payload),payloadBefore)
  assert.equal(frozen(pose),poseBefore)
  console.log('FOUR_PANEL_CLEARANCE_RESEARCH '+JSON.stringify({
    beforeNearPairs:before.nonadjacentNearClearancePairs,
    afterNearPairs:after.nonadjacentNearClearancePairs,
    beforeMaxGapMm:beforeSeams.maxGapMm,afterMaxGapMm:afterSeams.maxGapMm,
    beforeRmsGapMm:beforeSeams.rmsGapMm,afterRmsGapMm:afterSeams.rmsGapMm,
    maxPrincipalExtensionPercent:afterStrain.maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:afterStrain.maximumPrincipalCompressionPercent,
    sampledAvatarPenetrations:afterAvatar.penetrating,
    interpanelNearPairs:afterInterpanel.nearClearancePairs,
    poorRestFacesBefore:beforePoor,poorRestFacesAfter:afterPoor,
    staleStructuralEdges,missingStructuralEdges,
    scans,certified,contactChecks:checks,elapsedMs:+elapsedMs.toFixed(2),
    originalStateUnchanged:true,constraintsRegenerated:false,
    fitCertified:false,sweptCollisionCertified:false,
  }))
})
