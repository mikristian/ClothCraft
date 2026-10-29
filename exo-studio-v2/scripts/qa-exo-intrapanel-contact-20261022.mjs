import assert from 'node:assert/strict'
import test from 'node:test'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'

const base=[[0,0,0],[1,0,0],[0,1,0]]
const triangles={
  coplanar:[[.2,.2,0],[.8,.2,0],[.2,.8,0]],
  crossing:[[.25,.25,-.1],[.25,.25,.1],[.75,.25,0]],
  aabbOnly:[[.8,.8,0],[1.5,.8,0],[.8,1.5,0]],
  touching:[[1,0,0],[2,0,0],[1,1,0]],
  separate:[[3,0,0],[4,0,0],[3,1,0]],
}
const payload=(a,b)=>({
  particles:[...a,...b].map(position=>({position:[...position],invMass:1})),
  pieces:[{id:'cloth',particleIndices:[0,1,2,3,4,5],
    faces:[[0,1,2],[3,4,5]]}],
})

test('independent triangle distance resolves static submillimetre cloth clearance',()=>{
  const above=z=>[[.2,.2,z],[.5,.2,z],[.2,.5,z]]
  assert.ok(Math.abs(measureNativeTriangleDistanceM(base,above(.0004))-.0004)<1e-12)
  assert.ok(Math.abs(measureNativeTriangleDistanceM(base,above(.002))-.002)<1e-12)
  assert.equal(measureNativeTriangleDistanceM(base,above(0)),0)
  assert.equal(measureNativeTriangleDistanceM(base,triangles.separate),2)
  assert.throws(()=>measureNativeTriangleDistanceM(base,[[0,0,0],[0,0,0],[1,0,0]]),
    /nondegenerate/)
  const near=payload(base,above(.0004)),frozen=JSON.stringify(near)
  const hit=inspectNativeIntrapanelStaticContact(near,{clearanceM:.001})
  assert.equal(hit.intersectingTrianglePairs,0)
  assert.equal(hit.nonadjacentNearClearancePairs,1)
  assert.equal(hit.staticNearFoldoverScreenClear,true)
  assert.equal(hit.staticDisjointThicknessScreenClear,false)
  assert.equal(hit.clothThicknessClearanceCertified,false)
  assert.equal(JSON.stringify(near),frozen)
  const far=inspectNativeIntrapanelStaticContact(payload(base,above(.002)),{
    clearanceM:.001})
  assert.equal(far.nonadjacentNearClearancePairs,0)
  assert.equal(far.staticDisjointThicknessScreenClear,true)
  assert.equal(inspectNativeIntrapanelStaticContact(near,{clearanceM:0})
    .nonadjacentNearClearancePairs,0)
})

test('independent coplanar overlap and noncoplanar crossing are detected',()=>{
  for(const key of ['coplanar','crossing']){
    const source=payload(base,triangles[key]),frozen=JSON.stringify(source)
    const out=inspectNativeIntrapanelStaticContact(source)
    assert.equal(out.checkedNonadjacentPairs,1)
    assert.equal(out.possibleAabbContactPairs,1)
    assert.equal(out.intersectingTrianglePairs,1,key)
    assert.equal(out.staticNonadjacentTriangleIntersectionsAbsent,false)
    assert.equal(out.fitCertified,false)
    assert.equal(out.sweptCollisionCertified,false)
    assert.equal(JSON.stringify(source),frozen)
  }
})

test('AABB false positives and mere boundary touching are NOT self-intersections',()=>{
  for(const key of ['aabbOnly','touching']){
    const out=inspectNativeIntrapanelStaticContact(payload(base,triangles[key]))
    assert.equal(out.possibleAabbContactPairs,1,key)
    assert.equal(out.intersectingTrianglePairs,0,key)
    assert.equal(out.staticNonadjacentTriangleIntersectionsAbsent,true)
    assert.equal(out.clothThicknessClearanceCertified,false)
  }
  const separated=inspectNativeIntrapanelStaticContact(payload(base,triangles.separate))
  assert.equal(separated.possibleAabbContactPairs,0)
  assert.equal(separated.intersectingTrianglePairs,0)
})

test('valid edge-adjacent faces share a boundary without coplanar fold-over',()=>{
  const adjacent={particles:[
    [0,0,0],[1,0,0],[0,1,0],[1,1,0],
  ].map(position=>({position})),
  pieces:[{id:'p',particleIndices:[0,1,2,3],faces:[[0,1,2],[1,3,2]]}]}
  const out=inspectNativeIntrapanelStaticContact(adjacent)
  assert.equal(out.checkedNonadjacentPairs,0)
  assert.equal(out.checkedEdgeNeighborPairs,1)
  assert.equal(out.checkedTotalPairs,1)
  assert.equal(out.intersectingTrianglePairs,0)
  assert.equal(out.edgeNeighborCoplanarFoldoverChecked,true)
  assert.equal(out.edgeAdjacentTrianglesExcluded,false)
})

