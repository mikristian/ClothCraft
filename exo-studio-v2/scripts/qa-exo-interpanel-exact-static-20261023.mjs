import assert from 'node:assert/strict'
import test from 'node:test'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'
import {searchNativeOffbodyRestSeeds} from '../src/core/backends/nativeOffbodyRestSeedResearch.js'

const a=[[0,0,0],[.1,0,0],[0,.002,0]]
const b=[[-.0009416804937645793,.0026925243507139383,0],
  [-.009237413975410164,.011640347691718489,0],
  [-.0005736354375258088,.007611119647044688,0]]
const fixture=(first,second)=>({
  particles:[...first,...second].map(position=>({position:[...position],invMass:1})),
  pieces:[{id:'front',particleIndices:[0,1,2],faces:[[0,1,2]]},
    {id:'back',particleIndices:[3,4,5],faces:[[0,1,2]]}],
})

test('independent exact narrowphase clears an AABB false alarm without certifying swept contact',()=>{
  const source=fixture(a,b),frozen=JSON.stringify(source)
  assert.ok(measureNativeTriangleDistanceM(a,b)>.0011)
  assert.equal(inspectNativeInterpanelBroadphase(source).possibleContactPairs,1)
  const result=inspectNativeInterpanelExactStaticContact(source)
  assert.equal(result.checkedTrianglePairs,1)
  assert.equal(result.broadphasePotentialPairs,1)
  assert.equal(result.narrowphaseCheckedPairs,1)
  assert.equal(result.nearClearancePairs,0)
  assert.equal(result.staticInterpanelExactClear,true)
  assert.ok(result.minimumExactGapMm>1.1)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.fitCertified,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('submillimetre and transverse-piercing interpanel triangles remain blocked',()=>{
  const unsafe=b.map(([x,y,z])=>[x+.0002,y-.0002,z])
  const piercing=[[.02,.02,-.1],[.02,.02,.1],[.08,.02,0]]
  const large=[[0,0,0],[.1,0,0],[0,.1,0]]
  for(const [first,second] of [[a,unsafe],[large,piercing]]){
    for(const reverse of [false,true]){
      const source=fixture(...(reverse?[second,first]:[first,second]))
      const frozen=JSON.stringify(source)
      const result=inspectNativeInterpanelExactStaticContact(source)
      assert.equal(result.staticInterpanelExactClear,false)
      assert.equal(result.nearClearancePairs,1)
      assert.ok(result.minimumExactGapMm<1)
      assert.equal(result.nearClearanceExamples.length,1)
      assert.equal(result.sweptCollisionCertified,false)
      assert.equal(JSON.stringify(source),frozen)
    }
  }
})

test('independent parallel-plane gap oracle enforces the exact 1 mm threshold',()=>{
  const large=[[0,0,0],[.1,0,0],[0,.1,0]]
  for(const [gap,expectedClear] of [[.0005,false],[.0015,true]]){
    const source=fixture(large,large.map(([x,y,z])=>[x,y,z+gap]))
    const frozen=JSON.stringify(source)
    const result=inspectNativeInterpanelExactStaticContact(source)
    if(gap<=.001)
      assert.ok(Math.abs(result.minimumExactGapMm-gap*1000)<1e-9)
    else assert.equal(result.minimumExactGapMm,null,
      'AABB already proves this pair clear without narrowphase')
    assert.equal(result.staticInterpanelExactClear,expectedClear)
    assert.equal(JSON.stringify(source),frozen)
  }
})

test('opt-in rest-seed selector clears only exact static AABB false positives',()=>{
  const evaluate=second=>{
    const source=fixture(a,second)
    source.pieces[0].flatVerticesM=a
    source.pieces[1].flatVerticesM=second
    source.constraints=[{type:'seam',seamId:'research',a:0,b:3}]
    source.virtualSeams=[]
    const frozen=JSON.stringify(source)
    const checkPose=pose=>({
      checked:pose.pieces.reduce((n,p)=>n+p.particleIndices.length+p.faces.length,0),
      penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
    })
    const result=searchNativeOffbodyRestSeeds(source,{offsetsM:[0],checkPose})
    assert.equal(JSON.stringify(source),frozen)
    assert.equal(result.results[0].interpanelBroadphaseClear,false)
    assert.equal(result.results[0].interpanelPotentialContactPairs,1)
    assert.equal(result.results[0].interpanelExactNarrowphasePairs,1)
    assert.equal(result.sweptCollisionCertified,false)
    assert.equal(result.safeToAutoApply,false)
    assert.equal(result.sewingComplete,false)
    return result
  }
  const separated=evaluate(b)
  assert.equal(separated.results[0].interpanelExactStaticClear,true)
  assert.equal(separated.restAndEndpointFeasible,true)
  assert.ok(separated.best)
  const unsafe=b.map(([x,y,z])=>[x+.0002,y-.0002,z])
  const blocked=evaluate(unsafe)
  assert.equal(blocked.results[0].interpanelExactStaticClear,false)
  assert.equal(blocked.results[0].interpanelExactNearClearancePairs,1)
  assert.equal(blocked.restAndEndpointFeasible,false)
  assert.equal(blocked.best,null)
})

test('exact interpanel screen fails closed on malformed geometry and work exhaustion',()=>{
  const source=fixture(a,b),frozen=JSON.stringify(source)
  assert.throws(()=>inspectNativeInterpanelExactStaticContact(source,{maxPairs:0}),/budget/)
  assert.throws(()=>inspectNativeInterpanelExactStaticContact(source,{maxNarrowphasePairs:0}),/budget/)
  const more=structuredClone(source)
  more.pieces[1].faces.push([0,1,2])
  assert.throws(()=>inspectNativeInterpanelExactStaticContact(more,{maxPairs:1}),/budget/)
  const overlapping=fixture(a,a)
  overlapping.pieces[1].faces.push([0,1,2])
  const frozenOverlapping=JSON.stringify(overlapping)
  assert.throws(()=>inspectNativeInterpanelExactStaticContact(overlapping,{
    maxPairs:2,maxNarrowphasePairs:1}),/narrowphase pair budget/)
  assert.equal(JSON.stringify(overlapping),frozenOverlapping)
  const invalid=structuredClone(source)
  invalid.particles[0].position=[NaN,0,0]
  assert.throws(()=>inspectNativeInterpanelExactStaticContact(invalid),/position/)
  assert.equal(JSON.stringify(source),frozen)
})

test('degenerate face cannot hide behind a separated AABB or an untested narrowphase',()=>{
  const valid=[[2,0,0],[2.1,0,0],[2,.1,0]]
  for(const collapsed of [
    [[0,0,0],[.1,0,0],[.2,0,0]],
    [[0,0,0],[0,0,0],[0,.1,0]],
  ]){
    for(const reverse of [false,true]){
      const source=fixture(...(reverse?[valid,collapsed]:[collapsed,valid]))
      const frozen=JSON.stringify(source)
      assert.throws(()=>inspectNativeInterpanelExactStaticContact(source),
        /Degenerate exact interpanel triangle/,
        'a separated invalid face must not produce a static clearance certificate')
      assert.equal(JSON.stringify(source),frozen)
    }
  }
  const source=fixture([[0,0,0],[.1,0,0],[0,.000001,0]],valid)
  const frozen=JSON.stringify(source)
  const result=inspectNativeInterpanelExactStaticContact(source)
  assert.equal(result.staticInterpanelExactClear,true)
  assert.equal(result.narrowphaseCheckedPairs,0)
  assert.equal(JSON.stringify(source),frozen)
})
