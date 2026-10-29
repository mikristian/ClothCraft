// Independent opt-in QA for constraint rebuilding after certified static
// clearance edge flips. No live solver, garment save or UI change.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {searchNativeClearanceAwareMaterialFlips} from '../src/core/physics/nativeClearanceAwareFlipResearch.js'
import {rebuildNativeResearchFlipConstraintGraph} from '../src/core/physics/nativeFlipConstraintGraphResearch.js'
import {rejectedOffbodyDiagnosticPose} from './fixtures/exoRejectedOffbodyPose20261023.mjs'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const snap=x=>JSON.stringify(x)
function setup(){
  const project=createTemplateProject('tee')
  const baseline=buildNativeSimulationPayload(project,{quality:'quality'})
  const hinges=discoverNativeDevelopableHinges(baseline,{maxResults:128})
  const axes=Object.fromEntries(baseline.pieces.map(piece=>{
    const h=hinges.returned.find(h=>h.panelId===piece.id&&h.worldAxisAligned&&h.side==='positive')
    assert.ok(h)
    return [piece.id,[h.axisVertices]]
  }))
  const payload=buildNativeSimulationPayload(project,{quality:'quality',
    experimentalOptimizeMesh:true,experimentalProtectedHingeAxesByPiece:axes,
    experimentalCertifiedPoorFaceFlips:true})
  const pose=rejectedOffbodyDiagnosticPose(payload)
  const faces={},protectedEdgesByPiece={}
  for(const piece of pose.pieces.filter(p=>['front','back'].includes(p.id))){
    const mesh={vertices:piece.flatVerticesM.map(p=>[p[0]*100,p[1]*100]),faces:piece.faces}
    const protectedEdges=materialHingeProtectedEdges(mesh,axes[piece.id][0])
    const world=piece.particleIndices.map(i=>pose.particles[i].position)
    const flip=searchNativeClearanceAwareMaterialFlips(mesh,world,{protectedEdges,maxCandidates:12})
    assert.ok(flip.best)
    faces[piece.id]=flip.best.mesh.faces
    protectedEdgesByPiece[piece.id]=protectedEdges
  }
  return {project,payload,pose,faces,protectedEdgesByPiece}
}
const structural=p=>new Set(p.constraints.filter(c=>c.type==='structural').map(c=>key(c.a,c.b)))
const faces=p=>new Set(p.pieces.flatMap(piece=>piece.faces.flatMap(([a,b,c])=>
  [[a,b],[b,c],[c,a]].map(([i,j])=>key(piece.particleIndices[i],piece.particleIndices[j])))))
const bends=p=>p.constraints.filter(c=>c.type==='bend')
const independentBends=p=>{
  const expected=new Map()
  for(const piece of p.pieces){
    const edgeOwners=new Map()
    for(const [a,b,c] of piece.faces)for(const [i,j,opposite] of
      [[a,b,c],[b,c,a],[c,a,b]]){
      const id=key(i,j)
      if(!edgeOwners.has(id))edgeOwners.set(id,[])
      edgeOwners.get(id).push(opposite)
    }
    for(const owners of edgeOwners.values())if(owners.length===2){
      const id=key(piece.particleIndices[owners[0]],piece.particleIndices[owners[1]])
      expected.set(id,(expected.get(id)||0)+1)
    }
  }
  return expected
}

