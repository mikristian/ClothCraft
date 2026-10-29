import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from
  '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {researchFoundationTeeSleeveCreaseMesh20261025 as split} from
  '../src/core/backends/nativeSleeveCreaseConformingMeshResearch20261025.js'
import {researchFoundationTeeSleeveQualityContact20261025 as improve,
  optimizeCreaseSplitQualityContactResearch20261025 as optimize} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {searchCertifiedPoorFaceFlips} from '../src/core/physics/materialRetriangulationResearch.js'

const make=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const edge=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const twiceArea=(v,[a,b,c])=>(v[b][0]-v[a][0])*(v[c][1]-v[a][1])-
  (v[b][1]-v[a][1])*(v[c][0]-v[a][0])
const boundary=faces=>{
  const edges=new Map()
  for(const f of faces)for(let k=0;k<3;k++){
    const key=edge(f[k],f[(k+1)%3]);edges.set(key,(edges.get(key)||0)+1)
  }
  assert.ok([...edges.values()].every(n=>n<=2))
  return [...edges].filter(([,n])=>n===1).map(([key])=>key).sort()
}
const contact=mesh=>inspectNativeIntrapanelStaticContact({
  particles:mesh.worldVerticesM.map(position=>({position})),
  pieces:[{id:'independent-contact',particleIndices:mesh.worldVerticesM.map((_,i)=>i),
    faces:mesh.faces}],
},{clearanceM:.001,maxPairs:600000})
const strain=mesh=>auditNativePrincipalStrain({
  particles:mesh.worldVerticesM.map(position=>({position})),
  pieces:[{id:'independent-strain',particleIndices:mesh.worldVerticesM.map((_,i)=>i),
    flatVerticesM:mesh.flatVerticesM,faces:mesh.faces}],
})
const metrics=['intersectingTrianglePairs','edgeNeighborNearFoldoverPairs',
  'nonadjacentNearClearancePairs']

test('real Foundation Tee sleeves improve rest quality without worsening static contact',()=>{
  const payload=make(),snapshot=JSON.stringify(payload)
  const baselineSeams=measureNativeSeamResiduals(payload)
  assert.equal(baselineSeams.pairCount,102)
  const t0=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const before=split(payload,id),after=improve(payload,id)
    const beforeContact=contact(before),afterContact=contact(after)
    const beforeStrain=strain(before),afterStrain=strain(after)
    assert.equal(after.beforeQuality.illConditionedFaces,46)
    assert.equal(after.afterQuality.illConditionedFaces,27)
    assert.equal(after.accepted.length,13)
    assert.equal(after.faces.length,178)
    assert.equal(after.flatVerticesM.length,112)
    assert.equal(after.protectedCreaseEdges.length,20)
    assert.equal(after.scanned,3150)
    assert.equal(after.contactChecked,21)
    assert.equal(after.budgetExhausted,false)
    assert.deepEqual(after.flatVerticesM,before.flatVerticesM)
    assert.deepEqual(after.worldVerticesM,before.worldVerticesM)
    assert.deepEqual(after.vertexProvenance,before.vertexProvenance)
    assert.deepEqual(boundary(after.faces),boundary(before.faces))
    assert.deepEqual(after.originalBoundaryEdges,boundary(before.faces))
    assert.ok(after.protectedCreaseEdges.every(([a,b])=>
      after.faces.some(f=>f.some((i,k)=>edge(i,f[(k+1)%3])===edge(a,b)))))
    assert.ok(after.faceSourceLineage.every(x=>x.length>=1&&
      x.every(i=>Number.isInteger(i)&&i>=0&&i<before.originalFaceCount)))
    let beforeArea=0,afterArea=0
    for(const f of before.faces)beforeArea+=twiceArea(before.flatVerticesM,f)
    for(const f of after.faces){
      afterArea+=twiceArea(after.flatVerticesM,f)
      const signed=f.map(i=>{
        const p=after.flatVerticesM[i],d=before.creaseDirection,
          o=before.creaseOriginM
        return d[0]*(p[1]-o[1])-d[1]*(p[0]-o[0])
      })
      assert.ok(!(signed.some(x=>x>1e-8)&&signed.some(x=>x< -1e-8)))
    }
    assert.ok(Math.abs(afterArea-beforeArea)<1e-12)
    assert.equal(after.afterQuality.maximumAspect,after.beforeQuality.maximumAspect)
    assert.equal(after.afterQuality.minimumAltitudeM,after.beforeQuality.minimumAltitudeM)
    for(const k of metrics){
      assert.equal(after.beforeContact[k],beforeContact[k])
      assert.equal(after.afterContact[k],afterContact[k])
      assert.ok(afterContact[k]<=beforeContact[k])
    }
    assert.equal(after.staticContactValid,false)
    assert.equal(after.physicalAcceptance,false)
    assert.equal(after.safeToAutoApply,false)
    assert.equal(after.solverConstraintsRebuilt,false)
    assert.equal(after.continuousContactCertified,false)
    assert.equal(afterStrain.degenerateTriangles,0)
    assert.equal(afterStrain.maximumPrincipalExtensionPercent,
      beforeStrain.maximumPrincipalExtensionPercent)
    assert.equal(afterStrain.maximumPrincipalCompressionPercent,
      beforeStrain.maximumPrincipalCompressionPercent)
    assert.equal(beforeStrain.overLimitTriangles,173)
    assert.equal(afterStrain.overLimitTriangles,171)
    assert.equal(afterStrain.withinDeclaredStrainLimit,false)
    console.log('CREASE_QUALITY_CONTACT '+JSON.stringify({id,
      poorFaces:[46,27],flips:after.accepted.length,
      contact:Object.fromEntries(metrics.map(k=>[k,[beforeContact[k],afterContact[k]]])),
      principalExtensionPercent:afterStrain.maximumPrincipalExtensionPercent,
      principalCompressionPercent:afterStrain.maximumPrincipalCompressionPercent,
      strainOverLimitTriangles:[173,171],solverReady:false}))
  }
  assert.deepEqual(measureNativeSeamResiduals(payload),baselineSeams)
  assert.equal(JSON.stringify(payload),snapshot)
  console.log('CREASE_QUALITY_CONTACT_RUNTIME '+JSON.stringify({
    runtimeMs:+(performance.now()-t0).toFixed(2),sourceNonmutation:true,
    sewingPairsUnchanged:102}))
})