test('shared-edge coplanar fold-over is rejected, but ordinary hinges are not',()=>{
  const fixture=z=>({particles:[
    [0,0,0],[2,0,0],[0,2,0],z,
  ].map(position=>({position:[...position]})),
  pieces:[{id:'fold',particleIndices:[0,1,2,3],faces:[[0,1,2],[0,1,3]]}]})
  const folded=fixture([.25,.5,0]),frozen=JSON.stringify(folded)
  const result=inspectNativeIntrapanelStaticContact(folded)
  assert.equal(result.checkedNonadjacentPairs,0)
  assert.equal(result.checkedEdgeNeighborPairs,1)
  assert.equal(result.intersectingEdgeNeighborPairs,1)
  assert.equal(result.intersectingTrianglePairs,1)
  assert.equal(result.fitCertified,false)
  assert.equal(JSON.stringify(folded),frozen)
  for(const fourth of [[0,-1,0],[0,-.5,.5]]){
    const clear=inspectNativeIntrapanelStaticContact(fixture(fourth))
    assert.equal(clear.checkedEdgeNeighborPairs,1)
    assert.equal(clear.intersectingEdgeNeighborPairs,0)
  }
  assert.throws(()=>inspectNativeIntrapanelStaticContact(folded,{maxPairs:0}),/work budget/)
})

test('near-flat shared-edge fold-back is flagged without mislabeling a static intersection',()=>{
  const fixture=opposite=>({particles:[
    [0,0,0],[2,0,0],[0,2,0],opposite,
  ].map(position=>({position:[...position]})),
  pieces:[{id:'fold',particleIndices:[0,1,2,3],faces:[[0,1,2],[0,1,3]]}]})
  const near=fixture([.25,.5,.0004]),frozen=JSON.stringify(near)
  const warning=inspectNativeIntrapanelStaticContact(near,{clearanceM:.001})
  assert.equal(warning.checkedEdgeNeighborPairs,1)
  assert.equal(warning.intersectingTrianglePairs,0)
  assert.equal(warning.edgeNeighborNearFoldoverPairs,1)
  assert.equal(warning.staticNearFoldoverScreenClear,false)
  assert.equal(warning.clothThicknessClearanceCertified,false)
  assert.equal(JSON.stringify(near),frozen)
  for(const opposite of [[.25,.5,.002],[.25,-.5,.0004],[.25,.5,.4]]){
    const result=inspectNativeIntrapanelStaticContact(fixture(opposite),{
      clearanceM:.001})
    assert.equal(result.edgeNeighborNearFoldoverPairs,0)
    assert.equal(result.staticNearFoldoverScreenClear,true)
  }
  assert.equal(inspectNativeIntrapanelStaticContact(near,{clearanceM:0})
    .edgeNeighborNearFoldoverPairs,0)
})

test('real four-panel near-foldover warnings remain opt-in and do not mutate source',()=>{
  const project=createTemplateProject('tee'),frozen=JSON.stringify(project)
  const counts=[]
  for(const flip of [false,true]){
    const payload=buildNativeSimulationPayload(project,{
      quality:'quality',experimentalOptimizeMesh:flip,
    }),saved=JSON.stringify(payload)
    const report=inspectNativeIntrapanelStaticContact(payload,{clearanceM:.001})
    assert.equal(report.checkedEdgeNeighborPairs,1040)
    assert.equal(report.clothThicknessClearanceCertified,false)
    assert.equal(JSON.stringify(payload),saved)
    counts.push(report.edgeNeighborNearFoldoverPairs)
  }
  assert.ok(counts[0]>0,'Protected baseline has actual near-flat fold-backs')
  assert.equal(counts[1],0,'Opt-in retriangulated pose has no near-flat fold-back warnings')
  assert.equal(JSON.stringify(project),frozen)
})