test('four-panel certified flips regenerate complete structural/bend graph and exclusions without mutation',()=>{
  const {project,payload,pose,faces:flips,protectedEdgesByPiece}=setup()
  const original=[snap(project),snap(payload),snap(pose)]
  const before={seams:measureNativeSeamResiduals(pose),
    strain:auditNativePrincipalStrain(pose),
    self:inspectNativeIntrapanelStaticContact(pose),
    inter:inspectNativeInterpanelExactStaticContact(pose),
    avatar:inspectStagedAvatarContact(pose)}
  const started=performance.now()
  const rebuilt=rebuildNativeResearchFlipConstraintGraph(pose,flips,{protectedEdgesByPiece})
  const runtimeMs=performance.now()-started
  const result=rebuilt.candidate
  const after={seams:measureNativeSeamResiduals(result),
    strain:auditNativePrincipalStrain(result),
    self:inspectNativeIntrapanelStaticContact(result),
    inter:inspectNativeInterpanelExactStaticContact(result),
    avatar:inspectStagedAvatarContact(result)}
  assert.equal(rebuilt.constraintsRegenerated,true)
  assert.equal(rebuilt.collisionExclusionsRegenerated,true)
  assert.equal(rebuilt.safeToAutoApply,false)
  assert.deepEqual(structural(result),faces(result))
  assert.equal(structural(result).size,structural(pose).size)
  assert.equal(bends(result).length,bends(pose).length)
  const expectedBends=independentBends(result),actualBends=new Map()
  for(const c of bends(result)){
    const id=key(c.a,c.b)
    actualBends.set(id,(actualBends.get(id)||0)+1)
  }
  assert.deepEqual(actualBends,expectedBends,
    'Independent hinge-opposite multiset must match rebuilt bend springs')
  assert.equal(rebuilt.changed.length,2)
  assert.equal(rebuilt.changed.reduce((s,c)=>s+c.addedStructural.length,0),2)
  assert.equal(rebuilt.changed.reduce((s,c)=>s+c.removedStructural.length,0),2)
  assert.ok(rebuilt.changed.some(c=>c.changedBend>0))
  for(const c of result.constraints.filter(c=>['structural','bend'].includes(c.type))){
    assert.ok(Number.isFinite(c.rest)&&c.rest>0)
    assert.ok(Math.abs(c.stiffness-(12000+488000*c.sourceStiffness**4))<1e-5)
    const piece=result.pieces.find(piece=>piece.particleIndices.includes(c.a))
    assert.ok(piece?.particleIndices.includes(c.b))
    const a=piece.flatVerticesM[piece.particleIndices.indexOf(c.a)]
    const b=piece.flatVerticesM[piece.particleIndices.indexOf(c.b)]
    assert.ok(Math.abs(c.rest-Math.hypot(a[0]-b[0],a[1]-b[1]))<1e-9,
      'Independently computed material rest length must match each spring')
  }
  assert.equal(after.self.nonadjacentNearClearancePairs,0)
  assert.equal(after.self.intersectingTrianglePairs,0)
  assert.equal(after.inter.nearClearancePairs,0)
  assert.equal(after.avatar.penetrating,0)
  assert.equal(after.seams.maxGapMm,before.seams.maxGapMm)
  assert.equal(after.seams.rmsGapMm,before.seams.rmsGapMm)
  assert.ok(Math.abs(after.strain.maximumPrincipalExtensionPercent-
    before.strain.maximumPrincipalExtensionPercent)<1e-7)
  assert.ok(Math.abs(after.strain.maximumPrincipalCompressionPercent-
    before.strain.maximumPrincipalCompressionPercent)<1e-7)
  assert.deepEqual([snap(project),snap(payload),snap(pose)],original)
  console.log('RESEARCH_FLIP_CONSTRAINT_GRAPH '+JSON.stringify({
    maxGapMmBefore:before.seams.maxGapMm,maxGapMmAfter:after.seams.maxGapMm,
    rmsGapMmBefore:before.seams.rmsGapMm,rmsGapMmAfter:after.seams.rmsGapMm,
    principalExtensionPercent:after.strain.maximumPrincipalExtensionPercent,
    principalCompressionPercent:after.strain.maximumPrincipalCompressionPercent,
    staticNearClearanceBefore:before.self.nonadjacentNearClearancePairs,
    staticNearClearanceAfter:after.self.nonadjacentNearClearancePairs,
    staticIntersectionsAfter:after.self.intersectingTrianglePairs,
    staticInterpanelNearPairs:after.inter.nearClearancePairs,
    sampledAvatarPenetrations:after.avatar.penetrating,
    structuralSprings:structural(result).size,bendSprings:bends(result).length,
    changed:rebuilt.changed.map(c=>({panel:c.panelId,removedStructural:c.removedStructural.length,
      addedStructural:c.addedStructural.length,changedBend:c.changedBend})),
    collisionExclusions:result.collisionExclusions.length,
    runtimeMs:+runtimeMs.toFixed(2),originalStateUnchanged:true,
    solverAccepted:false,continuousCollisionCertified:false,
  }))
})

test('refuses corrupted structural rest lengths and does not modify input',()=>{
  const {pose,faces,protectedEdgesByPiece}=setup(),altered=structuredClone(pose)
  altered.constraints.find(c=>c.type==='structural').rest+=.0001
  const snapshot=snap(altered)
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(altered,faces,{protectedEdgesByPiece}),
    /Non-isometric spring rest/)
  assert.equal(snap(altered),snapshot)
})

test('refuses stale collision exclusions and duplicated bend springs',()=>{
  const {pose,faces,protectedEdgesByPiece}=setup()
  const exclusions=structuredClone(pose)
  exclusions.collisionExclusions.pop()
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(exclusions,faces,{protectedEdgesByPiece}),
    /exclusions do not match/)
  const springs=structuredClone(pose)
  springs.constraints.push({...springs.constraints.find(c=>c.type==='bend')})
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(springs,faces,{protectedEdgesByPiece}),
    /bend constraint count/)
})

test('refuses nonplanar material coordinates and inconsistent directional stiffness',()=>{
  const {pose,faces,protectedEdgesByPiece}=setup()
  const nonplanar=structuredClone(pose)
  nonplanar.pieces[0].flatVerticesM[0][2]=.01
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(nonplanar,faces,{protectedEdgesByPiece}),
    /planar material/)
  const stiffness=structuredClone(pose)
  const spring=stiffness.constraints.find(c=>c.type==='structural')
  spring.sourceStiffness*=.9
  spring.stiffness=12000+488000*spring.sourceStiffness**4
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(stiffness,faces,{protectedEdgesByPiece}),
    /Ambiguous directional spring stiffness/)
})

test('refuses unknown panels, over-budget proposals and protected-edge removal',()=>{
  const {pose,faces,protectedEdgesByPiece}=setup()
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(pose,{'not-a-panel':faces.front}),
    /Unknown research panel/)
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(pose,faces,{maxChangedPanels:1}),
    /bounded changed-panel/)
  const blocked=structuredClone(protectedEdgesByPiece)
  const original=pose.pieces.find(p=>p.id==='front')
  const oldEdges=faces.front.flatMap(f=>[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]])
  const removed=original.faces.flatMap(f=>[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]])
    .find(([a,b])=>!oldEdges.some(([c,d])=>key(a,b)===key(c,d)))
  blocked.front.push(removed)
  assert.throws(()=>rebuildNativeResearchFlipConstraintGraph(pose,faces,{protectedEdgesByPiece:blocked}),
    /Protected material edge removed/)
})
