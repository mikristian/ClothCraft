import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025 as remesh} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {auditDetachedSleeveMassContactTopologyResearch20261025 as audit} from
  '../src/core/backends/nativeSleeveRemeshMassContactTopologyResearch20261025.js'

const payload=()=>buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
const area=(points,[a,b,c])=>Math.abs((points[b][0]-points[a][0])*
  (points[c][1]-points[a][1])-(points[b][1]-points[a][1])*
  (points[c][0]-points[a][0]))/2
const independentlyClassify=faces=>{
  let edge=0,vertex=0,none=0
  for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
    const n=faces[i].filter(v=>faces[j].includes(v)).length
    if(n===2)edge++
    else if(n===1)vertex++
    else if(n===0)none++
    else throw new Error('duplicate faces')
  }
  return {edge,vertex,none}
}

test('actual sleeves conserve rest area, rebuild detached area weights and classify ALL contact pairs',()=>{
  const source=payload(),before=JSON.stringify(source),start=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const mesh=remesh(source,id),meshBefore=JSON.stringify(mesh),result=audit(source,id,mesh)
    const piece=source.pieces.find(p=>p.id===id)
    const original=piece.faces.reduce((sum,f)=>sum+area(piece.flatVerticesM,f),0)
    const remeshed=mesh.faces.reduce((sum,f)=>sum+area(mesh.flatVerticesM,f),0)
    const independentWeights=new Array(mesh.flatVerticesM.length).fill(0)
    for(const face of mesh.faces){
      const faceArea=area(mesh.flatVerticesM,face)
      for(const i of face)independentWeights[i]+=faceArea/3
    }
    assert.ok(Math.abs(original-remeshed)<1e-10)
    assert.ok(Math.abs(result.originalAreaM2-original)<1e-12)
    assert.ok(Math.abs(result.remeshedAreaM2-remeshed)<1e-12)
    for(let i=0;i<independentWeights.length;i++){
      assert.ok(Math.abs(result.lumpedVertexAreaM2[i]-independentWeights[i])<1e-14)
      assert.ok(Math.abs(result.normalizedVertexAreaFractions[i]-
        independentWeights[i]/remeshed)<1e-12)
    }
    assert.ok(Math.abs(result.normalizedVertexAreaFractions.reduce((s,v)=>s+v,0)-1)<1e-12)
    const expected=independentlyClassify(mesh.faces),counts=result.contactPairClassification
    assert.equal(counts.totalPairs,mesh.faces.length*(mesh.faces.length-1)/2)
    assert.equal(counts.edgeNeighborPairs,expected.edge)
    assert.equal(counts.vertexNeighborPairs,expected.vertex)
    assert.equal(counts.nonAdjacentPairs,expected.none)
    assert.equal(counts.creaseEdgeNeighborPairs,20)
    assert.equal(result.sourceSewingConstraints,41)
    assert.deepEqual(result.anchoredOriginalVertices,[])
    assert.deepEqual(result.contact,{intersections:3,nearFoldovers:3,nearClearance:37})
    assert.equal(result.staticContactValid,false)
    assert.equal(result.withinDeclaredStrainLimit,false)
    for(const flag of ['massCalibrationVerified','stiffnessCalibrated',
      'solverConstraintsRebuilt','samePanelContactExclusionsRebuilt',
      'continuousContactCertified','physicalAcceptance','safeToAutoApply'])
      assert.equal(result[flag],false)
    assert.equal(JSON.stringify(mesh),meshBefore)
    console.log('SLEEVE_AREA_CONTACT '+JSON.stringify({panel:id,areaM2:remeshed,
      ...counts,sourceUnchanged:true,solverReady:false}))
  }
  assert.equal(JSON.stringify(source),before)
  console.log('SLEEVE_AREA_CONTACT_RUNTIME_MS '+(performance.now()-start).toFixed(2))
})

test('source material-area corruption is rejected rather than assigning incorrect masses',()=>{
  const source=payload(),mesh=remesh(source,'sleeve-left'),bad=structuredClone(source)
  const piece=bad.pieces.find(p=>p.id==='sleeve-left')
  // Deliberately inflate a source face's material area; the remesh itself
  // remains unchanged and must not silently inherit a different total mass.
  piece.faces[0]=[10,30,20]
  assert.throws(()=>audit(bad,'sleeve-left',mesh),/area is not conserved/)
})

test('bad crease, sewing and material provenance fail closed before contact classification',()=>{
  const source=payload(),mesh=remesh(source,'sleeve-right')
  const snapshot=JSON.stringify(source),meshSnapshot=JSON.stringify(mesh)
  const missingCrease=structuredClone(mesh)
  missingCrease.protectedCreaseEdges=[]
  assert.throws(()=>audit(source,'sleeve-right',missingCrease),/crease/i)
  const badGenerated=structuredClone(mesh)
  badGenerated.vertexProvenance[badGenerated.originalVertexCount].weights=[.4,.6]
  assert.throws(()=>audit(source,'sleeve-right',badGenerated),/provenance/i)
  const missingSeam=structuredClone(source)
  missingSeam.constraints.splice(missingSeam.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>audit(missingSeam,'sleeve-right',mesh),/sewing/i)
  assert.equal(JSON.stringify(source),snapshot)
  assert.equal(JSON.stringify(mesh),meshSnapshot)
})
