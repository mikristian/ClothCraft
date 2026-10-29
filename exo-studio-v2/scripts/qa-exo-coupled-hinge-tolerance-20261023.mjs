// Regression for a pinned material vertex inside a caller-selected hinge
// tolerance band. Such a vertex is NOT rigidly co-rotating, even when its
// signed material offset exceeds the default 1e-8 m tolerance. This test
// checks a real midpoint clearance loss; it is not continuous CCD.
import assert from 'node:assert/strict'
import test from 'node:test'
import {createNativeDevelopableHingeCandidate} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {auditNativeCoupledClothTrajectory} from '../src/core/backends/nativeCoupledClothContactResearch.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'

const base=[[0,0,0],[.5,0,0],[1,0,0],
  [0,1,0],[.5,1,0],[1,1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
const restPatch=[[0,.0005,0],[.1,.1,0],[.12,.1,0],
  [0,.01,0],[.02,.01,0],[0,.03,0]]
const worldPatch=[[0,.0005,0],[.1,.1,0],[.12,.1,0],
  [0,0,-.0014],[.0002,0,-.0014],[0,.0002,-.0014]]
const hinge={panelId:'front',axisVertices:[0,2],side:'positive',
  restToleranceM:.001,worldAxisToleranceM:.001}

function fixture(){
  return {
    particles:[...base,...base.map(([x,y])=>[x,y,1.5]),...worldPatch]
      .map(position=>({position,invMass:1})),
    pieces:[
      {id:'front',faces:[...faces,[6,7,8],[9,10,11]],
        flatVerticesM:[...base,...restPatch],
        particleIndices:[0,1,2,3,4,5,12,13,14,15,16,17]},
      {id:'back',faces,flatVerticesM:base,
        particleIndices:[6,7,8,9,10,11]},
    ],
    constraints:[{type:'seam',seamId:'join',a:0,b:6},
      {type:'seam',seamId:'join',a:3,b:9}],virtualSeams:[],
  }
}

function triangleGap(pose){
  const piece=pose.pieces[0]
  const triangle=index=>piece.faces[index].map(local=>
    pose.particles[piece.particleIndices[local]].position)
  return measureNativeTriangleDistanceM(triangle(4),triangle(5))
}

test('widened hinge tolerance never grants a false co-rotation contact exemption',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  const at=angleRadians=>createNativeDevelopableHingeCandidate(source,
    {...hinge,angleRadians}).candidate
  const initial=at(0),middle=at(Math.PI/2),end=at(Math.PI)
  assert.deepEqual(middle.particles[12].position,source.particles[12].position,
    'Near-axis material vertex must remain pinned by the real hinge')
  assert.ok(triangleGap(initial)>.0013,'Start has safe pair clearance')
  assert.ok(triangleGap(end)>.0013,'End has safe pair clearance')
  assert.ok(triangleGap(middle)<.001,'Middle has a genuine submillimetre contact')
  const checkPose=pose=>({
    checked:pose.pieces.reduce((sum,p)=>sum+p.particleIndices.length+p.faces.length,0),
    penetrating:0,maximumIntrusionMm:0,sampledAvatarClearanceOnly:true,
  })
  const result=auditNativeCoupledClothTrajectory(source,{
    first:hinge,second:{panelId:'back',axisVertices:[0,2],side:'positive'},
    firstAngleRadians:Math.PI,secondAngleRadians:0,
    steps:2,checkPose,clearanceM:.001,
  })
  assert.ok(result.sweptIntrapanelUnresolvedExamples.some(w=>
    w.stage===1&&w.fractionStart===0&&w.fractionEnd===.5&&
    w.panelId==='front'&&w.faceA===4&&w.faceB===5),
  'First half-arc must not waive a pinned-near-axis triangle as co-rotating')
  assert.ok(result.possibleSweptIntrapanelContacts>0)
  assert.equal(result.contactClear,false)
  assert.equal(result.researchScreenPassed,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),frozen)
})
