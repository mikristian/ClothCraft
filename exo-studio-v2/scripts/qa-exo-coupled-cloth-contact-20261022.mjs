import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {auditNativeCoupledClothTrajectory} from '../src/core/backends/nativeCoupledClothContactResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'
import {discoverNativeDevelopableHinges,
  createNativeDevelopableHingeCandidate} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeFacePairRestTopology} from '../src/core/backends/nativeClothContactTopologyResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'

const rectangle=(left,right,low=0,high=1)=>[
  [left,low,0],[(left+right)/2,low,0],[right,low,0],
  [left,high,0],[(left+right)/2,high,0],[right,high,0],
]
// Fan triangulation: every face touches vertex 4, so the two halves can
// hinge without unrelated same-panel swept-box false positives.
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
function fixture({obstacle=false}={}){
  const front=rectangle(0,1)
  const back=obstacle?rectangle(.07,.1,.4,.6):rectangle(0,1)
  const backZ=obstacle?.235:1.5
  return {
    particles:[...front,...back.map(([x,y])=>[x,y,backZ])].map(position=>({
      position,invMass:1,
    })),
    pieces:[
      {id:'front',faces:faces.map(x=>[...x]),flatVerticesM:front,
        particleIndices:[0,1,2,3,4,5]},
      {id:'back',faces:faces.map(x=>[...x]),flatVerticesM:back,
        particleIndices:[6,7,8,9,10,11]},
    ],
    constraints:[{type:'seam',seamId:'join',a:0,b:6},
      {type:'seam',seamId:'join',a:3,b:9}],virtualSeams:[],
  }
}
const first={panelId:'front',axisVertices:[1,4],side:'positive'}
const second={panelId:'back',axisVertices:[1,4],side:'positive'}
const clear=pose=>({checked:pose.pieces.reduce((n,p)=>
  n+p.particleIndices.length+p.faces.length,0),
  penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true})
const run=(source,overrides={})=>auditNativeCoupledClothTrajectory(source,{
  first,second,firstAngleRadians:.3,secondAngleRadians:-.3,
  steps:4,checkPose:clear,...overrides,
})

