import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {deriveFoundationTeeSewingInventoryResearch20261024 as derive} from
  '../src/core/backends/nativeFoundationTeeSewingInventoryResearch20261024.js'
import {screenNativeCoupledCreaseAnglePath20261024 as screen} from
  '../src/core/backends/nativeCoupledCreaseAnglePathResearch20261024.js'

const fixture=()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  return {project,payload}
}
const smallMaterial=[[-.03,0,0],[0,0,0],[.03,0,0],
  [-.03,.1,0],[0,.1,0],[.03,.1,0]]
const smallFaces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
// Only the vertex-count and sewing-index ranges of these diagnostic panels
// reflect the real tee. Their flat triangles are deliberately SYNTHETIC.
const syntheticPanelsForIndexCoverage=payload=>payload.pieces.map((piece,i)=>{
  const verticesM=Array.from({length:piece.particleIndices.length},(_,j)=>
    smallMaterial[j]?[...smallMaterial[j]]:[.1+j*.001,.2,0])
  return {panelId:piece.id,verticesM,
    worldPositionsM:verticesM.map(([x,y])=>[x,y,i*.2]),
    faces:smallFaces.map(f=>[...f]),creaseEdges:[[1,4]]}
})

test('canonical tee has all 14 authored seam groups and 102 native sewing samples',()=>{
  const {project,payload}=fixture()
  const before=JSON.stringify({project,payload})
  const inventory=derive(project,payload)
  assert.equal(inventory.seamGroupCount,14)
  assert.equal(inventory.sewingPairCount,102)
  assert.equal(inventory.crossPanelPairCount,92)
  assert.equal(inventory.intraPanelPairCount,10)
  assert.equal(inventory.sharedJunctionPairCount,4)
  assert.equal(inventory.requiredSewingPairs.length,102)
  assert.equal(inventory.independentlySigned,false)
  assert.equal(inventory.physicalAcceptance,false)
  assert.equal(inventory.sweptCollisionCertified,false)
  assert.equal(JSON.stringify({project,payload}),before)
})

test('independent raw-particle oracle confirms underarm and shared-junction counts',()=>{
  const {project,payload}=fixture()
  const seamConstraints=payload.constraints.filter(c=>c.type==='seam')
  const authored=new Map(project.seams.map(s=>[s.id,s]))
  const endpointGroups=new Map()
  let intra=0
  for(const constraint of seamConstraints){
    const a=payload.particles[constraint.a].pieceId
    const b=payload.particles[constraint.b].pieceId
    const seam=authored.get(constraint.seamId)
    assert.ok(seam)
    assert.deepEqual([a,b].sort(),
      [seam.a.pieceId,seam.b.pieceId].sort())
    if(a===b)intra++
    const key=[constraint.a,constraint.b].sort((x,y)=>x-y).join(':')
    endpointGroups.set(key,(endpointGroups.get(key)||0)+1)
  }
  assert.equal(authored.size,14)
  assert.equal(seamConstraints.length,102)
  assert.equal(intra,10)
  assert.equal(endpointGroups.size,98)
  assert.equal([...endpointGroups.values()].filter(n=>n===2).length,4)
  assert.equal([...endpointGroups.values()].filter(n=>n>2).length,0)
})

test('four-panel path accepts the frozen 102-pair coverage inventory without physical certification',()=>{
  const {project,payload}=fixture()
  const manifest=derive(project,payload).requiredSewingPairs
  const panels=syntheticPanelsForIndexCoverage(payload)
  const before=JSON.stringify({project,payload,panels,manifest})
  const start=performance.now()
  const result=screen(panels,{sewingPairs:manifest,requiredSewingPairs:manifest,
    subdivisions:2,seamToleranceMm:100})
  const runtimeMs=performance.now()-start
  assert.equal(result.sewingCoverageChecked,true)
  assert.equal(result.sewingCoverageMatchesManifest,true)
  assert.equal(result.sewingGraphConnected,true)
  assert.equal(result.intraPanelPairsChecked,10)
  assert.equal(result.poses.at(-1).maximumSeamGapMm!==null,true)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(JSON.stringify({project,payload,panels,manifest}),before)
  console.log('FOUNDATION_TEE_SEWING_INVENTORY_QA '+JSON.stringify({
    authoredGroups:14,nativePairs:102,crossPanelPairs:92,
    intraPanelPairs:10,sharedJunctionPairs:4,
    syntheticCoverageMatches:true,
    syntheticMaximumGapMm:result.poses.at(-1).maximumSeamGapMm,
    syntheticRmsGapMm:result.poses.at(-1).rmsSeamGapMm,
    syntheticPrincipalExtensionPercent:result.poses.at(-1).maximumPrincipalExtensionPercent,
    syntheticPrincipalCompressionPercent:result.poses.at(-1).maximumPrincipalCompressionPercent,
    syntheticStaticContactClear:result.sampledContactClear,
    runtimeMs:+runtimeMs.toFixed(2),stateNonmutation:true,
    physicalAcceptance:false}))
})

