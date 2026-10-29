import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {evaluateNativeUnderarmCreaseFoldContactResearch} from
  '../src/core/backends/nativeUnderarmCreaseFoldContactResearch.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {diagnoseNativeCreaseRestContactProvenance20261024 as diagnose} from
  '../src/core/backends/nativeCreaseRestContactProvenanceResearch20261024.js'

const angle=5*Math.PI/12
const synthetic=(left,right)=>({panelId:'synthetic',originalVertexCount:6,
  verticesM:[...left,...right].map(p=>[...p]),faces:[[0,1,2],[3,4,5]],
  newVertexProvenance:[]})
const rotate=(p,a)=>p[0]>1e-8?
  [p[0]*Math.cos(a),p[1],p[0]*Math.sin(a)]:[...p]
const independentIll=(piece)=>piece.faces.reduce((n,face)=>{
  const [a,b,c]=face.map(i=>piece.verticesM[i])
  const twice=Math.abs((b[0]-a[0])*(c[1]-a[1])-
    (b[1]-a[1])*(c[0]-a[0]))
  const longest=Math.max(...[[a,b],[b,c],[c,a]].map(([x,y])=>
    Math.hypot(x[0]-y[0],x[1]-y[1])))
  const altitude=twice/longest
  return n+(altitude<.002||longest/altitude>25?1:0)
},0)

test('pre-existing static clearance violation is not misreported as fold-induced',()=>{
  const p=synthetic([[-2,0,0],[-1,0,0],[-2,1,0]],
    [[-.9995,0,0],[-.1,0,0],[-.1,1,0]])
  const frozen=JSON.stringify(p)
  const out=diagnose(p,{faceA:0,faceB:1,angleRadians:angle})
  assert.ok(out.restSeparationMm<1)
  assert.ok(out.foldSeparationMm<1)
  assert.equal(out.preExistingRestClearanceBlocker,true)
  assert.equal(out.foldIntroducedClearanceBlocker,false)
  assert.equal(out.clearanceRuleRelaxed,false)
  assert.equal(out.physicalAcceptance,false)
  assert.equal(JSON.stringify(p),frozen)
})

test('separate fold-introduced contact is distinguished from a clear rest pose',()=>{
  const p=synthetic([[1,0,0],[2,0,0],[1,1,0]],
    [[-1,0,0],[-2,0,0],[-1,1,0]])
  const out=diagnose(p,{faceA:0,faceB:1,angleRadians:Math.PI})
  assert.ok(out.restSeparationMm>1000)
  assert.ok(out.foldSeparationMm<1e-6)
  assert.equal(out.preExistingRestClearanceBlocker,false)
  assert.equal(out.foldIntroducedClearanceBlocker,true)
  assert.equal(out.materialFaceEdgeHops,null)
  assert.equal(out.sweptCollisionCertified,false)
})

test('invalid face topology, provenance and witness settings reject safely',()=>{
  const p=synthetic([[1,0,0],[2,0,0],[1,1,0]],
    [[-1,0,0],[-2,0,0],[-1,1,0]])
  for(const settings of [{faceA:0,faceB:0},{faceA:-1,faceB:1},
    {faceA:0,faceB:2},{faceA:0,faceB:1,clearanceM:0},
    {faceA:0,faceB:1,angleRadians:Math.PI+1}])
    assert.throws(()=>diagnose(p,settings),/Invalid bounded crease witness/)
  const missing=structuredClone(p)
  missing.originalVertexCount=5
  assert.throws(()=>diagnose(missing,{faceA:0,faceB:1}),/Missing crease intersection provenance/)
  const degenerate=structuredClone(p)
  degenerate.faces[1]=[3,3,5]
  assert.throws(()=>diagnose(degenerate,{faceA:0,faceB:1}),/Invalid crease witness face/)
  const adjacent=structuredClone(p)
  adjacent.faces[1]=[0,4,5]
  assert.throws(()=>diagnose(adjacent,{faceA:0,faceB:1}),/disjoint material faces/)
})

