// Independent coupled-contact regression: SAT's per-axis clearance screen
// can conservatively flag a diagonal gap that is actually >1 mm. Exact
// static distance may clear it ONLY if both faces remain fixed or share the
// same rigid hinge motion. This does not certify general swept cloth CCD.
import assert from 'node:assert/strict'
import test from 'node:test'
import {auditNativeCoupledClothTrajectory} from '../src/core/backends/nativeCoupledClothContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'

const shapeA=[[0,0,0],[.1,0,0],[0,.002,0]]
const shapeB=[[-.0009416804937645793,.0026925243507139383,0],
  [-.009237413975410164,.011640347691718489,0],
  [-.0005736354375258088,.007611119647044688,0]]
const base=[[0,0,0],[.5,0,0],[1,0,0],
  [0,1,0],[.5,1,0],[1,1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]

function fixture({moving=false,unsafe=false}={}){
  const offset=moving?0.1:5
  const extra=[...shapeA,...shapeB.map(([x,y,z])=>
    [x+(unsafe?0.0002:0),y-(unsafe?0.0002:0),z])]
  const patch=extra.map(([x,y])=>[x+offset,y+.25,0])
  const front=[...base,...patch]
  const back=base.map(([x,y])=>[x,y,1.5])
  return {
    particles:[...base,...back,...patch.map(([x,y])=>[x,y,5])]
      .map(position=>({position,invMass:1})),
    pieces:[
      {id:'front',faces:[...faces.map(x=>[...x]),[6,7,8],[9,10,11]],
        flatVerticesM:front,particleIndices:[0,1,2,3,4,5,12,13,14,15,16,17]},
      {id:'back',faces:faces.map(x=>[...x]),flatVerticesM:base,
        particleIndices:[6,7,8,9,10,11]},
    ],
    constraints:[{type:'seam',seamId:'join',a:0,b:6},
      {type:'seam',seamId:'join',a:3,b:9}],virtualSeams:[],
  }
}

function run(source){
  const checkPose=pose=>({
    checked:pose.pieces.reduce((n,p)=>n+p.particleIndices.length+p.faces.length,0),
    penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
  })
  return auditNativeCoupledClothTrajectory(source,{
    first:{panelId:'front',axisVertices:[1,4],side:'positive'},
    second:{panelId:'back',axisVertices:[1,4],side:'positive'},
    firstAngleRadians:.3,secondAngleRadians:0,steps:2,
    checkPose,clearanceM:.001,
  })
}

test('stationary and co-rotating diagonal clearances are not false swept vetoes',()=>{
  const distance=measureNativeTriangleDistanceM(shapeA,shapeB)
  assert.ok(distance>.0011&&distance<.0012)
  for(const moving of [false,true]){
    const source=fixture({moving}),frozen=JSON.stringify(source)
    assert.equal(inspectNativeIntrapanelStaticContact(source)
      .nonadjacentNearClearancePairs,0)
    const result=run(source)
    assert.ok(result.sweptIntrapanelAabbPotentials>0)
    assert.ok(result.sweptIntrapanelExactRigidSeparations>0,
      'Exact distance must resolve a conservative per-axis clearance false alarm')
    assert.ok(result.sweptIntrapanelRigidSeparations>=
      result.sweptIntrapanelExactRigidSeparations)
    assert.equal(result.sweptIntrapanelAxisSeparations+
      result.sweptIntrapanelRigidSeparations+
      result.possibleSweptIntrapanelContacts,result.sweptIntrapanelAabbPotentials)
    assert.equal(result.sweptCollisionCertified,false)
    assert.equal(result.safeToAutoApply,false)
    assert.equal(JSON.stringify(source),frozen)
  }
})

test('submillimetre diagonal clearance still vetoes coupled candidate',()=>{
  const shifted=shapeB.map(([x,y,z])=>[x+.0002,y-.0002,z])
  assert.ok(measureNativeTriangleDistanceM(shapeA,shifted)<.001)
  for(const moving of [false,true]){
    const source=fixture({unsafe:true,moving}),frozen=JSON.stringify(source)
    const staticResult=inspectNativeIntrapanelStaticContact(source)
    assert.ok(staticResult.nonadjacentNearClearancePairs>0)
    const result=run(source)
    assert.ok(result.nonadjacentNearClearancePairs>0)
    assert.equal(result.contactClear,false)
    assert.equal(result.researchScreenPassed,false)
    assert.equal(result.sweptCollisionCertified,false)
    assert.equal(JSON.stringify(source),frozen)
  }
})
