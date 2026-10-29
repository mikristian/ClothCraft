import assert from 'node:assert/strict'
import test from 'node:test'
import {auditNativeSeamCandidate,compareNativeSeamGroups,compareNativeSeamMerit,measureNativeSeamResiduals}
  from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectNativeSampledContactPath} from '../src/core/backends/nativeSampledContactPath.js'

const clear={checked:8,penetrating:0,maximumIntrusionMm:0,
  sampledAvatarClearanceOnly:true,sweptCollisionCertified:false}
const clearPath={checked:56,penetrating:0,maximumIntrusionMm:0,
  intermediateSamples:7,sampledIntermediateClearanceOnly:true,sweptCollisionCertified:false,
  samples:Array.from({length:7},(_,i)=>({fraction:(i+1)/8,checked:8,
    penetrating:0,maximumIntrusionMm:0}))}
function fixture(){
  const flat=[[0,0,0],[.2,0,0],[0,.1,0]]
  return {
    particles:[...flat.map(position=>({position:[...position],invMass:1})),
      ...flat.map(([x,y,z])=>({position:[x,y,z+.2],invMass:1}))],
    pieces:[
      {id:'front',faces:[[0,1,2]],flatVerticesM:flat,particleIndices:[0,1,2]},
      {id:'back',faces:[[0,1,2]],flatVerticesM:flat,particleIndices:[3,4,5]},
    ],
    constraints:[{type:'seam',seamId:'hinge',a:0,b:3},
      {type:'seam',seamId:'hinge',a:1,b:4}],
    virtualSeams:[],
  }
}
test('a rigid panel hinge can reduce sewn gap without principal stretch',()=>{
  const before=fixture(),frozen=JSON.stringify(before)
  before.particles[0].invMass=0
  const unchanged=JSON.stringify(before)
  const after=structuredClone(before)
  for(let i=3;i<=5;i++){
    const [x,y]=after.particles[i].position
    after.particles[i].position=[x,y*.5,.1+y*Math.sqrt(3)/2]
  }
  const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear,sampledPathContact:clearPath})
  assert.ok(Math.abs(gate.before.maxGapMm-200)<1e-9)
  assert.ok(Math.abs(gate.after.maxGapMm-100)<1e-9)
  assert.ok(Math.abs(gate.strain.maximumPrincipalExtensionPercent)<1e-8)
  assert.equal(gate.researchScreenPassed,true)
  assert.equal(gate.sampledPathContactClear,true)
  assert.equal(gate.meshConditioning.approved,true)
  assert.equal(gate.safeToAutoApply,false)
  assert.equal(gate.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(before),unchanged)
  assert.notEqual(frozen,unchanged)
})
test('a clear endpoint alone is insufficient: intermediate sampled contact is mandatory',()=>{
  const before=fixture(),after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]=.1
  const noPath=auditNativeSeamCandidate(before,after,{endpointContact:clear})
  assert.equal(noPath.merit.paretoImproved,true)
  assert.equal(noPath.endpointContactClear,true)
  assert.equal(noPath.sampledPathContactChecked,false)
  assert.equal(noPath.researchScreenPassed,false)
  const accepted=auditNativeSeamCandidate(before,after,{endpointContact:clear,sampledPathContact:clearPath})
  assert.equal(accepted.researchScreenPassed,true)
  assert.equal(accepted.sweptCollisionCertified,false)
})
test('incomplete avatar sampling cannot claim the whole garment is clear',()=>{
  const before=fixture(),after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]=.1
  const baseline=auditNativeSeamCandidate(before,after,{
    endpointContact:clear,sampledPathContact:clearPath})
  assert.equal(baseline.researchScreenPassed,true)
  const partialEndpoint=auditNativeSeamCandidate(before,after,{
    endpointContact:{...clear,checked:1},sampledPathContact:clearPath})
  assert.equal(partialEndpoint.endpointContactChecked,false)
  assert.equal(partialEndpoint.researchScreenPassed,false)
  const partialPath=auditNativeSeamCandidate(before,after,{
    endpointContact:clear,sampledPathContact:{...clearPath,checked:7}})
  assert.equal(partialPath.sampledPathContactChecked,false)
  assert.equal(partialPath.researchScreenPassed,false)
  const impossibleEndpoint=auditNativeSeamCandidate(before,after,{
    endpointContact:{...clear,penetrating:9},sampledPathContact:clearPath})
  assert.equal(impossibleEndpoint.endpointContactChecked,false)
  assert.equal(impossibleEndpoint.researchScreenPassed,false)
})
test('per-pose contact coverage rejects aggregate masking and inconsistent sampled metadata',()=>{
  const before=fixture(),after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]=.1
  const baseline=auditNativeSeamCandidate(before,after,{endpointContact:clear,sampledPathContact:clearPath})
  assert.equal(baseline.researchScreenPassed,true)
  const mutate=fn=>{
    const report=structuredClone(clearPath)
    fn(report)
    const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear,sampledPathContact:report})
    assert.equal(gate.sampledPathContactChecked,false)
    assert.equal(gate.researchScreenPassed,false)
  }
  mutate(report=>{report.samples[0].checked=1;report.samples[1].checked=15})
  mutate(report=>{report.samples.pop()})
  mutate(report=>{report.samples[0].penetrating=1})
  mutate(report=>{report.samples[0].maximumIntrusionMm=1})
  mutate(report=>{report.samples[0].fraction=1.5})
  mutate(report=>{delete report.samples})
  assert.equal(JSON.stringify(before),JSON.stringify(fixture()),'Source garment changed')
})
test('intermediate crossing rejects even when both endpoint poses are clear',()=>{
  const before=fixture(),after=structuredClone(before)
  for(let i=3;i<=5;i++){
    before.particles[i].position[2]=.3
    after.particles[i].position[2]=-.1
  }
  // A narrow synthetic body slab at z=0.1, clear at both ends. The
  // sampled path crosses it. This is a negative control, NOT triangle CCD.
  const screen=pose=>{
    const penetrating=pose.particles.slice(3).filter(p=>Math.abs(p.position[2]-.1)<.026).length
    return {checked:pose.particles.length,penetrating,
      maximumIntrusionMm:penetrating?10:0,sampledAvatarClearanceOnly:true}
  }
  assert.equal(screen(before).penetrating,0)
  assert.equal(screen(after).penetrating,0)
  const original=JSON.stringify(before),candidate=JSON.stringify(after)
  const path=inspectNativeSampledContactPath(before,after,{steps:8,checkPose:screen})
  assert.equal(path.intermediateSamples,7)
  assert.equal(path.penetrating,3)
  assert.equal(path.worstFraction,.5)
  assert.equal(path.sweptCollisionCertified,false)
  const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear,sampledPathContact:path})
  assert.equal(gate.merit.paretoImproved,true)
  assert.equal(gate.strain.withinDeclaredStrainLimit,true)
  assert.equal(gate.endpointContactClear,true)
  assert.equal(gate.sampledPathContactClear,false)
  assert.equal(gate.researchScreenPassed,false)
  assert.equal(JSON.stringify(before),original)
  assert.equal(JSON.stringify(after),candidate)
})
test('sampled path refuses incompatible meshes, nonfinite coordinates and unbounded work',()=>{
  const before=fixture(),after=structuredClone(before)
  const screen=()=>clear
  assert.throws(()=>inspectNativeSampledContactPath(before,after,{steps:17,checkPose:screen}),/2..16/)
  assert.throws(()=>inspectNativeSampledContactPath(before,after,{steps:8}),/required/)
  after.particles[0].position[0]=NaN
  assert.throws(()=>inspectNativeSampledContactPath(before,after,{checkPose:screen}),/Nonfinite/)
  after.particles[0].position[0]=0
  after.pieces[0].faces=[]
  assert.throws(()=>inspectNativeSampledContactPath(before,after,{checkPose:screen}),/topology/)
})
test('rest triangles with unsafe altitude reject even a rigid seam improvement',()=>{
  const before=fixture()
  const slender=[[0,0,0],[.2,0,0],[.1,.0001,0]]
  for(const piece of before.pieces)piece.flatVerticesM=slender.map(p=>[...p])
  for(let i=0;i<3;i++){
    before.particles[i].position=[...slender[i]]
    before.particles[i+3].position=[slender[i][0],slender[i][1],.2]
  }
  const after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]-=.1
  const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear})
  assert.equal(gate.merit.paretoImproved,true)
  assert.equal(gate.strain.withinDeclaredStrainLimit,true)
  assert.equal(gate.endpointContactClear,true)
  assert.equal(gate.meshConditioning.approved,false)
  assert.equal(gate.meshConditioning.illConditionedFaces,2)
  assert.equal(gate.researchScreenPassed,false)
})
test('false seam closure is rejected for triangle collapse and for body intrusion',()=>{
  const before=fixture(),after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]=.001
  after.particles[5].position[1]=.00001
  const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear})
  assert.equal(gate.merit.paretoImproved,true)
  assert.equal(gate.strain.withinDeclaredStrainLimit,false)
  assert.equal(gate.researchScreenPassed,false)
  const rigid=structuredClone(before)
  for(let i=3;i<=5;i++)rigid.particles[i].position[2]=.1
  const penetrated=auditNativeSeamCandidate(before,rigid,{endpointContact:{...clear,penetrating:1}})
  assert.equal(penetrated.researchScreenPassed,false)
  assert.equal(auditNativeSeamCandidate(before,rigid).researchScreenPassed,false)
})
test('pins and both max/RMS gap are mandatory',()=>{
  const before=fixture(),after=structuredClone(before)
  before.particles[0].invMass=0
  after.particles[0].invMass=0
  for(let i=3;i<=5;i++)after.particles[i].position[2]=.1
  after.particles[0].position[0]=.002
  assert.equal(auditNativeSeamCandidate(before,after,{endpointContact:clear}).pinsUnchanged,false)
  const merit=compareNativeSeamMerit(
    {pairCount:2,maxGapMm:100,rmsGapMm:Math.sqrt(5000)},
    {pairCount:2,maxGapMm:90,rmsGapMm:90})
  assert.equal(merit.maxNonworse,true)
  assert.equal(merit.rmsNonworse,false)
  assert.equal(merit.paretoImproved,false)
})
test('virtual barycentric seam correspondence is measured and validated',()=>{
  const payload=fixture()
  payload.constraints=[]
  payload.virtualSeams=[{id:'virtual',sourceIndices:[0,1],sourceWeights:[.5,.5],
    targetIndices:[3,4],targetWeights:[.5,.5]}]
  const measured=measureNativeSeamResiduals(payload)
  assert.equal(measured.pairCount,1)
  assert.ok(Math.abs(measured.maxGapMm-200)<1e-9)
  payload.virtualSeams[0].targetWeights=[.7,.7]
  assert.throws(()=>measureNativeSeamResiduals(payload),/sum to one/)
})
test('global max and RMS can improve while one sewn group deteriorates: reject candidate',()=>{
  const before=fixture()
  const second=structuredClone(fixture())
  for(const p of second.particles)p.position[2]-=.1 // 100 mm gap in second group
  const offset=before.particles.length
  before.particles.push(...second.particles)
  before.pieces.push(...second.pieces.map(p=>({
    ...p,id:p.id+'-sleeve',particleIndices:p.particleIndices.map(i=>i+offset),
  })))
  before.constraints[0].seamId='bodice'
  before.constraints[1].seamId='bodice'
  before.constraints.push(...second.constraints.map(c=>({
    ...c,seamId:'underarm',a:c.a+offset,b:c.b+offset,
  })))
  // Bodice initially 300 mm, underarm 100 mm. Both groups are moved
  // rigidly, so material stretch/compression is exactly zero.
  for(let i=3;i<=5;i++)before.particles[i].position[2]+=.1
  const after=structuredClone(before)
  for(let i=3;i<=5;i++)after.particles[i].position[2]-=.1
  for(let i=offset+3;i<=offset+5;i++)after.particles[i].position[2]+=.05
  const gate=auditNativeSeamCandidate(before,after,{endpointContact:clear})
  assert.equal(gate.merit.paretoImproved,true)
  assert.equal(gate.strain.withinDeclaredStrainLimit,true)
  assert.equal(gate.meshConditioning.approved,true)
  assert.equal(gate.groupMerit.allGroupsNonworse,false)
  assert.deepEqual(gate.groupMerit.regressions.map(x=>x.id),['underarm'])
  assert.ok(gate.groupMerit.regressions[0].rmsDeltaMm>49.9)
  assert.equal(gate.researchScreenPassed,false)
})
test('per-group comparison is order-independent and rejects missing or duplicate groups',()=>{
  const before={groups:[{id:'a',pairCount:1,maxGapMm:200,rmsGapMm:200},
    {id:'b',pairCount:2,maxGapMm:100,rmsGapMm:80}]}
  const after={groups:[{id:'b',pairCount:2,maxGapMm:99,rmsGapMm:79},
    {id:'a',pairCount:1,maxGapMm:199,rmsGapMm:199}]}
  const result=compareNativeSeamGroups(before,after)
  assert.equal(result.allGroupsNonworse,true)
  assert.equal(result.checkedGroupCount,2)
  assert.throws(()=>compareNativeSeamGroups(before,{groups:[after.groups[0]]}),/identity/)
  assert.throws(()=>compareNativeSeamGroups(before,{groups:[after.groups[0],after.groups[0]]}),/identity/)
  assert.throws(()=>compareNativeSeamGroups(
    {groups:[before.groups[0],before.groups[0]]},after),/identity/)
})
