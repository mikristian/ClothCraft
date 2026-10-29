import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {assembleNativeSeams} from '../src/core/backends/seamAssembly.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {auditNativeSeamCandidate,compareNativeSeamMerit,measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'

const make=(vertices,world=vertices)=>({
  particles:world.map((point,index)=>({position:[...point]})),
  pieces:[{id:'test',faces:[[0,1,2]],flatVerticesM:vertices,particleIndices:[0,1,2]}],
})
test('rigid rotation/translation preserves unit principal stretch',()=>{
  const rest=[[0,0,0],[.2,0,0],[0,.1,0]]
  const rotated=rest.map(([x,y,z])=>[x+2,z+3,-y+1])
  const out=auditNativePrincipalStrain(make(rest,rotated))
  assert.ok(Math.abs(out.maximumPrincipalExtensionPercent)<1e-10)
  assert.equal(out.withinDeclaredStrainLimit,true)
  assert.equal(out.fitCertified,false)
})
test('uniform 10% stretch fails a 5% bound',()=>{
  const rest=[[0,0,0],[.2,0,0],[0,.1,0]]
  const stretched=rest.map(([x,y,z])=>[1.1*x,1.1*y,z])
  const out=auditNativePrincipalStrain(make(rest,stretched))
  assert.ok(Math.abs(out.maximumPrincipalExtensionPercent-10)<1e-9)
  assert.equal(out.overLimitTriangles,1)
  assert.equal(out.withinDeclaredStrainLimit,false)
})
test('uniform 50% compression is not a valid 5% material deformation',()=>{
  const rest=[[0,0,0],[.2,0,0],[0,.1,0]]
  const world=rest.map(([x,y,z])=>[x*.5,y*.5,z])
  const result=auditNativePrincipalStrain(make(rest,world))
  assert.ok(result.maximumPrincipalExtensionPercent<0)
  assert.ok(Math.abs(result.maximumPrincipalCompressionPercent-50)<1e-9)
  assert.equal(result.compressionOverLimitTriangles,1)
  assert.equal(result.withinDeclaredStrainLimit,false)
})
test('collapsed 3D face is rejected even when rest face is nondegenerate',()=>{
  const rest=[[0,0,0],[.2,0,0],[0,.1,0]]
  const world=[[0,0,0],[.2,0,0],[.1,0,0]]
  const result=auditNativePrincipalStrain(make(rest,world))
  assert.equal(result.collapsedWorldTriangles,1)
  assert.equal(result.withinDeclaredStrainLimit,false)
})
test('slender triangle stretch is found even when an edge-only screen misses it',()=>{
  const rest=[[0,0,0],[1,0,0],[.5,.001,0]]
  const deformed=[[0,0,0],[1,0,0],[.5,.002,0]]
  const out=auditNativePrincipalStrain(make(rest,deformed))
  assert.ok(out.maximumPrincipalExtensionPercent>90)
  assert.equal(out.withinDeclaredStrainLimit,false)
})
test('degenerate rest triangle cannot pass certification',()=>{
  const out=auditNativePrincipalStrain(make([[0,0,0],[1,0,0],[2,0,0]]))
  assert.equal(out.degenerateTriangles,1)
  assert.equal(out.withinDeclaredStrainLimit,false)
})
test('four-panel tee seam sides match in rest length (placement, not a size-mismatch issue)',()=>{
  const payload=buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
  const groups=new Map()
  for(const seam of payload.constraints.filter(item=>item.type==='seam')){
    if(!groups.has(seam.seamId))groups.set(seam.seamId,[])
    groups.get(seam.seamId).push(seam)
  }
  const point=index=>{
    const piece=payload.pieces.find(item=>item.id===payload.particles[index].pieceId)
    return piece.flatVerticesM[piece.particleIndices.indexOf(index)]
  }
  const length=(pairs,key)=>pairs.slice(1).reduce((sum,item,i)=>{
    const a=point(pairs[i][key]),b=point(item[key])
    return sum+Math.hypot(a[0]-b[0],a[1]-b[1])
  },0)
  assert.equal(payload.pieces.length,4)
  assert.equal(groups.size,14)
  for(const [id,seams] of groups){
    const l=length(seams,'a'),r=length(seams,'b')
    assert.ok(Math.abs(l-r)/Math.max(l,r)<.01,`${id}: sewn material lengths disagree`)
  }
})
test('the actual four-panel EXO tee still fails a physical principal-strain gate after attractive seam closure',()=>{
  const source=createTemplateProject('tee')
  const immutable=JSON.stringify(source)
  const payload=buildNativeSimulationPayload(source,{quality:'quality'})
  const payloadBefore=JSON.stringify(payload)
  const start=auditNativePrincipalStrain(payload,{limitPercent:5})
  const assemblyStart=performance.now()
  const staged=assembleNativeSeams(payload,{
    iterations:700,seamStiffness:.8,restStiffness:.65,
    positionStiffness:0,maxMoveM:.006,
  })
  const assemblyWallMs=performance.now()-assemblyStart
  const result=auditNativePrincipalStrain(staged,{limitPercent:5})
  const gate=staged.assemblyExperiment.candidateGate
  assert.deepEqual(staged.assemblyExperiment.principalStrainAudit,result)
  assert.equal(gate.after.pairCount,102)
  assert.equal(gate.meshConditioning.approved,false)
  assert.equal(gate.meshConditioning.illConditionedFaces,192)
  assert.ok(Math.abs(gate.after.maxGapMm-staged.initialAssembly.initialSeamGapMaximumMm)<.02)
  assert.equal(gate.strain.withinDeclaredStrainLimit,false)
  assert.equal(gate.endpointContactClear,false)
  assert.equal(gate.sampledPathContactChecked,true)
  assert.equal(gate.sampledPathContactClear,false)
  assert.equal(staged.assemblyExperiment.sampledPathContact.intermediateSamples,7)
  assert.equal(staged.assemblyExperiment.sampledPathContact.checked,7*1268)
  assert.ok(staged.assemblyExperiment.sampledPathContact.penetrating>0)
  assert.equal(staged.assemblyExperiment.sampledPathContact.sweptCollisionCertified,false)
  assert.equal(gate.researchScreenPassed,false)
  assert.equal(gate.safeToAutoApply,false)
  assert.equal(staged.pieces.length,4)
  assert.equal(payload.particles.length,500)
  assert.ok(staged.initialAssembly.initialSeamGapMaximumMm<5)
  assert.ok(staged.initialAssembly.initialMeshPeakEdgeStrainPercent<20)
  assert.equal(result.withinDeclaredStrainLimit,false,
    'Small seam gap / edge strain must never bypass triangle-level spectral strain')
  assert.ok(result.maximumPrincipalExtensionPercent>20)
  assert.ok(staged.assemblyExperiment.collision.penetrating>0,
    'The attractive seam result still has known avatar intrusions')
  assert.equal(staged.assemblyExperiment.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),immutable,'QA must not edit the garment')
  assert.equal(JSON.stringify(payload),payloadBefore,'QA must not mutate original native payload')
  assert.equal(start.fitCertified,false)
  console.log('FOUR_PANEL_RESEARCH '+JSON.stringify({
    pieces:4,initialMaxSeamGapMm:payload.initialAssembly.initialSeamGapMaximumMm,
    stagedMaxSeamGapMm:staged.initialAssembly.initialSeamGapMaximumMm,
    independentlyMeasuredStagedSeamRmsMm:gate.after.rmsGapMm,
    independentlyMeasuredInitialSeamRmsMm:gate.before.rmsGapMm,
    coupledCandidateResearchScreenPassed:gate.researchScreenPassed,
    stagedPeakEdgeStrainPercent:staged.initialAssembly.initialMeshPeakEdgeStrainPercent,
    stagedPeakPrincipalStrainPercent:result.maximumPrincipalExtensionPercent,
    p95PrincipalStrainPercent:result.p95PrincipalExtensionPercent,
    triangleCount:result.triangleCount,trianglesOver5Percent:result.overLimitTriangles,
    bodyScreenPenetratingSamples:staged.assemblyExperiment.collision.penetrating,
    sampledIntermediateContactChecks:staged.assemblyExperiment.sampledPathContact.checked,
    sampledIntermediatePenetrations:staged.assemblyExperiment.sampledPathContact.penetrating,
    assemblyWallMs:+assemblyWallMs.toFixed(2),
    fitCertified:false,fullTriangleCCDVerified:false,
  }))
})
