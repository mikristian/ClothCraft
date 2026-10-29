// Independent research-only rest-clearance localization. No native build,
// garment mutation, application changes or acceptance threshold relaxation.
import assert from 'node:assert/strict'
import test from 'node:test'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'

const synthetic=gap=>({
  particles:[[0,0,0],[1,0,0],[0,1,0],
    [.2,.2,gap],[.5,.2,gap],[.2,.5,gap]]
    .map(position=>({position:[...position],invMass:1})),
  pieces:[{id:'sample',particleIndices:[0,1,2,3,4,5],
    faces:[[0,1,2],[3,4,5]]}],
})

test('bounded witnesses identify true disjoint submillimetre pairs without certifying fit',()=>{
  const near=synthetic(.0004),frozen=JSON.stringify(near)
  const report=inspectNativeIntrapanelStaticContact(near,{clearanceM:.001})
  assert.equal(report.nonadjacentNearClearancePairs,1)
  assert.ok(Math.abs(report.minimumNearClearanceMm-.4)<1e-9)
  assert.deepEqual(report.nearClearanceExamples.map(({pieceId,faceA,faceB,materialFaceEdgeHops})=>
    ({pieceId,faceA,faceB,materialFaceEdgeHops})),[
    {pieceId:'sample',faceA:0,faceB:1,materialFaceEdgeHops:null},
  ])
  assert.ok(Math.abs(report.nearClearanceExamples[0].distanceMm-.4)<1e-9)
  assert.equal(report.staticDisjointThicknessScreenClear,false)
  assert.equal(report.clothThicknessClearanceCertified,false)
  assert.equal(report.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(near),frozen)
  for(const gap of [.002,.01]){
    const clear=inspectNativeIntrapanelStaticContact(synthetic(gap),{clearanceM:.001})
    assert.equal(clear.nonadjacentNearClearancePairs,0)
    assert.equal(clear.minimumNearClearanceMm,null)
    assert.deepEqual(clear.nearClearanceExamples,[])
  }
})

test('material-edge witness refuses nonmanifold input instead of inventing hop distances',()=>{
  const source={particles:[[0,0,0],[1,0,0],[0,1,0],[0,-1,0],[0,0,1]]
    .map(position=>({position})),pieces:[{id:'bad',
      particleIndices:[0,1,2,3,4],faces:[[0,1,2],[1,0,3],[0,1,4]]}]}
  const frozen=JSON.stringify(source)
  assert.throws(()=>inspectNativeIntrapanelStaticContact(source),/Nonmanifold/)
  assert.equal(JSON.stringify(source),frozen)
})

test('actual four-panel rejected off-body seed localizes two three-edge-hop clearance blockers',()=>{
  const project=createTemplateProject('tee'),projectFrozen=JSON.stringify(project)
  const source=buildNativeSimulationPayload(project,{quality:'quality'})
  const sourceFrozen=JSON.stringify(source)
  const hinges=discoverNativeDevelopableHinges(source,{maxResults:128})
  const axes=Object.fromEntries(source.pieces.map(piece=>{
    const hinge=hinges.returned.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge,`No protected hinge for ${piece.id}`)
    return [piece.id,[hinge.axisVertices]]
  }))
  for(const [label,options] of [
    ['optimized',{quality:'quality',experimentalOptimizeMesh:true}],
    ['certified-flip',{quality:'quality',experimentalOptimizeMesh:true,
      experimentalProtectedHingeAxesByPiece:axes,experimentalCertifiedPoorFaceFlips:true}],
  ]){
    const mesh=buildNativeSimulationPayload(project,options)
    const frozen=JSON.stringify(mesh)
    const pose=rejectedOffbodyDiagnosticPose(mesh)
    const poseFrozen=JSON.stringify(pose)
    const start=performance.now()
    const report=inspectNativeIntrapanelStaticContact(pose,{clearanceM:.001})
    const elapsedMs=performance.now()-start
    assert.equal(report.nonadjacentNearClearancePairs,2,label)
    assert.equal(report.intersectingTrianglePairs,0,label)
    assert.equal(report.edgeNeighborNearFoldoverPairs,0,label)
    assert.ok(Math.abs(report.minimumNearClearanceMm-.3763765687)<.000001,label)
    assert.deepEqual(report.nearClearanceExamples.map(x=>
      [x.pieceId,x.faceA,x.faceB,x.materialFaceEdgeHops])
      .sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),[
      ['back',16,23,3],['front',23,115,3],
    ],label)
    assert.equal(report.staticDisjointThicknessScreenClear,false)
    assert.equal(report.fitCertified,false)
    assert.equal(JSON.stringify(mesh),frozen)
    assert.equal(JSON.stringify(pose),poseFrozen)
    console.log('REST_CLEARANCE_WITNESS '+JSON.stringify({label,
      nearPairs:report.nonadjacentNearClearancePairs,
      minimumNearClearanceMm:report.minimumNearClearanceMm,
      examples:report.nearClearanceExamples,elapsedMs:+elapsedMs.toFixed(2),
      sourceNonmutation:true,fitCertified:false}))
  }
  assert.equal(JSON.stringify(project),projectFrozen)
  assert.equal(JSON.stringify(source),sourceFrozen)
})

test('off-body selector carries local clearance witnesses and still rejects unsafe seed',()=>{
  const project=createTemplateProject('tee'),source=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true})
  const frozen=JSON.stringify(source)
  const fakeAvatar=pose=>({sampledAvatarClearanceOnly:true,
    checked:pose.pieces.reduce((n,p)=>n+p.particleIndices.length+p.faces.length,0),
    penetrating:0,maximumIntrusionMm:0})
  const out=searchNativeOffbodyRestSeeds(source,{offsetsM:[.35],checkPose:fakeAvatar})
  assert.equal(out.best,null)
  assert.equal(out.restAndEndpointFeasible,false)
  assert.equal(out.results[0].intrapanelNonadjacentNearClearancePairs,2)
  assert.ok(Math.abs(out.results[0].intrapanelMinimumNearClearanceMm-.3763765687)<.000001)
  assert.deepEqual(out.results[0].intrapanelNearClearanceExamples.map(x=>x.materialFaceEdgeHops),[3,3])
  assert.equal(out.fitCertified,false)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})
