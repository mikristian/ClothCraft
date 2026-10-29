import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from
  '../src/core/backends/nativeSeamCandidateGate.js'
import {researchFoundationTeeJointTranslation20261025 as joint} from
  '../src/core/backends/nativeFoundationTeeJointTranslationResearch20261025.js'
import {screenNativeCoupledHingeTranslationInterval20261025 as screen} from
  '../src/core/backends/nativeCoupledHingeTranslationIntervalResearch20261025.js'

const A=[[.06,.04,0],[.08,.04,0],[.06,.06,0]]
const fixture=(B=A)=>({pieces:[
  {id:'a',particleIndices:[0,1,2],faces:[[0,1,2]]},
  {id:'b',particleIndices:[3,4,5],faces:[[0,1,2]]}],
  particles:[...A.map(position=>({pieceId:'a',position:[...position]})),
    ...B.map(position=>({pieceId:'b',position:[...position]}))]})
const hinge=(startRadians=-Math.PI/2,endRadians=Math.PI/2)=>({
  axisOriginM:[0,0,0],axisUnit:[0,0,1],startRadians,endRadians,
  movingVertices:[0,1,2]})
const motions=(h=hinge())=>({a:{translationM:[0,0,0]},
  b:{translationM:[0,0,0],hinge:h}})
const rotated=(points,angle)=>points.map(([x,y,z])=>[
  x*Math.cos(angle)-y*Math.sin(angle),
  x*Math.sin(angle)+y*Math.cos(angle),z])

test('independent oracle: both hinge endpoints clear, midpoint contact rejected',()=>{
  const p=fixture(),m=motions(),snapshot=JSON.stringify({p,m})
  for(const angle of [-Math.PI/2,Math.PI/2])
    assert.ok(measureNativeTriangleDistanceM(A,rotated(A,angle))>.02)
  assert.ok(measureNativeTriangleDistanceM(A,rotated(A,0))<1e-12)
  const r=screen(p,m)
  assert.equal(r.coupledInterpanelIntervalClear,false)
  assert.equal(r.blocker.reason,'sampled-contact')
  assert.equal(r.blocker.fraction,.5)
  assert.ok(r.blocker.distanceMm<1e-8)
  assert.equal(r.sweptCollisionCertified,false)
  assert.equal(JSON.stringify({p,m}),snapshot)
})

test('combined nonzero hinge and translation hides contact between clear endpoints',()=>{
  const drift=[.02,0,0]
  const B=A.map(p=>p.map((x,k)=>x-drift[k]/2))
  const p=fixture(B),m=motions()
  m.b.translationM=drift
  for(const [t,angle] of [[0,-Math.PI/2],[1,Math.PI/2]]){
    const world=rotated(B,angle).map(point=>point.map((x,k)=>x+drift[k]*t))
    assert.ok(measureNativeTriangleDistanceM(A,world)>.01)
  }
  // The hinge is about the origin; translating the *unrotated* base by half
  // the drift exactly cancels at t=1/2.
  const r=screen(p,m)
  assert.equal(r.coupledInterpanelIntervalClear,false)
  assert.equal(r.blocker.reason,'sampled-contact')
  assert.equal(r.blocker.fraction,.5)
  assert.ok(r.blocker.distanceMm<1e-8)
})

test('safe separated hinge and translation are conservatively cleared',()=>{
  const p=fixture(A.map(([x,y,z])=>[x,y,z+.5]))
  const m=motions()
  m.b.translationM=[.03,-.02,0]
  const r=screen(p,m)
  assert.equal(r.coupledInterpanelIntervalClear,true)
  assert.equal(r.totalPairs,1)
  assert.equal(r.certifiedPairs,1)
  assert.equal(r.prunedSweptBounds,1)
  assert.equal(r.physicalAcceptance,false)
  assert.equal(r.safeToAutoApply,false)
})

test('hinge must not distort faces across non-axis stationary vertices',()=>{
  const p=fixture(),m=motions()
  m.b.hinge.movingVertices=[0]
  assert.throws(()=>screen(p,m),/deform a material triangle/)
  const axisFixture=fixture([[0,0,0],[.05,0,0],[0,.05,0]])
  const axisMotion=motions({...hinge(0,Math.PI/2),movingVertices:[1,2],
    axisUnit:[0,1,0]})
  // Stationary vertex 0 lies exactly on the hinge axis; the whole face is rigid.
  assert.equal(typeof screen(axisFixture,axisMotion).coupledInterpanelIntervalClear,'boolean')
})

