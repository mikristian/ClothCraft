// One bounded, in-memory four-panel EXO Foundation Tee mesh comparison.
// Does not mutate patterns, save a garment, build native code or certify fit.
import assert from 'node:assert/strict'
import test from 'node:test'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

function restConditioning(payload){
  let badFaces=0,maximumAspect=0,minimumAltitudeM=Infinity
  const byPiece={}
  for(const piece of payload.pieces){
    let bad=0
    for(const face of piece.faces){
      const [a,b,c]=face.map(i=>piece.flatVerticesM[i])
      const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),
        Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])]
      const longest=Math.max(...lengths)
      const doubleArea=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
      const altitude=longest>0?doubleArea/longest:0
      const aspect=altitude>0?longest/altitude:Infinity
      maximumAspect=Math.max(maximumAspect,aspect)
      minimumAltitudeM=Math.min(minimumAltitudeM,altitude)
      if(aspect>25||altitude<.002){bad++;badFaces++}
    }
    byPiece[piece.id]=bad
  }
  return {badFaces,maximumAspect,minimumAltitudeM,byPiece}
}

test('opt-in edge-flip optimization reduces four-panel slivers without altering sewing correspondences or the project',()=>{
  const project=createTemplateProject('tee')
  const source=JSON.stringify(project)
  const inspect=optimize=>{
    const start=performance.now()
    const payload=buildNativeSimulationPayload(project,{quality:'quality',experimentalOptimizeMesh:optimize})
    const payloadBefore=JSON.stringify(payload)
    const output={
      pieces:payload.pieces.length,
      particles:payload.particles.length,
      triangles:payload.pieces.reduce((n,p)=>n+p.faces.length,0),
      seam:measureNativeSeamResiduals(payload),
      principalStrain:auditNativePrincipalStrain(payload,{limitPercent:5}),
      body:inspectStagedAvatarContact(payload),
      rest:restConditioning(payload),
      wallMs:performance.now()-start,
    }
    assert.equal(JSON.stringify(payload),payloadBefore,'Read-only diagnostic changed its payload')
    assert.equal(JSON.stringify(project),source,'Read-only diagnostic changed original project')
    return output
  }
  const original=inspect(false),optimized=inspect(true)
  assert.equal(original.pieces,4)
  assert.equal(optimized.pieces,4)
  assert.equal(original.particles,optimized.particles)
  assert.equal(original.triangles,optimized.triangles)
  assert.equal(original.seam.pairCount,102)
  assert.equal(optimized.seam.pairCount,102)
  assert.deepEqual(original.seam.groups,optimized.seam.groups,
    'Research remeshing must not alter any of the 14 named seam residual groups')
  assert.ok(optimized.rest.badFaces<original.rest.badFaces,'Rest mesh slivers did not improve')
  assert.ok(optimized.rest.maximumAspect<original.rest.maximumAspect)
  assert.ok(optimized.principalStrain.maximumPrincipalExtensionPercent<
    original.principalStrain.maximumPrincipalExtensionPercent)
  assert.ok(optimized.body.penetrating<=original.body.penetrating)
  // Still an unacceptable garment; edge flips alone are NOT sufficient.
  assert.ok(optimized.rest.badFaces>0)
  assert.equal(optimized.principalStrain.withinDeclaredStrainLimit,false)
  assert.ok(optimized.body.penetrating>0)
  assert.equal(JSON.stringify(project),source)
  console.log('EXO_FOUR_PANEL_MESH_RESEARCH '+JSON.stringify({
    original:{badFaces:original.rest.badFaces,maximumAspect:original.rest.maximumAspect,
      seamMaxGapMm:original.seam.maxGapMm,seamRmsGapMm:original.seam.rmsGapMm,
      peakPrincipalExtensionPercent:original.principalStrain.maximumPrincipalExtensionPercent,
      bodyPenetratingSamples:original.body.penetrating,wallMs:original.wallMs},
    experimentalEdgeFlips:{badFaces:optimized.rest.badFaces,maximumAspect:optimized.rest.maximumAspect,
      seamMaxGapMm:optimized.seam.maxGapMm,seamRmsGapMm:optimized.seam.rmsGapMm,
      peakPrincipalExtensionPercent:optimized.principalStrain.maximumPrincipalExtensionPercent,
      bodyPenetratingSamples:optimized.body.penetrating,wallMs:optimized.wallMs},
    sourceUnchanged:true,fitCertified:false,sweptCCDVerified:false,
  }))
})
