import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {studyFoundationTeeDevelopableSleeveHingeResearch20261025 as study} from
  '../src/core/backends/nativeSleeveDevelopableHingeCandidateResearch20261025.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'

const payload=()=>buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const sub=(a,b)=>a.map((x,i)=>x-b[i])

test('real sleeves produce a detached developable fold without changing the authored garment',()=>{
  const source=payload(),sourceBefore=JSON.stringify(source),start=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const mesh=researchFoundationTeeSleeveQualityContact20261025(source,id)
    const meshBefore=JSON.stringify(mesh)
    const result=study(source,id,mesh,{angleRadians:.35})
    const base=result.basePayload,folded=result.foldedPayload
    const sourcePiece=source.pieces.find(p=>p.id===id)
    const foldedPiece=folded.pieces.find(p=>p.id===id)
    assert.equal(result.sewingPairCount,102)
    assert.equal(result.seamGroupCount,14)
    assert.equal(result.creaseHingeCount,20)
    assert.equal(result.regeneratedVertexCount,112)
    assert.equal(result.regeneratedFaceCount,178)
    assert.ok(result.originalCreaseLineResidualMm>10)
    assert.equal(foldedPiece.particleIndices.length,112)
    assert.deepEqual(foldedPiece.particleIndices.slice(0,95),sourcePiece.particleIndices)
    assert.deepEqual(folded.constraints,source.constraints)
    assert.deepEqual(folded.virtualSeams,source.virtualSeams)
    assert.deepEqual(folded.anchors,source.anchors)
    assert.equal(result.activePanelIntervals.length,3)
    assert.equal(result.interval.coupledInterpanelIntervalClear,false)
    assert.equal(result.restMeshApproved,false)
    assert.equal(result.limitedResearchGatePass,false)
    for(const flag of ['solverConstraintsRebuilt','materialCalibrated',
      'avatarContactChecked','continuousSamePanelContactCertified',
      'continuousDeformableCCDCertified','physicalAcceptance','safeToAutoApply'])
      assert.equal(result[flag],false)
    for(const sample of result.samples){
      assert.ok(Math.abs(sample.sleevePrincipalExtensionPercent)<1e-7)
      assert.ok(Math.abs(sample.sleevePrincipalCompressionPercent)<1e-7)
      assert.equal(sample.sleeveStrainValid,true)
      assert.equal(sample.sleeveIntrapanelIntersections,0)
      assert.equal(sample.sleeveIntrapanelNearFoldovers,0)
      assert.ok(sample.sleeveIntrapanelNearClearancePairs>0)
      assert.equal(sample.staticContactValid,false)
      assert.ok(sample.fullPrincipalExtensionPercent>1000)
      assert.equal(sample.fullStrainValid,false)
    }
    // Independent triangle edge-length isometry check, not a rest-matrix
    // calculation or reuse of the candidate's principal-strain oracle.
    for(const face of mesh.faces){
      for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
        const rest=distance(mesh.flatVerticesM[a],mesh.flatVerticesM[b])
        const pa=folded.particles[foldedPiece.particleIndices[a]].position
        const pb=folded.particles[foldedPiece.particleIndices[b]].position
        assert.ok(Math.abs(distance(pa,pb)-rest)<1e-10)
      }
    }
    assert.ok(Math.abs(measureNativeSeamResiduals(folded).maxGapMm-
      result.foldedSeams.maxGapMm)<1e-10)
    for(const other of source.pieces.filter(p=>p.id!==id)){
      const changed=folded.pieces.find(p=>p.id===other.id)
      assert.deepEqual(changed.particleIndices,other.particleIndices)
      for(const i of other.particleIndices)
        assert.deepEqual(folded.particles[i],source.particles[i])
    }
    assert.equal(JSON.stringify(mesh),meshBefore)
    assert.equal(JSON.stringify(source),sourceBefore)
  }
  console.log('DEVELOPABLE_SLEEVE_TWO_PANEL_STUDIES_MS '+(performance.now()-start).toFixed(2))
})

test('fold angle and rigid translation obey independent signed-rotation geometry',()=>{
  const source=payload(),mesh=researchFoundationTeeSleeveQualityContact20261025(source,'sleeve-left')
  const translation=[.02,-.01,.015],angle=.45
  const result=study(source,'sleeve-left',mesh,{angleRadians:angle,translationM:translation})
  const axis=result.motion.hinge.axisUnit,origin=result.motion.hinge.axisOriginM
  const moving=new Set(result.motion.hinge.movingVertices)
  const p=result.basePayload.pieces.find(p=>p.id==='sleeve-left')
  const q=result.foldedPayload.pieces.find(p=>p.id==='sleeve-left')
  assert.equal(moving.size,result.movingVertexCount)
  assert.ok(moving.size>0&&moving.size<p.particleIndices.length)
  let checkedMoving=0,checkedStationary=0
  for(let i=0;i<p.particleIndices.length;i++){
    const a=result.basePayload.particles[p.particleIndices[i]].position
    const b=result.foldedPayload.particles[q.particleIndices[i]].position
    const shifted=b.map((x,k)=>x-translation[k])
    if(!moving.has(i)){
      assert.ok(distance(a,shifted)<1e-10);checkedStationary++;continue
    }
    const v=sub(a,origin),w=sub(shifted,origin)
    const vRad=sub(v,axis.map(x=>x*dot(v,axis)))
    const wRad=sub(w,axis.map(x=>x*dot(w,axis)))
    const radius=Math.hypot(...vRad)
    if(radius<1e-7)continue
    const cos=dot(vRad,wRad)/(radius*Math.hypot(...wRad))
    const sin=dot(axis,cross(vRad,wRad))/(radius*Math.hypot(...wRad))
    assert.ok(Math.abs(cos-Math.cos(angle))<1e-10)
    assert.ok(Math.abs(sin-Math.sin(angle))<1e-10)
    checkedMoving++
  }
  assert.ok(checkedMoving>10&&checkedStationary>10)
  assert.ok(result.activePanelIntervals.every(x=>x.otherPanelId!=='sleeve-left'))
  assert.equal(result.samples.length,3)
  assert.equal(result.sourceNonmutationVerified,true)
})

test('malformed hinge inputs and damaged sewing or crease topology fail closed',()=>{
  const source=payload(),mesh=researchFoundationTeeSleeveQualityContact20261025(source,'sleeve-right')
  const before=JSON.stringify(source),meshBefore=JSON.stringify(mesh)
  for(const options of [{angleRadians:Infinity},{angleRadians:Math.PI},
    {translationM:[.3,0,0]},{translationM:[NaN,0,0]},
    {translationM:[0,0]},{clearanceM:-1},{maxFacePairs:0}])
    assert.throws(()=>study(source,'sleeve-right',mesh,options),/invalid/i)
  assert.throws(()=>study(source,'front',mesh),/sleeve/i)
  const missing=structuredClone(source)
  missing.constraints.splice(missing.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>study(missing,'sleeve-right',mesh),/sewing/i)
  const badMesh=structuredClone(mesh)
  badMesh.protectedCreaseEdges=[]
  assert.throws(()=>study(source,'sleeve-right',badMesh),/crease/i)
  const pinned=structuredClone(source)
  pinned.anchors.push({particle:pinned.pieces.find(p=>p.id==='sleeve-right')
    .particleIndices[0],target:[0,0,0],stiffness:1,axes:'xyz',type:'fit-anchor'})
  assert.throws(()=>study(pinned,'sleeve-right',mesh),/pin|anchor/i)
  assert.equal(JSON.stringify(source),before)
  assert.equal(JSON.stringify(mesh),meshBefore)
})