test('true two-triangle crease articulation is permitted only with axis-pinned shared vertices',()=>{
  const base=[[0,0,0],[0,.1,0],[-.1,0,0],[.1,0,0]]
  const far=[[0,0,.5],[.1,0,.5],[0,.1,.5]]
  const p={pieces:[{id:'a',particleIndices:[0,1,2,3],
    faces:[[0,1,2],[0,1,3]]},
    {id:'b',particleIndices:[4,5,6],faces:[[0,1,2]]}],
  particles:[...base.map(position=>({pieceId:'a',position})),
    ...far.map(position=>({pieceId:'b',position}))]}
  const m={a:{translationM:[0,0,0],hinge:{axisOriginM:[0,0,0],
    axisUnit:[0,1,0],startRadians:0,endRadians:Math.PI/2,
    movingVertices:[3]}},b:{translationM:[0,0,0]}}
  const snapshot=JSON.stringify({p,m})
  const r=screen(p,m)
  assert.equal(r.coupledInterpanelIntervalClear,true)
  assert.equal(r.totalPairs,2)
  assert.equal(JSON.stringify({p,m}),snapshot)
  p.particles[0].position=[.001,0,0]
  assert.throws(()=>screen(p,m),/deform a material triangle/)
})

test('malformed axes, moving sets, ownership and budgets fail closed',()=>{
  const p=fixture(),m=motions()
  for(const opts of [{clearanceM:-1},{maxDepth:13},{maxFacePairs:0},
    {maxDistanceEvaluations:0}])
    assert.throws(()=>screen(p,m,opts),/budget/)
  for(const bad of [{...hinge(),axisUnit:[0,0,2]},
    {...hinge(),movingVertices:[0,0]},
    {...hinge(),endRadians:Infinity},
    {...hinge(),movingVertices:[5]}])
    assert.throws(()=>screen(p,motions(bad)),/hinge/)
  const duplicate=structuredClone(p)
  duplicate.pieces[1].particleIndices[0]=0
  assert.throws(()=>screen(duplicate,m),/ownership/)
  const unowned=structuredClone(p)
  unowned.particles.push({pieceId:'a',position:[0,0,0]})
  assert.throws(()=>screen(unowned,m),/Unowned/)
  assert.throws(()=>screen(p,{a:m.a}),/inventory/)
  assert.throws(()=>screen(p,{...m,b:{translationM:[2,0,0]}}),/translation/)
})

test('bounded uncertain hinge trajectory is rejected without claiming CCD',()=>{
  const p=fixture(A.map(([x,y,z])=>[x+.023,y,z]))
  const m=motions(hinge(-.05,.05))
  const r=screen(p,m,{maxDepth:0})
  assert.equal(r.coupledInterpanelIntervalClear,false)
  assert.ok(['sampled-contact','unresolved-motion-bound'].includes(r.blocker.reason))
  assert.equal(r.sweptCollisionCertified,false)
  const limited=screen(p,m,{maxDistanceEvaluations:1})
  assert.equal(limited.coupledInterpanelIntervalClear,false)
  assert.equal(limited.blocker.reason,'work-budget')
})

test('real four-panel joint translation is rejected by composed interval screen',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const snapshot=JSON.stringify({project,payload})
  const candidate=joint(project,payload)
  const motion=Object.fromEntries(payload.pieces.map(piece=>[
    piece.id,{translationM:candidate.translationsM[piece.id]}]))
  const start=performance.now()
  const r=screen(payload,motion)
  const runtimeMs=performance.now()-start
  assert.equal(r.coupledInterpanelIntervalClear,false)
  assert.equal(r.blocker.reason,'sampled-contact')
  const a=payload.pieces.find(p=>p.id===r.blocker.pieceA)
  const b=payload.pieces.find(p=>p.id===r.blocker.pieceB)
  const at=(piece,face)=>piece.faces[face].map(vertex=>{
    const p=payload.particles[piece.particleIndices[vertex]].position
    return p.map((x,k)=>x+candidate.translationsM[piece.id][k]*r.blocker.fraction)
  })
  const d=measureNativeTriangleDistanceM(at(a,r.blocker.faceA),at(b,r.blocker.faceB))*1000
  assert.ok(Math.abs(d-r.blocker.distanceMm)<1e-8)
  assert.ok(d<=1)
  const before=measureNativeSeamResiduals(payload)
  const after=measureNativeSeamResiduals(candidate.candidatePayload)
  const strain=auditNativePrincipalStrain(candidate.candidatePayload,{limitPercent:5})
  assert.ok(after.maxGapMm<before.maxGapMm&&after.rmsGapMm<before.rmsGapMm)
  assert.equal(strain.withinDeclaredStrainLimit,false)
  assert.equal(JSON.stringify({project,payload}),snapshot)
  assert.equal(r.physicalAcceptance,false)
  console.log('FOUR_PANEL_COMPOSED_INTERVAL '+JSON.stringify({
    before:{maxGapMm:before.maxGapMm,rmsGapMm:before.rmsGapMm},
    after:{maxGapMm:after.maxGapMm,rmsGapMm:after.rmsGapMm},
    principalExtensionPercent:strain.maximumPrincipalExtensionPercent,
    principalCompressionPercent:strain.maximumPrincipalCompressionPercent,
    blocker:r.blocker,totalPairs:r.totalPairs,
    distanceEvaluations:r.distanceEvaluations,runtimeMs:+runtimeMs.toFixed(2),
    contactValidity:false,sourceNonmutation:true,physicalAcceptance:false}))
})
