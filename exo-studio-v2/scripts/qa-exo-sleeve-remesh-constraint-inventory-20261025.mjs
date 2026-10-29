import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025 as improve} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {auditDetachedSleeveConstraintInventoryResearch20261025 as audit} from
  '../src/core/backends/nativeSleeveRemeshConstraintInventoryResearch20261025.js'

const payload=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const key=(a,b)=>[a,b].sort((x,y)=>x-y).join(':')
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))
const independentTopology=faces=>{
  const edges=new Map()
  for(const f of faces)for(let j=0;j<3;j++){
    const a=f[j],b=f[(j+1)%3],k=key(a,b)
    edges.set(k,(edges.get(k)||0)+1)
  }
  return {edges:edges.size,hinges:[...edges.values()].filter(n=>n===2).length,
    boundary:[...edges.values()].filter(n=>n===1).length,counts:edges}
}

test('both real sleeves enumerate complete detached structural and crease bending topology',()=>{
  const source=payload(),sourceSnapshot=JSON.stringify(source),start=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const mesh=improve(source,id),meshSnapshot=JSON.stringify(mesh)
    const result=audit(source,id,mesh),independent=independentTopology(mesh.faces)
    assert.equal(result.vertexCount,112)
    assert.equal(result.faceCount,178)
    assert.equal(result.structuralCount,289)
    assert.equal(result.bendingHingeCount,245)
    assert.equal(result.creaseHingeCount,20)
    assert.equal(independent.edges,result.structuralCount)
    assert.equal(independent.hinges,result.bendingHingeCount)
    assert.equal(independent.boundary,44)
    assert.equal(result.sourceSewingConstraints,41)
    assert.equal(result.sourceSewingEndpointReferences,46)
    assert.equal(result.structural.length,new Set(result.structural.map(x=>key(...x.edge))).size)
    assert.equal(result.hinges.length,new Set(result.hinges.map(x=>key(...x.edge))).size)
    for(const edge of result.structural){
      assert.ok(Math.abs(edge.restLengthM-distance(
        mesh.flatVerticesM[edge.edge[0]],mesh.flatVerticesM[edge.edge[1]]))<1e-14)
    }
    for(const hinge of result.hinges){
      assert.equal(independent.counts.get(key(...hinge.edge)),2)
      assert.equal(new Set([...hinge.edge,...hinge.opposite]).size,4)
      assert.equal(hinge.restDihedralRad,0)
      assert.ok(Number.isFinite(hinge.initialWorldDihedralRad))
      assert.ok(Math.abs(hinge.initialWorldDihedralRad)<=Math.PI)
    }
    assert.deepEqual(new Set(result.hinges.filter(x=>x.crease).map(x=>key(...x.edge))),
      new Set(mesh.protectedCreaseEdges.map(pair=>key(...pair))))
    assert.equal(result.contact.intersections,3)
    assert.equal(result.contact.nearFoldovers,3)
    assert.equal(result.contact.nearClearance,37)
    assert.ok(Math.abs(result.maximumPrincipalExtensionPercent-751.5352583690376)<1e-8)
    assert.ok(Math.abs(result.maximumPrincipalCompressionPercent-89.04079256830012)<1e-8)
    assert.equal(result.staticContactValid,false)
    assert.equal(result.withinDeclaredStrainLimit,false)
    for(const field of ['stiffnessCalibrated','solverConstraintsRebuilt',
      'samePanelContactExclusionsRebuilt','continuousContactCertified',
      'physicalAcceptance','safeToAutoApply'])assert.equal(result[field],false)
    assert.equal(JSON.stringify(mesh),meshSnapshot)
  }
  assert.equal(JSON.stringify(source),sourceSnapshot)
  console.log('REMESH_CONSTRAINT_INVENTORY '+JSON.stringify({
    sleeves:2,perSleeveStructural:289,perSleeveHinges:245,perSleeveCreaseHinges:20,
    sourceSewingPairs:102,perSleeveSewingConstraints:41,
    sourceNonmutation:true,solverReady:false,
    runtimeMs:+(performance.now()-start).toFixed(2)}))
})

test('topology changes make original structural and bending inventories stale',()=>{
  const source=payload(),piece=source.pieces.find(x=>x.id==='sleeve-left')
  const mesh=improve(source,'sleeve-left')
  const old=independentTopology(piece.faces),next=independentTopology(mesh.faces)
  assert.equal(old.edges,238)
  assert.equal(old.hinges,194)
  assert.equal(next.edges,289)
  assert.equal(next.hinges,245)
  assert.ok(mesh.flatVerticesM.length>piece.flatVerticesM.length)
  // A topology change requires fresh constraint identities and rest values.
  assert.notEqual(old.edges,next.edges)
  assert.notEqual(old.hinges,next.hinges)
})

test('missing crease hinge, reversed triangle, bad provenance and missing seam fail closed',()=>{
  const source=payload(),mesh=improve(source,'sleeve-left')
  const sourceSnapshot=JSON.stringify(source),meshSnapshot=JSON.stringify(mesh)
  const missing=structuredClone(mesh)
  missing.protectedCreaseEdges.push([0,1])
  assert.throws(()=>audit(source,'sleeve-left',missing),/crease|Duplicate/)
  const swapped=structuredClone(mesh)
  const realCrease=new Set(mesh.protectedCreaseEdges.map(pair=>key(...pair)))
  const other=audit(source,'sleeve-left',mesh).hinges.find(
    h=>!realCrease.has(key(...h.edge)))
  swapped.protectedCreaseEdges[0]=other.edge
  assert.throws(()=>audit(source,'sleeve-left',swapped),/crease/)
  const reversed=structuredClone(mesh)
  reversed.faces[0].reverse()
  assert.throws(()=>audit(source,'sleeve-left',reversed),/reversed|hinge/)
  const badWorld=structuredClone(mesh)
  badWorld.worldVerticesM[0][0]+=.01
  assert.throws(()=>audit(source,'sleeve-left',badWorld),/provenance/)
  const badMaterial=structuredClone(mesh)
  badMaterial.flatVerticesM[0][2]=.01
  assert.throws(()=>audit(source,'sleeve-left',badMaterial),/inputs/)
  const badCut=structuredClone(mesh)
  badCut.worldVerticesM[badCut.originalVertexCount][0]+=.01
  assert.throws(()=>audit(source,'sleeve-left',badCut),/provenance/)
  const fakeCut=structuredClone(mesh)
  fakeCut.vertexProvenance[fakeCut.originalVertexCount].weights=[.123,.877]
  assert.throws(()=>audit(source,'sleeve-left',fakeCut),/provenance/)
  const missingSeam=structuredClone(source)
  missingSeam.constraints.splice(missingSeam.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>audit(missingSeam,'sleeve-left',mesh),/sewing/)
  const badTriangle=structuredClone(mesh)
  badTriangle.faces[0]=[0,0,1]
  assert.throws(()=>audit(source,'sleeve-left',badTriangle),/triangle/)
  assert.equal(JSON.stringify(source),sourceSnapshot)
  assert.equal(JSON.stringify(mesh),meshSnapshot)
})
