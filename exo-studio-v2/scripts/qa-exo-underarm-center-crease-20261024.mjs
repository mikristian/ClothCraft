import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeUnderarmCenterCrease} from
  '../src/core/backends/nativeUnderarmCenterCreaseResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'

function fixture(){
  const flat=[[-1,0,0],[1,0,0],[-1,1,0],[1,1,0]]
  return {pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
    id,particleIndices:[0,1,2,3].map(i=>i+j*4),
    flatVerticesM:flat.map(p=>[...p]),faces:[[0,1,2],[1,3,2]]})),
    particles:Array.from({length:8},(_,i)=>({position:[...flat[i%4]],invMass:1})),
    constraints:['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
      .flatMap((seamId,j)=>[0,2].map(i=>({type:'seam',seamId,
        a:i+j*4,b:i+1+j*4}))),virtualSeams:[]}
}
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`)

test('symmetric intra-sleeve seams need new crease-aligned topology',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const audit=inspectNativeUnderarmCenterCrease(source)
  assert.equal(audit.sourceUnchanged,true)
  assert.equal(audit.contactCertified,false)
  assert.equal(audit.actualStrainCertified,false)
  assert.equal(audit.simulated3DPose,false)
  for(const panel of audit.panels){
    near(panel.initialRestMaxGapMm,2000)
    near(panel.idealReflectedMaxGapMm,0)
    assert.equal(panel.crossingFaceCount,2)
    assert.equal(panel.cutEdgeCount,3)
    assert.equal(panel.existingMeshCreaseExecutable,false)
    // Independent oracle: reflection across the actual x=0 line sends
    // each positive-x sewing endpoint to its negative-x counterpart.
    const original=source.pieces.find(p=>p.id===panel.panelId)
    for(const i of [0,2]){
      const a=original.flatVerticesM[i],b=original.flatVerticesM[i+1]
      near(Math.hypot(-b[0]-a[0],b[1]-a[1]),0)
    }
  }
  assert.equal(JSON.stringify(source),before)
})

test('weighted virtual sewing and inconsistent midpoints fail closed',()=>{
  const p=fixture()
  p.virtualSeams.push({seamId:'seam-sleeve-l-underarm',
    sourceIndices:[0,2],sourceWeights:[.5,.5],
    targetIndices:[1,3],targetWeights:[.5,.5]})
  const audit=inspectNativeUnderarmCenterCrease(p)
  assert.equal(audit.panels[0].pairCount,3)
  near(audit.panels[0].idealReflectedMaxGapMm,0)
  const badWeights=structuredClone(p)
  badWeights.virtualSeams[0].sourceWeights=[.2,.2]
  assert.throws(()=>inspectNativeUnderarmCenterCrease(badWeights),/Nonunit/)
  const badMidpoint=structuredClone(p)
  badMidpoint.pieces[0].flatVerticesM[1][0]=1.3
  badMidpoint.virtualSeams[0].targetWeights=[.2,.8]
  assert.throws(()=>inspectNativeUnderarmCenterCrease(badMidpoint),
    /midpoints do not define one straight crease/)
})

test('malformed topology, bad pair ownership and unsafe budgets are rejected',()=>{
  const p=fixture()
  assert.throws(()=>inspectNativeUnderarmCenterCrease(p,{maxPairs:1}),/Invalid/)
  assert.throws(()=>inspectNativeUnderarmCenterCrease(p,{axisToleranceM:0}),/Invalid/)
  const badFace=structuredClone(p);badFace.pieces[0].faces[0]=[0,0,1]
  assert.throws(()=>inspectNativeUnderarmCenterCrease(badFace),/Malformed/)
  const badOwner=structuredClone(p);badOwner.constraints[0].b=4
  assert.throws(()=>inspectNativeUnderarmCenterCrease(badOwner),/outside material panel/)
  const missing=structuredClone(p);missing.constraints=missing.constraints.slice(1)
  assert.throws(()=>inspectNativeUnderarmCenterCrease(missing),/Missing or oversized/)
})

test('real four-panel Foundation Tee: center crease intersects existing sleeve faces',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozen=[JSON.stringify(project),JSON.stringify(payload)]
  const start=performance.now()
  const audit=inspectNativeUnderarmCenterCrease(payload)
  const runtimeMs=performance.now()-start
  assert.equal(audit.panels.length,2)
  for(const panel of audit.panels){
    assert.equal(panel.pairCount,5)
    near(panel.initialRestMaxGapMm,345)
    near(panel.idealReflectedMaxGapMm,0,1e-7)
    assert.equal(panel.crossingFaceCount,20)
    assert.equal(panel.requiresCreaseConformingRemesh,true)
    assert.ok(panel.cutEdgeCount>0)
    assert.ok(panel.axisVertexCount>0)
  }
  assert.deepEqual([JSON.stringify(project),JSON.stringify(payload)],frozen)
  console.log('UNDERARM_CENTER_CREASE '+JSON.stringify({
    panels:audit.panels.map(({panelId,pairCount,initialRestMaxGapMm,
      initialRestRmsGapMm,idealReflectedMaxGapMm,idealReflectedRmsGapMm,
      crossingFaceCount,cutEdgeCount,axisVertexCount})=>({
      panelId,pairCount,initialRestMaxGapMm,initialRestRmsGapMm,
      idealReflectedMaxGapMm,idealReflectedRmsGapMm,
      crossingFaceCount,cutEdgeCount,axisVertexCount})),
    runtimeMs:+runtimeMs.toFixed(3),sourceNonmutation:true,
    physicalAcceptance:false,contactCertified:false,sweptCollisionCertified:false}))
})