test('real Foundation Tee contact witness is already sub-thickness in the flat rest mesh',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const projectBefore=JSON.stringify(project),payloadBefore=JSON.stringify(payload)
  const panels=refineNativeUnderarmCreaseMeshResearch(payload).panels
  const started=performance.now()
  const result=panels.map(piece=>{
    const before=JSON.stringify(piece)
    const out=diagnose(piece,{faceA:97,faceB:104,angleRadians:angle})
    const rest=piece.faces.map(face=>face.map(i=>piece.verticesM[i]))
    const folded=piece.faces.map(face=>face.map(i=>rotate(piece.verticesM[i],angle)))
    const independentlyRest=measureNativeTriangleDistanceM(rest[97],rest[104])*1000
    const independentlyFolded=measureNativeTriangleDistanceM(folded[97],folded[104])*1000
    assert.ok(Math.abs(out.restSeparationMm-independentlyRest)<1e-9)
    assert.ok(Math.abs(out.foldSeparationMm-independentlyFolded)<1e-9)
    assert.ok(Math.abs(out.restSeparationMm-.58361846956)<1e-6)
    assert.ok(Math.abs(out.foldSeparationMm-.58361846956)<1e-6)
    assert.equal(out.preExistingRestClearanceBlocker,true)
    assert.equal(out.foldIntroducedClearanceBlocker,false)
    assert.equal(out.illConditionedFaceCount,independentIll(piece))
    assert.equal(out.illConditionedFaceCount,15)
    assert.equal(out.illConditionedCreaseFaceCount,15)
    assert.equal(out.illConditionedGeneratedFaceCount,15)
    assert.equal(out.illConditionedBoundaryFaceCount,0)
    assert.ok(out.witnessFaceQuality.every(q=>q.illConditioned))
    assert.ok(out.prioritizedCreaseNodes.some(v=>v.witnessFaceIncidence>0))
    assert.equal(out.meshRepairPerformed,false)
    assert.equal(out.contactCertified,false)
    assert.equal(out.sweptCollisionCertified,false)
    assert.equal(out.physicalAcceptance,false)
    assert.equal(JSON.stringify(piece),before)
    return {panelId:piece.panelId,restGapMm:out.restSeparationMm,
      foldGapMm:out.foldSeparationMm,clearanceDeficitMm:out.restClearanceDeficitMm,
      materialFaceEdgeHops:out.materialFaceEdgeHops,
      slivers:out.illConditionedFaceCount,
      sliversTouchCrease:out.illConditionedCreaseFaceCount,
      sliversTouchGeneratedVertices:out.illConditionedGeneratedFaceCount,
      witnessFaces:out.witnessFaceQuality.map(q=>({face:q.faceIndex,
        altitudeMm:q.altitudeMm,aspect:q.aspect})),
      prioritizedCreaseNodes:out.prioritizedCreaseNodes.slice(0,4)}
  })
  const folded=evaluateNativeUnderarmCreaseFoldContactResearch(payload,{
    anglesRadians:[0,angle]})
  for(const panel of folded.panels){
    const flat=panel.poses[0],pose=panel.poses[1]
    assert.ok(Math.abs(flat.maxGapMm-345)<1e-6)
    assert.ok(pose.maxGapMm<flat.maxGapMm)
    assert.ok(pose.rmsGapMm<flat.rmsGapMm)
    assert.ok(pose.maximumPrincipalExtensionPercent<1e-8)
    assert.ok(pose.maximumPrincipalCompressionPercent<1e-8)
    assert.equal(pose.staticContactClear,false)
    assert.equal(pose.researchAccepted,false)
  }
  assert.equal(JSON.stringify(project),projectBefore)
  assert.equal(JSON.stringify(payload),payloadBefore)
  console.log('CREASE_REST_CONTACT_PROVENANCE_QA '+JSON.stringify({
    panels:result,flatMaxSeamMm:folded.panels[0].poses[0].maxGapMm,
    flatRmsSeamMm:folded.panels[0].poses[0].rmsGapMm,
    foldedMaxSeamMm:folded.panels[0].poses[1].maxGapMm,
    foldedRmsSeamMm:folded.panels[0].poses[1].rmsGapMm,
    maxPrincipalExtensionPercent:folded.panels[0].poses[1].maximumPrincipalExtensionPercent,
    maxPrincipalCompressionPercent:folded.panels[0].poses[1].maximumPrincipalCompressionPercent,
    staticContactClear:false,sourceNonmutation:true,physicalAcceptance:false,
    runtimeMs:+(performance.now()-started).toFixed(3)}))
})