test('missing any underarm seam sample fails full coverage even if cross-panel graph stays connected',()=>{
  const {project,payload}=fixture()
  const manifest=derive(project,payload).requiredSewingPairs
  const panels=syntheticPanelsForIndexCoverage(payload)
  const missing=manifest.filter(p=>p.seamId!=='seam-sleeve-l-underarm')
  assert.equal(missing.length,97)
  const r=screen(panels,{sewingPairs:missing,requiredSewingPairs:manifest,
    subdivisions:2})
  assert.equal(r.sewingGraphConnected,true)
  assert.equal(r.intraPanelPairsChecked,5)
  assert.equal(r.sewingCoverageMatchesManifest,false)
  assert.equal(r.sampledResearchGatePass,false)
})

test('sewing group identity is required to distinguish shared-junction correspondences',()=>{
  const {project,payload}=fixture()
  const manifest=derive(project,payload).requiredSewingPairs
  const panels=syntheticPanelsForIndexCoverage(payload)
  const missingIdentity=manifest.map(({a,b})=>({a,b}))
  assert.throws(()=>screen(panels,{sewingPairs:missingIdentity,
    requiredSewingPairs:manifest,subdivisions:2}),/Duplicate/)
  const changed=structuredClone(manifest)
  changed[0].seamId='seam-side-l'
  const r=screen(panels,{sewingPairs:changed,requiredSewingPairs:manifest,
    subdivisions:2})
  assert.equal(r.sewingCoverageMatchesManifest,false)
  assert.equal(r.sampledResearchGatePass,false)
})

test('an intra-panel pair cannot spoof cross-panel connectivity',()=>{
  const panels=['a','b'].map((panelId,i)=>({
    panelId,verticesM:smallMaterial.map(p=>[...p]),
    worldPositionsM:smallMaterial.map(([x,y])=>[x,y,i*.2]),
    faces:smallFaces.map(f=>[...f]),creaseEdges:[[1,4]],
  }))
  const intra={a:{panelId:'a',vertex:0},b:{panelId:'a',vertex:3},
    seamId:'underarm'}
  const r=screen(panels,{sewingPairs:[intra],
    requiredSewingPairs:[intra],subdivisions:2})
  assert.equal(r.sewingGraphConnected,false)
  assert.equal(r.sewingCoverageMatchesManifest,true)
  assert.equal(r.sampledResearchGatePass,false)
  assert.throws(()=>screen(panels,{sewingPairs:[intra],subdivisions:2}),
    /cross-panel/)
  const invalid={...intra,b:{panelId:'a',vertex:0}}
  assert.throws(()=>screen(panels,{sewingPairs:[invalid],
    requiredSewingPairs:[invalid],subdivisions:2}),/cross-panel/)
})

test('frozen group counts reject missing native samples and changed authored seams',()=>{
  const {project,payload}=fixture()
  const lost=structuredClone(payload)
  lost.constraints.splice(lost.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>derive(project,lost),/frozen Foundation Tee/)
  const changed=structuredClone(project)
  changed.seams.pop()
  assert.throws(()=>derive(changed,payload),
    /frozen Foundation Tee|disagrees with authored/)
})

test('invalid native provenance, seam endpoints and unsupported virtual sewing fail closed',()=>{
  const {project,payload}=fixture()
  const badParticle=structuredClone(payload)
  badParticle.pieces[0].particleIndices[0]=155
  assert.throws(()=>derive(project,badParticle),/provenance/)
  const badGroup=structuredClone(payload)
  badGroup.constraints.find(c=>c.type==='seam').seamId='spoofed'
  assert.throws(()=>derive(project,badGroup),/disagrees/)
  const badPair=structuredClone(payload)
  const seam=badPair.constraints.find(c=>c.type==='seam')
  seam.b=seam.a
  assert.throws(()=>derive(project,badPair),/disagrees/)
  const virtual=structuredClone(payload)
  virtual.virtualSeams=[{sourceIndices:[0,1],sourceWeights:[.5,.5]}]
  assert.throws(()=>derive(project,virtual),/Unsupported/)
})
