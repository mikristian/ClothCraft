import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {evaluateNativeUnderarmCreaseFoldContactResearch} from
  '../src/core/backends/nativeUnderarmCreaseFoldContactResearch.js'

function fixture(){
  const v=[[-1,0,0],[1,0,0],[-1,1,0],[1,1,0]]
  return {pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
    id,particleIndices:[0,1,2,3].map(i=>i+j*4),
    flatVerticesM:v.map(p=>[...p]),faces:[[0,1,2],[1,3,2]]})),
  particles:Array.from({length:8},(_,i)=>({position:[...v[i%4]],invMass:1})),
  constraints:['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
    .flatMap((seamId,j)=>[0,2].map(i=>({type:'seam',seamId,
      a:i+j*4,b:i+1+j*4}))),virtualSeams:[]}
}

test('isolated synthetic sleeve fold obeys independent rigid half-angle gap law',()=>{
  const reference=fixture(),frozen=JSON.stringify(reference)
  const anglesRadians=[0,Math.PI/2,Math.PI]
  const out=evaluateNativeUnderarmCreaseFoldContactResearch(reference,{
    anglesRadians,maxFlips:0,clearanceM:.001})
  assert.equal(out.sourceUnchanged,true)
  assert.equal(out.physicalAcceptance,false)
  assert.equal(out.avatarContactChecked,false)
  assert.equal(out.sweptCollisionCertified,false)
  for(const panel of out.panels){
    assert.equal(panel.poses.length,anglesRadians.length)
    for(let i=0;i<anglesRadians.length;i++){
      const pose=panel.poses[i]
      const expected=2000*Math.cos(anglesRadians[i]/2)
      assert.ok(Math.abs(pose.maxGapMm-expected)<1e-8)
      assert.ok(Math.abs(pose.rmsGapMm-expected)<1e-8)
      assert.ok(Math.abs(pose.maximumPrincipalExtensionPercent)<1e-8)
      assert.ok(Math.abs(pose.maximumPrincipalCompressionPercent)<1e-8)
      assert.equal(pose.principalStrainWithinLimit,true)
      assert.equal(pose.researchAccepted,false)
      assert.equal(pose.solverReady,false)
    }
    assert.ok(panel.poses.at(-1).intersectingTrianglePairs>0,
      'exact 180-degree reflection must detect overlapping material')
  }
  assert.equal(JSON.stringify(reference),frozen)
})

test('real four-panel sleeve fold improves isolated gaps but rejects unsafe contact',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozen=[JSON.stringify(project),JSON.stringify(payload)]
  const t=performance.now()
  const out=evaluateNativeUnderarmCreaseFoldContactResearch(payload)
  const elapsedMs=performance.now()-t
  assert.equal(out.panels.length,2)
  for(const panel of out.panels){
    assert.equal(panel.creaseHinges,20)
    assert.equal(panel.illConditionedRestTriangles,15)
    assert.equal(panel.meshQualityApproved,false)
    assert.equal(panel.poses.length,4)
    const baseline=panel.poses[0]
    assert.ok(Math.abs(baseline.maxGapMm-345)<1e-6)
    assert.ok(Math.abs(baseline.rmsGapMm-332.6174604557)<1e-6)
    assert.ok(baseline.nonadjacentNearClearancePairs>0,
      'even the flat refined mesh has sub-thickness static contacts')
    for(const pose of panel.poses){
      const expected=Math.cos(pose.angleRadians/2)
      assert.ok(Math.abs(pose.maxGapMm-baseline.maxGapMm*expected)<1e-7)
      assert.ok(Math.abs(pose.rmsGapMm-baseline.rmsGapMm*expected)<1e-7)
      assert.equal(pose.sewingPairs,5)
      assert.equal(pose.contactPairsChecked,178*177/2)
      assert.ok(Math.abs(pose.maximumPrincipalExtensionPercent)<1e-8)
      assert.ok(Math.abs(pose.maximumPrincipalCompressionPercent)<1e-8)
      assert.equal(pose.principalStrainWithinLimit,true)
      assert.equal(pose.staticContactClear,false)
      assert.equal(pose.meshQualityApproved,false)
      assert.equal(pose.researchAccepted,false)
      assert.equal(pose.avatarContactChecked,false)
      assert.equal(pose.sweptCollisionCertified,false)
    }
    assert.equal(baseline.intersectingTrianglePairs,0)
    assert.ok(panel.poses.at(-1).intersectingTrianglePairs>0)
    assert.ok(panel.poses.at(-1).nonadjacentNearClearancePairs>
      baseline.nonadjacentNearClearancePairs)
  }
  assert.equal(JSON.stringify(project),frozen[0])
  assert.equal(JSON.stringify(payload),frozen[1])
  console.log('UNDERARM_FOLD_CONTACT_QA '+JSON.stringify({runtimeMs:+elapsedMs.toFixed(3),
    panels:out.panels.map(p=>({panelId:p.panelId,illRestTriangles:p.illConditionedRestTriangles,
      poses:p.poses.map(x=>({angleDegrees:+(x.angleRadians*180/Math.PI).toFixed(2),
        maxGapMm:+x.maxGapMm.toFixed(6),rmsGapMm:+x.rmsGapMm.toFixed(6),
        principalExtensionPercent:x.maximumPrincipalExtensionPercent,
        principalCompressionPercent:x.maximumPrincipalCompressionPercent,
        intersections:x.intersectingTrianglePairs,
        nearClearancePairs:x.nonadjacentNearClearancePairs,
        contactClear:x.staticContactClear}))})),sourceNonmutation:true,
    physicalAcceptance:false}))
})

test('bounded input rejects repeated, invalid and oversized fold trials',()=>{
  const p=fixture()
  for(const anglesRadians of [[],[0,0],[-.01],[Math.PI+.01],[NaN],
    Array(7).fill(.1)]){
    assert.throws(()=>evaluateNativeUnderarmCreaseFoldContactResearch(p,{anglesRadians}),
      /Invalid bounded crease fold angles/)
  }
  for(const clearanceM of [-.01,.02,NaN])
    assert.throws(()=>evaluateNativeUnderarmCreaseFoldContactResearch(p,{clearanceM}),
      /Invalid crease fold contact budget/)
  for(const maxFacePairs of [0,1.5,500001])
    assert.throws(()=>evaluateNativeUnderarmCreaseFoldContactResearch(p,{maxFacePairs}),
      /Invalid crease fold contact budget/)
  assert.throws(()=>evaluateNativeUnderarmCreaseFoldContactResearch(p,{maxFacePairs:1}),
    /Crease fold contact pair budget exceeded/)
  const invalid=structuredClone(p)
  invalid.pieces[0].flatVerticesM[0][2]=.01
  assert.throws(()=>evaluateNativeUnderarmCreaseFoldContactResearch(invalid),
    /Crease fold requires finite planar material coordinates/)
})