test('one shared material vertex does not hide positive-area coplanar self-overlap',()=>{
  // The second triangle reuses vertex zero but its other two material
  // vertices lie strictly inside the first triangle. This is a real area
  // overlap, not a harmless shared-corner touch.
  const positions=[[0,0,0],[2,0,0],[0,2,0],[.4,.2,0],[.2,.4,0]]
  const source={particles:positions.map(position=>({position:[...position]})),
    pieces:[{id:'fold',particleIndices:[0,1,2,3,4],faces:[[0,1,2],[0,3,4]]}]}
  const frozen=JSON.stringify(source)
  const out=inspectNativeIntrapanelStaticContact(source)
  assert.equal(out.checkedNonadjacentPairs,1)
  assert.equal(out.checkedVertexNeighborPairs,1)
  assert.equal(out.intersectingTrianglePairs,1)
  assert.equal(out.intersectingVertexNeighborPairs,1)
  assert.equal(out.staticNonadjacentTriangleIntersectionsAbsent,false)
  assert.equal(out.fitCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('one shared corner alone does not constitute a cloth penetration',()=>{
  const first=[[0,0,0],[1,0,0],[0,1,0]]
  for(const second of [
    [[0,0,0],[-1,0,0],[0,-1,0]], // coplanar, touching at one point
    [[0,0,0],[-1,0,.2],[0,-1,.3]], // noncoplanar, same point only
  ]){
    const positions=[...first,...second.slice(1)]
    const source={particles:positions.map(position=>({position:[...position]})),
      pieces:[{id:'fold',particleIndices:[0,1,2,3,4],faces:[[0,1,2],[0,3,4]]}]}
    const out=inspectNativeIntrapanelStaticContact(source)
    assert.equal(out.checkedNonadjacentPairs,1)
    assert.equal(out.checkedVertexNeighborPairs,1)
    assert.equal(out.intersectingTrianglePairs,0)
    assert.equal(out.intersectingVertexNeighborPairs,0)
  }
})

test('one shared vertex does not hide a noncoplanar crossing segment',()=>{
  const first=[[0,0,0],[1,0,0],[0,1,0]]
  const second=[[0,0,0],[.25,.25,-.2],[.25,.25,.2]]
  const positions=[...first,...second.slice(1)]
  const source={particles:positions.map(position=>({position:[...position]})),
    pieces:[{id:'fold',particleIndices:[0,1,2,3,4],faces:[[0,1,2],[0,3,4]]}]}
  const frozen=JSON.stringify(source)
  const out=inspectNativeIntrapanelStaticContact(source)
  assert.equal(out.checkedVertexNeighborPairs,1)
  assert.equal(out.intersectingVertexNeighborPairs,1)
  assert.equal(out.vertexOnlyNoncoplanarCrossingChecked,true)
  assert.equal(out.fitCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('noncoplanar vertex-neighbors on opposite rays or one side do not cross',()=>{
  const first=[[0,0,0],[1,0,0],[0,1,0]]
  for(const opposite of [
    [[-.25,-.25,-.2],[-.25,-.25,.2]], // line of intersection is opposite ray
    [[.25,.25,.2],[.4,.25,.3]], // opposite edge never crosses base plane
  ]){
    const positions=[...first,...opposite]
    const source={particles:positions.map(position=>({position:[...position]})),
      pieces:[{id:'fold',particleIndices:[0,1,2,3,4],faces:[[0,1,2],[0,3,4]]}]}
    const out=inspectNativeIntrapanelStaticContact(source)
    assert.equal(out.intersectingVertexNeighborPairs,0)
    assert.equal(out.staticNonadjacentTriangleIntersectionsAbsent,true)
  }
})

test('malformed triangles and exhausted work budgets fail closed',()=>{
  const source=payload(base,triangles.coplanar)
  assert.throws(()=>inspectNativeIntrapanelStaticContact(source,{maxPairs:0}),/work budget/)
  assert.throws(()=>inspectNativeIntrapanelStaticContact(source,{clearanceM:-1}),/clearance/)
  const bad=structuredClone(source)
  bad.pieces[0].faces[1]=[3,3,5]
  assert.throws(()=>inspectNativeIntrapanelStaticContact(bad),/triangle topology/)
  const nonfinite=structuredClone(source)
  nonfinite.particles[0].position[0]=Infinity
  assert.throws(()=>inspectNativeIntrapanelStaticContact(nonfinite),/triangle position/)
})

test('off-body initializer rejects self-overlap even with clear avatar and inter-panel screens',()=>{
  const a=[...base,...triangles.coplanar]
  const b=[[4,0,0],[5,0,0],[4,1,0]]
  const original={
    particles:[...a,...b].map(position=>({position:[...position],invMass:1})),
    pieces:[{id:'A',particleIndices:[0,1,2,3,4,5],
      flatVerticesM:a.map(p=>[...p]),faces:[[0,1,2],[3,4,5]]},
    {id:'B',particleIndices:[6,7,8],
      flatVerticesM:b.map(p=>[...p]),faces:[[0,1,2]]}],
    constraints:[{type:'seam',seamId:'fixture',a:0,b:6}],
    virtualSeams:[],anchors:[],
  }
  const frozen=JSON.stringify(original)
  const checkPose=pose=>({
    checked:pose.pieces.reduce((sum,p)=>sum+p.particleIndices.length+p.faces.length,0),
    penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
  })
  const out=searchNativeOffbodyRestSeeds(original,{offsetsM:[.5],checkPose})
  assert.equal(out.trialCount,1)
  assert.equal(out.best,null)
  assert.equal(out.results[0].contactClear,true)
  assert.equal(out.results[0].interpanelBroadphaseClear,true)
  assert.equal(out.results[0].materialValid,true)
  assert.equal(out.results[0].intrapanelStaticIntersectionFree,false)
  assert.equal(out.results[0].intrapanelIntersectingTrianglePairs,1)
  assert.equal(out.safeToAutoApply,false)
  assert.equal(JSON.stringify(original),frozen)
})