test('independent unconstrained flips worsen near contact; contact-aware flips veto it',()=>{
  const payload=make(),before=split(payload,'sleeve-left')
  const signed=p=>before.creaseDirection[0]*(p[1]-before.creaseOriginM[1])-
    before.creaseDirection[1]*(p[0]-before.creaseOriginM[0])
  const edges=new Map()
  for(const f of before.faces)for(let k=0;k<3;k++){
    const a=f[k],b=f[(k+1)%3];edges.set(edge(a,b),[a,b])
  }
  const protectedEdges=[...edges.values()].filter(([a,b])=>
    Math.abs(signed(before.flatVerticesM[a]))<=1e-8&&
    Math.abs(signed(before.flatVerticesM[b]))<=1e-8)
  const unconstrained=searchCertifiedPoorFaceFlips({
    vertices:before.flatVerticesM.map(([x,y])=>[x*100,y*100]),faces:before.faces,
  },{protectedEdges,maxFlips:16,maxCandidates:10000})
  const unconstrainedContact=contact({...before,faces:unconstrained.mesh.faces})
  const guarded=optimize(before)
  assert.equal(unconstrained.finalPoor,26)
  assert.equal(unconstrainedContact.nonadjacentNearClearancePairs,42)
  assert.equal(guarded.afterQuality.illConditionedFaces,27)
  assert.equal(guarded.afterContact.nonadjacentNearClearancePairs,37)
})

test('detached four-panel audit distinguishes split baseline from original physical contact',()=>{
  const original=make(),snapshot=JSON.stringify(original)
  const variants=[]
  for(const [label,makeSleeve] of [['crease-split',split],['contact-aware',improve]]){
    const candidate=structuredClone(original)
    for(const id of ['sleeve-left','sleeve-right']){
      const research=makeSleeve(original,id),piece=candidate.pieces.find(p=>p.id===id)
      for(let i=research.originalVertexCount;i<research.worldVerticesM.length;i++){
        piece.particleIndices.push(candidate.particles.length)
        candidate.particles.push({position:[...research.worldVerticesM[i]]})
      }
      piece.flatVerticesM=research.flatVerticesM
      piece.faces=research.faces
    }
    const seam=measureNativeSeamResiduals(candidate)
    const spectral=auditNativePrincipalStrain(candidate)
    const intra=inspectNativeIntrapanelStaticContact(candidate,
      {clearanceM:.001,maxPairs:500000})
    const inter=inspectNativeInterpanelExactStaticContact(candidate,
      {clearanceM:.001,maxPairs:500000})
    assert.equal(candidate.particles.length,534)
    assert.equal(spectral.triangleCount,836)
    assert.equal(seam.pairCount,102)
    assert.equal(seam.maxGapMm,188.45206211145043)
    assert.equal(seam.rmsGapMm,117.40026834455178)
    assert.equal(spectral.maximumPrincipalExtensionPercent,7933.803349125475)
    assert.equal(spectral.maximumPrincipalCompressionPercent,89.04079256830012)
    assert.equal(spectral.withinDeclaredStrainLimit,false)
    assert.equal(intra.intersectingTrianglePairs,6)
    // Bidirectional hinge-thickness screening now catches 18 additional
    // asymmetric near-foldovers that the one-sided screen missed.
    assert.equal(intra.edgeNeighborNearFoldoverPairs,68)
    assert.equal(intra.nonadjacentNearClearancePairs,303)
    assert.equal(inter.nearClearancePairs,122)
    variants.push({label,intersections:intra.intersectingTrianglePairs,
      nearClearance:intra.nonadjacentNearClearancePairs,
      maxGapMm:seam.maxGapMm,rmsGapMm:seam.rmsGapMm,
      principalExtensionPercent:spectral.maximumPrincipalExtensionPercent})
  }
  const originalContact=inspectNativeIntrapanelStaticContact(original,
    {clearanceM:.001,maxPairs:500000})
  assert.equal(originalContact.nonadjacentNearClearancePairs,231)
  assert.equal(originalContact.edgeNeighborNearFoldoverPairs,62)
  assert.equal(JSON.stringify(original),snapshot)
  console.log('CREASE_FULL_TEE_REJECTION '+JSON.stringify({
    originalNearClearance:231,originalNearFoldovers:62,variants,
    physicalAcceptance:false,sourceNonmutation:true}))
})

