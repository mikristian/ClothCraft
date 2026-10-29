import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from
  '../src/core/backends/nativeUnderarmCreaseConstraintGraphResearch.js'
import {splitNativeCreaseEdgeResearch20261024 as split} from
  '../src/core/backends/nativeCreaseEdgeResamplingResearch20261024.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const signed=(v,[a,b,c])=>{
  const [p,q,r]=[v[a],v[b],v[c]]
  return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
}
const incidence=faces=>{
  const map=new Map()
  for(const f of faces)for(let i=0;i<3;i++){
    const k=key(f[i],f[(i+1)%3])
    map.set(k,(map.get(k)||0)+1)
  }
  return map
}
const boundary=faces=>[...incidence(faces)].filter(([,n])=>n===1)
  .map(([k])=>k).sort()
const area=p=>p.faces.reduce((sum,f)=>sum+Math.abs(signed(p.verticesM,f))/2,0)
const pose=(p,angle)=>p.verticesM.map(([x,y])=>x>1e-8?
  [x*Math.cos(angle),y,x*Math.sin(angle)]:[x,y,0])
const payloadFor=(piece,positions)=>({
  pieces:[{id:piece.panelId,particleIndices:positions.map((_,i)=>i),
    flatVerticesM:piece.verticesM,faces:piece.faces}],
  particles:positions.map(position=>({position}))})
const contact=(piece,positions)=>inspectNativeIntrapanelStaticContact(
  payloadFor(piece,positions),{clearanceM:.001,maxPairs:200000})
const endpoint=(positions,end)=>end.localIndices.reduce((p,id,j)=>{
  for(let k=0;k<3;k++)p[k]+=positions[id][k]*end.weights[j]
  return p
},[0,0,0])
const seam=(positions,pairs)=>{
  const distances=pairs.map(pair=>{
    const a=endpoint(positions,pair.source),b=endpoint(positions,pair.target)
    return Math.hypot(...a.map((v,i)=>v-b[i]))*1000
  })
  return {maxGapMm:Math.max(...distances),
    rmsGapMm:Math.hypot(...distances)/Math.sqrt(distances.length)}
}
const synthetic=()=>({panelId:'two-half-crease',originalVertexCount:4,
  originalParticleIndices:[0,1,2,3],
  verticesM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  worldPositionsM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  faces:[[0,2,1],[0,1,3]],creaseEdges:[[0,1]],
  newVertexProvenance:[]})

test('synthetic conforming split reconstructs nested provenance and never grants physical approval',()=>{
  const input=synthetic(),frozen=JSON.stringify(input)
  const result=split(input,{edgeIndex:0,fraction:.25})
  const candidate=result.candidate
  assert.equal(candidate.verticesM.length,5)
  assert.equal(candidate.faces.length,4)
  assert.equal(candidate.creaseEdges.length,2)
  assert.deepEqual(candidate.newVertexProvenance,
    [{index:4,edge:[0,1],weights:[.75,.25]}])
  assert.deepEqual(candidate.verticesM[4],[0,.005,0])
  assert.deepEqual(boundary(candidate.faces),boundary(input.faces))
  assert.ok(Math.abs(area(candidate)-area(input))<1e-12)
  assert.equal(result.baseline.structuralEdges+3,result.resampled.structuralEdges)
  assert.equal(result.baseline.bendingHinges+3,result.resampled.bendingHinges)
  assert.equal(result.meshQualityApproved,true)
  assert.equal(result.restContactScreenClear,true)
  assert.equal(result.restMaterialContactOnly,true)
  assert.equal(result.worldPoseContactChecked,false)
  assert.equal(result.worldPoseValidityCertified,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.safeToAutoApply,false)
  // A collision at a later angle is not erased by the clean rest screen.
  const folded=contact(candidate,pose(candidate,Math.PI))
  assert.ok(folded.intersectingTrianglePairs>0)
  assert.equal(folded.staticDisjointThicknessScreenClear,false)
  candidate.verticesM[0][0]=123
  candidate.originalParticleIndices[0]=456
  assert.equal(JSON.stringify(input),frozen,'candidate must not alias source arrays')
})