test('two separated isometric folds pass when no nonadjacent swept self pairs exist',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const result=run(source)
  assert.equal(result.endpointSamples,3)
  assert.equal(result.intermediateSamples,6)
  assert.equal(result.samples.length,9)
  assert.equal(result.contactClear,true)
  assert.equal(result.materialValid,true)
  assert.equal(result.anchorsValid,true)
  assert.equal(result.researchScreenPassed,true)
  assert.ok(result.after.maxGapMm<result.before.maxGapMm)
  assert.ok(result.after.rmsGapMm<result.before.rmsGapMm)
  assert.equal(result.maximumPrincipalExtensionPercent<1e-8,true)
  assert.equal(result.intrapanelIntersections,0)
  assert.equal(result.possibleInterpanelContacts,0)
  assert.equal(result.possibleSweptInterpanelContacts,0)
  assert.ok(result.checkedSweptInterpanelPairs>0)
  assert.equal(result.checkedSweptIntrapanelPairs,0)
  assert.equal(result.possibleSweptIntrapanelContacts,0)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('coupled hinge candidate vetoes a near-flat shared-edge fold-back at a sampled pose',()=>{
  const source=fixture()
  // Front faces [0,1,4] and [0,4,3] share edge [0,4]. Move the
  // opposite vertex inside the first projected face, 0.4 mm off-plane.
  source.particles[3].position=[.35,.35,.0004]
  const frozen=JSON.stringify(source)
  const staticAudit=inspectNativeIntrapanelStaticContact(source,{clearanceM:.001})
  assert.equal(staticAudit.intersectingEdgeNeighborPairs,0)
  assert.ok(staticAudit.edgeNeighborNearFoldoverPairs>0)
  const result=run(source,{firstAngleRadians:0,secondAngleRadians:0,steps:2})
  assert.ok(result.edgeNeighborNearFoldoverPairs>0)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('coupled hinge candidate rejects submillimetre separation of disconnected same-panel faces',()=>{
  const source=fixture()
  const patch=[[.1,.2,0],[.2,.2,0],[.15,.3,0]]
  source.pieces[0].flatVerticesM.push(...patch)
  source.pieces[0].particleIndices.push(12,13,14)
  source.pieces[0].faces.push([6,7,8])
  source.particles.push(...patch.map(([x,y])=>({
    position:[x,y,.0004],invMass:1,
  })))
  const frozen=JSON.stringify(source)
  const staticAudit=inspectNativeIntrapanelStaticContact(source,{clearanceM:.001})
  assert.equal(staticAudit.intersectingTrianglePairs,0)
  assert.ok(staticAudit.nonadjacentNearClearancePairs>0)
  const result=run(source,{firstAngleRadians:0,secondAngleRadians:0,steps:2})
  assert.ok(result.nonadjacentNearClearancePairs>0)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.clothThicknessCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('swept separating axes eliminate independently clear AABB false positives',()=>{
  const source=fixture()
  // Two geometrically separated faces have overlapping AABBs near the fold.
  // Their static triangle narrowphase still reports no intersection.
  const alternate=[[0,1,4],[0,4,3],[1,2,5],[1,5,4]]
  for(const piece of source.pieces)piece.faces=alternate.map(face=>[...face])
  const frozen=JSON.stringify(source)
  const result=run(source)
  assert.equal(result.intrapanelIntersections,0)
  assert.equal(result.possibleInterpanelContacts,0)
  assert.ok(result.sweptIntrapanelAabbPotentials>0)
  assert.ok(result.sweptIntrapanelAxisSeparations>0)
  assert.equal(result.sweptIntrapanelAxisSeparations+
    result.sweptIntrapanelRigidSeparations+
    result.possibleSweptIntrapanelContacts,result.sweptIntrapanelAabbPotentials)
  assert.equal(result.possibleSweptIntrapanelContacts,0)
  assert.equal(result.contactClear,true)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('same-side rigid hinge motion preserves separated triangle pairs throughout a fold',()=>{
  const source=fixture()
  // A disconnected material patch is 60 mm above the main panel. Both
  // triangles rotate on the same side of the hinge, so their exact relative
  // separation cannot change, even when their swept AABBs overlap.
  const patch=[[.08,.42,0],[.22,.42,0],[.15,.58,0]]
  source.pieces[0].flatVerticesM.push(...patch)
  source.pieces[0].particleIndices.push(12,13,14)
  source.pieces[0].faces.push([6,7,8])
  source.particles.push(...patch.map(([x,y])=>({
    position:[x,y,.06],invMass:1,
  })))
  const frozen=JSON.stringify(source)
  assert.equal(inspectNativeIntrapanelStaticContact(source).intersectingTrianglePairs,0)
  const result=run(source,{firstAngleRadians:2.8,secondAngleRadians:0,steps:2})
  assert.ok(result.sweptIntrapanelAabbPotentials>0)
  assert.ok(result.sweptIntrapanelRigidSeparations>0,
    'Co-rotating triangles must receive a time-invariant separation certificate')
  assert.equal(result.sweptIntrapanelAxisSeparations+
    result.sweptIntrapanelRigidSeparations+
    result.possibleSweptIntrapanelContacts,result.sweptIntrapanelAabbPotentials)
  assert.equal(JSON.stringify(source),frozen)
  assert.equal(result.sweptCollisionCertified,false)
})

test('stationary coplanar overlap reports zero gap without clearing the contact veto',()=>{
  const source=fixture()
  // An independent triangle sits inside the stationary right half of front.
  // It is not a sewn neighbor and must not be accepted as clear merely
  // because the interval sweep's AABB also overlaps.
  const patch=[[.7,.2,0],[.8,.2,0],[.75,.3,0]]
  source.pieces[0].flatVerticesM.push(...patch)
  source.pieces[0].particleIndices.push(12,13,14)
  source.pieces[0].faces.push([6,7,8])
  source.particles.push(...patch.map(position=>({position,invMass:1})))
  const frozen=JSON.stringify(source)
  const result=run(source,{firstAngleRadians:.3,secondAngleRadians:0,steps:2})
  assert.ok(result.intrapanelIntersections>0)
  assert.ok(result.sweptIntrapanelUnresolvedExamples.some(x=>
    x.panelId==='front'&&x.stationaryCoplanarGapMm===0))
  assert.equal(result.contactClear,false)
  assert.equal(result.fitCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('rest-topology diagnosis distinguishes near neighbors from disconnected overlaps without granting clearance',()=>{
  const piece={flatVerticesM:[[0,0,0],[1,0,0],[0,1,0],
    [1,1,0],[.1,.1,0],[.2,.1,0],[.1,.2,0]],
    faces:[[0,1,2],[1,3,2],[4,5,6]]}
  const frozen=JSON.stringify(piece)
  const nearby=inspectNativeFacePairRestTopology(piece,0,1)
  assert.equal(nearby.minimumMaterialEdgeHops,0)
  assert.equal(nearby.illConditionedRestFaces,0)
  assert.equal(nearby.clearanceExemptionGranted,false)
  const oneHop={flatVerticesM:[[0,0,0],[1,0,0],[0,1,0],
    [1,1,0],[2,1,0],[2,2,0]],
    faces:[[0,1,2],[1,3,2],[3,4,5]]}
  assert.equal(inspectNativeFacePairRestTopology(oneHop,0,2)
    .minimumMaterialEdgeHops,1,
  'Nonadjacent triangles can be one mesh edge apart through a third face')
  const disconnected=inspectNativeFacePairRestTopology(piece,0,2)
  assert.equal(disconnected.minimumMaterialEdgeHops,null)
  assert.equal(disconnected.clearanceExemptionGranted,false)
  assert.equal(JSON.stringify(piece),frozen)
  assert.throws(()=>inspectNativeFacePairRestTopology(piece,0,99),/Invalid cloth-contact/)
})

test('swept self boxes detect a same-panel crossing missed by every sampled pose',()=>{
  const source=fixture()
  // The extra disconnected triangle strip is part of FRONT, not BACK.
  // It stays on the stationary material side of the x=0.5 hinge. The
  // moving left half crosses it near 2.16 rad but misses at 0, 1.4, 2.8.
  const patch=rectangle(.59,.61,.4,.6)
  source.pieces[0].flatVerticesM.push(...patch)
  source.pieces[0].particleIndices.push(...patch.map((_,i)=>12+i))
  source.pieces[0].faces.push(...faces.map(face=>face.map(i=>i+6)))
  source.particles.push(...patch.map(([x,y])=>({
    position:[x,y,.15],invMass:1,
  })))
  const frozen=JSON.stringify(source)
  // Independent analytic witness for the rotating sheet:
  // x=0.5-d*cos(theta), z=d*sin(theta), with theta in (pi/2,pi).
  const hiddenAngle=Math.PI-Math.atan2(.15,.1)
  const d=.15/Math.sin(hiddenAngle)
  assert.ok(Math.abs(.5-d*Math.cos(hiddenAngle)-.6)<1e-10)
  assert.ok(d<.5)
  const witness=createNativeDevelopableHingeCandidate(source,{
    ...first,angleRadians:hiddenAngle}).candidate
  assert.ok(inspectNativeIntrapanelStaticContact(witness).intersectingTrianglePairs>0,
    'Independent triangle narrowphase must confirm the hidden self intersection')
  const result=run(source,{firstAngleRadians:2.8,
    secondAngleRadians:0,steps:2})
  assert.equal(result.samples.every(s=>s.intrapanelIntersections===0),true)
  assert.equal(result.intrapanelIntersections,0)
  assert.ok(result.possibleSweptIntrapanelContacts>0)
  assert.ok(result.sweptIntrapanelUnresolvedExamples.length>0)
  assert.ok(result.sweptIntrapanelUnresolvedExamples.length<=16)
  assert.ok(result.sweptIntrapanelUnresolvedExamples.every(x=>
    typeof x.panelId==='string'&&Number.isInteger(x.faceA)&&
    Number.isInteger(x.faceB)&&x.faceA<x.faceB&&
    x.fractionStart<x.fractionEnd))
  assert.ok(result.sweptIntrapanelAabbPotentials>=
    result.possibleSweptIntrapanelContacts)
  assert.equal(result.sweptIntrapanelAxisSeparations+
    result.sweptIntrapanelRigidSeparations+
    result.possibleSweptIntrapanelContacts,result.sweptIntrapanelAabbPotentials)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('conservative hinge-interval boxes reject cloth contact hidden between arc samples',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  // The left half of the front folds around the Y axis. At angle ~0.3 rad
  // its moving edge crosses this small obstacle at x~0.02, z~0.15. The
  // sampled angles 0, 0.6 and 1.2 rad all miss the obstacle entirely.
  const patch=rectangle(.01,.04,.4,.6)
  source.pieces[1].flatVerticesM=patch
  source.particles.splice(6,6,...patch.map(([x,y])=>({
    position:[x,y,.15],invMass:1,
  })))
  const frozenObstacle=JSON.stringify(source)
  // Independent analytic intersection witness, not merely an AABB overlap:
  // the rotated front half lies on z=(0.5-x)*tan(angle), and its left edge
  // is x=0.5-0.5*cos(angle). At angle 0.31, the z=0.15 obstacle plane cuts
  // the actual front triangle interior within the obstacle's X/Y footprint.
  const hiddenAngle=.31
  const hitX=.5-.15/Math.tan(hiddenAngle)
  assert.ok(hitX>.01&&hitX<.04)
  assert.ok(hitX>.5-.5*Math.cos(hiddenAngle))
  const result=run(source,{firstAngleRadians:1.2,
    secondAngleRadians:0,steps:2})
  assert.equal(result.samples.every(sample=>
    sample.interpanelPotentialContacts===0),true)
  assert.equal(result.possibleInterpanelContacts,0)
  assert.ok(result.possibleSweptInterpanelContacts>0)
  assert.equal(result.sweptInterpanelAxisSeparations+
    result.possibleSweptInterpanelContacts,result.sweptInterpanelAabbPotentials)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(source),frozenObstacle)
  assert.notEqual(JSON.stringify(source),frozen)
})

test('curved intermediate interpanel contact vetoes a pose with clear endpoints',()=>{
  const source=fixture({obstacle:true}),frozen=JSON.stringify(source)
  const result=run(source,{firstAngleRadians:1,secondAngleRadians:0,steps:4})
  assert.equal(result.samples.filter(s=>s.kind==='endpoint'||s.kind==='initial')
    .every(s=>s.interpanelPotentialContacts===0),true)
  assert.ok(result.samples.some(s=>s.kind==='hinge-arc'&&
    s.interpanelPotentialContacts>0))
  assert.ok(result.possibleInterpanelContacts>0)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('moving a soft-anchor constrained axis vetoes a contact-clear hinge',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  source.anchors=[{particle:0,target:[0,0,0],axes:'z',stiffness:.8}]
  const frozenAnchored=JSON.stringify(source)
  const result=run(source)
  assert.equal(result.contactClear,true)
  assert.equal(result.anchorsValid,false)
  assert.ok(result.maximumAnchorDisplacementMm>1)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(JSON.stringify(source),frozenAnchored)
  assert.notEqual(JSON.stringify(source),frozen)
})

test('invalid coverage, malformed anchors and pair budget fail closed',()=>{
  const source=fixture()
  assert.throws(()=>run(source,{checkPose:pose=>({...clear(pose),checked:1})}),
    /Incomplete coupled cloth avatar/)
  assert.throws(()=>run(source,{maxTotalPairs:1}),/total pair budget/)
  assert.throws(()=>run(source,{maxTotalPairs:150,steps:2}),
    /total pair budget/,'Interval checks must count against the budget')
  assert.throws(()=>run(source,{maxTotalPairs:230,steps:2}),
    /total pair budget/,'Same-panel swept intervals must also count against the budget')
  assert.throws(()=>run(source,{steps:9}),/2\.\.8/)
  source.anchors=[{particle:0,target:[0,0,0],axes:'xx',stiffness:1}]
  assert.throws(()=>run(source),/Invalid coupled-cloth anchor/)
})

test('real four-panel stationary face pairs have submillimetre rest clearance',()=>{
  const project=createTemplateProject('tee')
  const native=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
  })
  const search=searchNativeOffbodyRestSeeds(native,{
    offsetsM:[.35],checkPose:inspectStagedAvatarContact,
  })
  assert.equal(search.best,null,'Thickness-unsafe rest seed must not be accepted')
  assert.equal(search.results[0].intrapanelNonadjacentNearClearancePairs,2)
  const seed=rejectedOffbodyDiagnosticPose(native)
  const frozen=JSON.stringify(seed)
  const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))
  const pointSegment=(point,a,b)=>{
    const direction=b.map((x,i)=>x-a[i])
    const denom=direction.reduce((n,x)=>n+x*x,0)
    assert.ok(denom>0)
    const t=Math.max(0,Math.min(1,direction.reduce((n,x,i)=>
      n+x*(point[i]-a[i]),0)/denom))
    return distance(point,a.map((x,i)=>x+t*direction[i]))
  }
  for(const [panelId,faceA,faceB] of [
    ['front',23,115],['back',16,23],
  ]){
    const panel=seed.pieces.find(p=>p.id===panelId)
    const indices=[panel.faces[faceA],panel.faces[faceB]]
    assert.equal(indices[0].some(i=>indices[1].includes(i)),false)
    const triangles=indices.map(face=>face.map(i=>
      seed.particles[panel.particleIndices[i]].position))
    assert.ok(triangles.flat().every(p=>
      Math.abs(p[2]-triangles[0][0][2])<1e-12))
    let minimumM=Infinity
    for(const [points,other] of [triangles,[...triangles].reverse()])
      for(const point of points)for(let edge=0;edge<3;edge++)
        minimumM=Math.min(minimumM,pointSegment(point,
          other[edge],other[(edge+1)%3]))
    assert.ok(Math.abs(minimumM*1000-.3763765687248245)<1e-6)
    assert.ok(minimumM>0&&minimumM<.001,
      'Rest faces violate the 1 mm clearance requirement')
  }
  assert.equal(JSON.stringify(seed),frozen)
})

test('real four-panel off-body two-hinge motion is measured but not promoted',()=>{
  const project=createTemplateProject('tee'),frozenProject=JSON.stringify(project)
  const native=buildNativeSimulationPayload(project,{
    quality:'quality',experimentalOptimizeMesh:true,
  }),frozenNative=JSON.stringify(native)
  const search=searchNativeOffbodyRestSeeds(native,{
    offsetsM:[.35],checkPose:inspectStagedAvatarContact,
  })
  assert.equal(search.best,null,'Rest seed now fails finite-thickness clearance')
  assert.equal(search.results[0].intrapanelNonadjacentNearClearancePairs,2)
  const seed=rejectedOffbodyDiagnosticPose(native)
  const frozenSeed=JSON.stringify(seed)
  const hinges=discoverNativeDevelopableHinges(seed,{maxResults:128}).returned
  const pick=id=>hinges.find(h=>h.panelId===id&&h.worldAxisAligned)
  const started=performance.now()
  const result=auditNativeCoupledClothTrajectory(seed,{
    first:pick('sleeve-left'),second:pick('sleeve-right'),
    firstAngleRadians:.15,secondAngleRadians:-.15,
    steps:3,checkPose:inspectStagedAvatarContact,
  })
  const runtimeMs=performance.now()-started
  assert.equal(seed.pieces.length,4)
  assert.equal(result.samples.length,7)
  assert.equal(result.contactClear,false)
  assert.ok(result.nonadjacentNearClearancePairs>0)
  assert.ok(result.possibleSweptIntrapanelContacts>0)
  assert.equal(result.edgeNeighborNearFoldoverPairs,0,
    'Current off-body four-panel failure is from swept nonadjacent contacts, not the new hinge warning')
  assert.ok(result.sweptIntrapanelAxisSeparations>0,
    'Real four-panel motion should have certifiably separated false positives')
  assert.equal(result.sweptIntrapanelUnresolvedExamples.length,12)
  assert.deepEqual([...new Set(result.sweptIntrapanelUnresolvedExamples.map(x=>
    `${x.panelId}:${x.faceA}:${x.faceB}`))].sort(),
    ['back:16:23','front:23:115'],
    'The unresolved screen must expose the actual persistent face pairs')
  for(const example of result.sweptIntrapanelUnresolvedExamples){
    assert.ok(Math.abs(example.stationaryCoplanarGapMm-.3763765687248245)<1e-6)
    assert.ok(Math.abs(example.stationaryClearanceDeficitMm-
      .6236234312751755)<1e-6)
    assert.equal(example.minimumMaterialEdgeHops,1,
      'The persistent near-clearance pairs lie one material mesh edge apart')
    assert.equal(example.illConditionedRestFaces,1,
      'Each pair contains one unresolved sliver triangle')
    assert.equal(example.clearanceExemptionGranted,false)
    assert.ok(example.restFaceAltitudesMm.some(x=>
      Math.abs(x-.28164)<.0001))
    assert.ok(example.restFaceAspectRatios.some(x=>x>49&&x<50))
  }
  assert.equal(result.materialValid,true)
  assert.ok(result.meshConditioning.illConditionedFaces>0,
    'An isometric pose does not repair the existing poorly conditioned rest triangles')
  assert.ok(result.after.rmsGapMm>result.before.rmsGapMm)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.fitCertified,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(project),frozenProject)
  assert.equal(JSON.stringify(native),frozenNative)
  assert.equal(JSON.stringify(seed),frozenSeed)
  console.log('FOUR_PANEL_COUPLED_CLOTH_RESEARCH '+JSON.stringify({
    initialMaxGapMm:result.before.maxGapMm,initialRmsGapMm:result.before.rmsGapMm,
    candidateMaxGapMm:result.after.maxGapMm,candidateRmsGapMm:result.after.rmsGapMm,
    maximumPrincipalExtensionPercent:result.maximumPrincipalExtensionPercent,
    maximumPrincipalCompressionPercent:result.maximumPrincipalCompressionPercent,
    avatarPenetrations:result.avatarPenetrations,
    edgeNeighborNearFoldoverPairs:result.edgeNeighborNearFoldoverPairs,
    interpanelPotentialContacts:result.possibleInterpanelContacts,
    sweptInterpanelPotentialContacts:result.possibleSweptInterpanelContacts,
    sweptInterpanelAabbPotentials:result.sweptInterpanelAabbPotentials,
    sweptInterpanelAxisSeparations:result.sweptInterpanelAxisSeparations,
    checkedSweptInterpanelPairs:result.checkedSweptInterpanelPairs,
    sweptIntrapanelPotentialContacts:result.possibleSweptIntrapanelContacts,
    sweptIntrapanelAabbPotentials:result.sweptIntrapanelAabbPotentials,
    sweptIntrapanelAxisSeparations:result.sweptIntrapanelAxisSeparations,
    sweptIntrapanelRigidSeparations:result.sweptIntrapanelRigidSeparations,
    sweptIntrapanelUnresolvedExamples:result.sweptIntrapanelUnresolvedExamples,
    checkedSweptIntrapanelPairs:result.checkedSweptIntrapanelPairs,
    intrapanelIntersections:result.intrapanelIntersections,
    checkedInterpanelPairs:result.checkedInterpanelPairs,
    checkedIntrapanelPairs:result.checkedIntrapanelPairs,
    illConditionedRestTriangles:result.meshConditioning.illConditionedFaces,
    contactClear:result.contactClear,materialValid:result.materialValid,
    maximumAnchorDisplacementMm:result.maximumAnchorDisplacementMm,
    researchScreenPassed:result.researchScreenPassed,
    runtimeMs:+runtimeMs.toFixed(2),stateUnchanged:true,
    sweptCollisionCertified:false,fitCertified:false,
  }))
})