test('bounded and malformed previews fail closed without changing caller objects',()=>{
  const before=split(make(),'sleeve-left'),snapshot=JSON.stringify(before)
  assert.throws(()=>optimize(before,{maxFlips:17}),/budgets/)
  assert.throws(()=>optimize(before,{maxCandidates:6001}),/budgets/)
  assert.throws(()=>optimize(before,{maxContactChecks:0}),/budgets/)
  assert.throws(()=>optimize(before,{clearanceM:Infinity}),/budgets/)
  const noFlips=optimize(before,{maxFlips:0})
  assert.deepEqual(noFlips.faces,before.faces)
  assert.equal(noFlips.accepted.length,0)
  const budget=optimize(before,{maxCandidates:1,maxFlips:16})
  assert.ok(budget.scanned<=1)
  assert.equal(budget.budgetExhausted,true)
  const invalid=structuredClone(before)
  invalid.faces[0]=[0,0,1]
  assert.throws(()=>optimize(invalid),/face/)
  const wrongWinding=structuredClone(before)
  wrongWinding.faces[1]=[...wrongWinding.faces[1]].reverse()
  assert.throws(()=>optimize(wrongWinding),/winding/)
  const crossing=structuredClone(before)
  const ys=crossing.faces[0].map(i=>crossing.flatVerticesM[i][1])
  const xs=crossing.faces[0].map(i=>crossing.flatVerticesM[i][0])
  if(Math.max(...ys)-Math.min(...ys)>1e-5){
    crossing.creaseDirection=[1,0]
    crossing.creaseOriginM=[0,(Math.min(...ys)+Math.max(...ys))/2]
  }else{
    crossing.creaseDirection=[0,1]
    crossing.creaseOriginM=[(Math.min(...xs)+Math.max(...xs))/2,0]
  }
  assert.throws(()=>optimize(crossing),/preview|crossing|contact/)
  const badWorld=structuredClone(before)
  badWorld.worldVerticesM[0][0]=NaN
  assert.throws(()=>optimize(badWorld),/preview/)
  assert.equal(JSON.stringify(before),snapshot)
})

test('independent adversarial source T-junction, duplicate and overlapping faces are refused',()=>{
  const preview=(vertices,faces)=>({
    flatVerticesM:vertices.map(([x,y])=>[x,y,0]),
    worldVerticesM:vertices.map(([x,y])=>[x,y,0]),
    faces,creaseOriginM:[0,-1],creaseDirection:[1,0],
    originalVertexCount:vertices.length,originalFaceCount:faces.length,
    vertexProvenance:vertices.map((_,i)=>({kind:'original',originalVertex:i})),
    sourceFaceIndices:faces.map((_,i)=>i),
  })
  const tJunction=preview([[0,0],[1,0],[1,1],[0,1],[.5,.5]],
    [[0,1,2],[0,2,3]])
  assert.throws(()=>optimize(tJunction,{maxFlips:0}),/T-junction/)
  const duplicate=preview([[0,0],[1,0],[0,1],[2,2]],
    [[0,1,2],[2,1,0]])
  assert.throws(()=>optimize(duplicate,{maxFlips:0}),/Orphan vertex|Duplicate overlapping/)
  const duplicateNoOrphan=preview([[0,0],[1,0],[0,1],[2,2],[3,2],[2,3]],
    [[0,1,2],[2,1,0],[3,4,5]])
  assert.throws(()=>optimize(duplicateNoOrphan,{maxFlips:0}),/Duplicate overlapping/)
  const orphan=preview([[0,0],[1,0],[0,1],[2,2],[3,2],[2,3],[4,4]],
    [[0,1,2],[3,4,5]])
  assert.throws(()=>optimize(orphan,{maxFlips:0}),/Orphan vertex/)
  const overlap=preview([[0,0],[2,0],[0,2],[.2,.2],[1.2,.2],[.2,1.2]],
    [[0,1,2],[3,4,5]])
  assert.throws(()=>optimize(overlap,{maxFlips:0}),/Overlapping crease material/)
  const provenance=structuredClone(overlap)
  provenance.vertexProvenance[0]={kind:'original',originalVertex:1}
  assert.throws(()=>optimize(provenance,{maxFlips:0}),/provenance/)
  const badCut=preview([[0,0],[2,0],[0,2],[1,0]],[[0,1,2],[0,2,3]])
  badCut.originalVertexCount=3
  badCut.vertexProvenance[3]={kind:'edge-intersection',edge:[0,1],weights:[.1,.9]}
  assert.throws(()=>optimize(badCut,{maxFlips:0}),/provenance/)
})