test('clean flat rest mesh never certifies a corrupted or deformed world pose',()=>{
  const input=synthetic()
  input.worldPositionsM[0]=[1000,1000,1000]
  const frozen=JSON.stringify(input)
  const result=split(input,{edgeIndex:0})
  assert.equal(result.restContactScreenClear,true)
  assert.equal(result.restMaterialContactOnly,true)
  assert.equal(result.worldPoseContactChecked,false)
  assert.equal(result.worldPoseValidityCertified,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(JSON.stringify(input),frozen)
})

test('second subdivision preserves acyclic generated-parent provenance',()=>{
  const source=synthetic(),frozen=JSON.stringify(source)
  const first=split(source,{edgeIndex:0,fraction:.5}).candidate
  const second=split(first,{edgeIndex:0,fraction:.5})
  assert.equal(second.candidate.verticesM.length,6)
  assert.equal(second.candidate.faces.length,6)
  assert.deepEqual(second.candidate.newVertexProvenance.map(p=>p.edge),
    [[0,1],[0,4]])
  assert.deepEqual(second.candidate.verticesM[5],[0,.005,0])
  assert.deepEqual(boundary(second.candidate.faces),boundary(source.faces))
  assert.ok(Math.abs(area(second.candidate)-area(source))<1e-12)
  assert.equal(second.physicalAcceptance,false)
  assert.equal(JSON.stringify(source),frozen)
})

test('both real sleeves: bounded resampling preserves sewn material but exposes conditioning regressions',()=>{
  const project=createTemplateProject('tee')
  const native=buildNativeSimulationPayload(project,{quality:'quality'})
  const projectBefore=JSON.stringify(project),nativeBefore=JSON.stringify(native)
  const panels=refineNativeUnderarmCreaseMeshResearch(native).panels
  const graphs=buildNativeUnderarmCreaseConstraintGraphResearch(native).panels
  const start=performance.now(),results=[]
  for(const piece of panels){
    const before=JSON.stringify(piece)
    const graph=graphs.find(g=>g.panelId===piece.panelId)
    for(const edgeIndex of [7,9,16]){
      const out=split(piece,{edgeIndex,fraction:.5})
      const candidate=out.candidate
      assert.equal(out.sourceUnchanged,true)
      assert.equal(out.materialBoundaryPreserved,true)
      assert.equal(out.materialAreaPreserved,true)
      assert.equal(out.originalSewingEndpointsPreserved,true)
      assert.equal(out.provenanceReconstructed,true)
      assert.equal(out.candidateApplied,false)
      assert.equal(out.structuralConstraintsInstalled,false)
      assert.equal(out.bendingConstraintsInstalled,false)
      assert.equal(out.physicalAcceptance,false)
      assert.equal(out.sweptCollisionCertified,false)
      assert.deepEqual(candidate.originalParticleIndices,piece.originalParticleIndices)
      assert.deepEqual(candidate.verticesM.slice(0,piece.verticesM.length),piece.verticesM)
      assert.deepEqual(boundary(candidate.faces),boundary(piece.faces))
      assert.ok(Math.abs(area(candidate)-area(piece))<1e-12)
      assert.equal(candidate.faces.length,piece.faces.length+2)
      assert.equal(candidate.verticesM.length,piece.verticesM.length+1)
      assert.equal(candidate.creaseEdges.length,piece.creaseEdges.length+1)
      assert.equal(candidate.newFaceCount,candidate.faces.length)
      assert.equal(candidate.newVertexCount,candidate.verticesM.length)
      assert.equal(candidate.refinementAfter.illConditioned,
        out.resampled.illConditioned)
      const edge=piece.creaseEdges[edgeIndex]
      const entry=candidate.newVertexProvenance.at(-1)
      assert.deepEqual(entry.edge,edge)
      assert.deepEqual(entry.weights,[.5,.5])
      assert.ok(candidate.verticesM[entry.index].every((x,i)=>
        Math.abs(x-(piece.verticesM[edge[0]][i]+
          piece.verticesM[edge[1]][i])/2)<1e-12))
      const originalIncidence=incidence(piece.faces)
      const candidateIncidence=incidence(candidate.faces)
      assert.equal(originalIncidence.get(key(...edge)),2)
      assert.equal(candidateIncidence.has(key(...edge)),false)
      for(const [a,b] of candidate.creaseEdges){
        assert.equal(candidateIncidence.get(key(a,b)),2)
        assert.ok(Math.abs(candidate.verticesM[a][0])<1e-9)
        assert.ok(Math.abs(candidate.verticesM[b][0])<1e-9)
      }
      const sourceSign=Math.sign(signed(piece.verticesM,piece.faces[0]))
      for(const face of candidate.faces){
        assert.ok(signed(candidate.verticesM,face)*sourceSign>1e-14)
        const xs=face.map(i=>candidate.verticesM[i][0])
        assert.ok(!(Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9))
      }
      const positions=pose(candidate,75*Math.PI/180)
      const strain=auditNativePrincipalStrain(payloadFor(candidate,positions),
        {limitPercent:5})
      const independentContact=contact(candidate,positions)
      assert.ok(strain.maximumPrincipalExtensionPercent<1e-8)
      assert.ok(strain.maximumPrincipalCompressionPercent<1e-8)
      assert.equal(independentContact.staticDisjointThicknessScreenClear,false)
      const baselineSeam=seam(pose(piece,75*Math.PI/180),graph.sewingPairs)
      const candidateSeam=seam(positions,graph.sewingPairs)
      assert.ok(Math.abs(candidateSeam.maxGapMm-baselineSeam.maxGapMm)<1e-9)
      assert.ok(Math.abs(candidateSeam.rmsGapMm-baselineSeam.rmsGapMm)<1e-9)
      assert.equal(out.baseline.illConditioned,15)
      assert.equal(out.baselineContact.nearClearancePairs,14)
      assert.equal(out.resampledContact.staticClear,false)
      assert.equal(out.resampledContact.intersectingPairs,0)
      if(edgeIndex===7||edgeIndex===9){
        assert.equal(out.resampled.illConditioned,17)
        assert.equal(out.resampledContact.nearClearancePairs,20)
        assert.equal(out.qualityNonregression,false)
      }else{
        assert.equal(out.resampled.illConditioned,15)
        assert.equal(out.resampledContact.nearClearancePairs,14)
        assert.equal(out.qualityNonregression,true)
      }
      results.push({panelId:piece.panelId,edgeIndex,
        before:out.baseline,after:out.resampled,
        restContact:out.resampledContact,
        foldedSeam:candidateSeam,
        foldedPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
        foldedPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
        foldedStaticContactClear:independentContact.staticDisjointThicknessScreenClear,
        sourceUnchanged:out.sourceUnchanged,physicalAcceptance:false})
    }
    assert.equal(JSON.stringify(piece),before)
  }
  assert.equal(JSON.stringify(project),projectBefore)
  assert.equal(JSON.stringify(native),nativeBefore)
  console.log('CREASE_RESAMPLING_QA '+JSON.stringify({results,
    runtimeMs:+(performance.now()-start).toFixed(3),
    sourceNonmutation:true,physicalAcceptance:false}))
})

test('malformed provenance, topology, hidden fields, accessors and budgets fail closed',()=>{
  const input=synthetic(),frozen=JSON.stringify(input)
  for(const options of [{edgeIndex:-1},{edgeIndex:1},{edgeIndex:.5},
    {fraction:0},{fraction:.01},{fraction:.99},{fraction:NaN},
    {clearanceM:0},{clearanceM:.02}])
    assert.throws(()=>split(input,options),/resampling settings|outside available/)
  const hidden=structuredClone(input)
  Object.defineProperty(hidden,'hidden', {value:123,enumerable:false})
  assert.throws(()=>split(hidden,{edgeIndex:0}),/hidden source/)
  const accessor=structuredClone(input)
  Object.defineProperty(accessor.verticesM[0],'0',{get(){throw Error('getter ran')}})
  assert.throws(()=>split(accessor,{edgeIndex:0}),/accessors/)
  const invalid=structuredClone(input)
  invalid.faces[0]=[0,0,1]
  assert.throws(()=>split(invalid,{edgeIndex:0}),/triangle/)
  const wrongCrease=structuredClone(input)
  wrongCrease.creaseEdges=[[0,2]]
  assert.throws(()=>split(wrongCrease,{edgeIndex:0}),/crease hinge/)
  const missingCrease=structuredClone(input)
  missingCrease.creaseEdges=[]
  assert.throws(()=>split(missingCrease,{edgeIndex:0}),/resampling mesh/)
  const withProvenance=split(input,{edgeIndex:0}).candidate
  withProvenance.newVertexProvenance[0].weights=[.1,.9]
  assert.throws(()=>split(withProvenance,{edgeIndex:0}),/provenance/)
  assert.equal(JSON.stringify(input),frozen)
})
