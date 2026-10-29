import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from
  '../src/core/backends/nativeUnderarmCreaseConstraintGraphResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

function independentlyAuditGraph(piece,graph){
  const vertices=piece.verticesM,faces=piece.faces
  const edgeIncidence=new Map()
  for(let i=0;i<faces.length;i++){
    const face=faces[i]
    const [a,b,c]=face.map(index=>vertices[index])
    const determinant=cross(a,b,c)
    const inv=graph.restShapes[i].inverseDm
    const dx=b[0]-a[0],dy=b[1]-a[1]
    const ex=c[0]-a[0],ey=c[1]-a[1]
    assert.ok(Math.abs(dx*inv[0]+ex*inv[2]-1)<1e-8)
    assert.ok(Math.abs(dx*inv[1]+ex*inv[3])<1e-8)
    assert.ok(Math.abs(dy*inv[0]+ey*inv[2])<1e-8)
    assert.ok(Math.abs(dy*inv[1]+ey*inv[3]-1)<1e-8)
    assert.ok(Math.abs(graph.restShapes[i].areaM2-Math.abs(determinant)/2)<1e-12)
    for(let j=0;j<3;j++){
      const u=face[j],v=face[(j+1)%3],k=key(u,v)
      if(!edgeIncidence.has(k))edgeIncidence.set(k,[])
      edgeIncidence.get(k).push({faceIndex:i,opposite:face[(j+2)%3]})
    }
  }
  assert.equal(graph.triangleCount,faces.length)
  assert.equal(graph.structuralEdges.length,edgeIncidence.size)
  assert.equal(graph.bendingHinges.length,
    [...edgeIncidence.values()].filter(x=>x.length===2).length)
  const seenEdges=new Set()
  for(const edge of graph.structuralEdges){
    const [a,b]=edge.vertices,k=key(a,b)
    assert.equal(seenEdges.has(k),false)
    seenEdges.add(k)
    assert.equal(edge.boundary,edgeIncidence.get(k).length===1)
    assert.ok(Math.abs(edge.restLengthM-Math.hypot(
      vertices[a][0]-vertices[b][0],vertices[a][1]-vertices[b][1]))<1e-12)
  }
  const creaseKeys=new Set(piece.creaseEdges.map(([a,b])=>key(a,b)))
  let creases=0
  for(const hinge of graph.bendingHinges){
    const k=key(...hinge.edge),uses=edgeIncidence.get(k)
    assert.equal(uses.length,2)
    assert.deepEqual(new Set(hinge.faces),new Set(uses.map(x=>x.faceIndex)))
    assert.deepEqual(new Set(hinge.opposite),new Set(uses.map(x=>x.opposite)))
    assert.equal(hinge.crease,creaseKeys.has(k))
    assert.equal(hinge.restFlatAngleRad,0)
    if(hinge.crease){
      creases++
      const [a,b]=hinge.opposite
      assert.ok(vertices[a][0]*vertices[b][0]<0)
    }
  }
  assert.equal(creases,creaseKeys.size)
  assert.equal(graph.creaseHingeCount,creaseKeys.size)
  assert.deepEqual(graph.originalParticleIndices,piece.originalParticleIndices)
  assert.deepEqual(graph.newVertexProvenance,piece.newVertexProvenance)
  for(const pair of graph.sewingPairs){
    for(const end of [pair.source,pair.target]){
      assert.ok(end.localIndices.every(i=>i>=0&&i<piece.originalVertexCount))
      assert.ok(Math.abs(end.weights.reduce((a,b)=>a+b,0)-1)<1e-6)
    }
  }
}

function fixture(){
  const v=[[-1,0,0],[1,0,0],[-1,1,0],[1,1,0]]
  return {pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
    id,particleIndices:[0,1,2,3].map(i=>i+j*4),
    flatVerticesM:v.map(p=>[...p]),faces:[[0,1,2],[1,3,2]]})),
    particles:Array.from({length:8},(_,i)=>({position:[...v[i%4]],invMass:1})),
    constraints:['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
      .flatMap((seamId,j)=>[0,2].map(i=>({type:'seam',seamId,
        a:i+j*4,b:i+1+j*4}))),virtualSeams:[]}
}

test('synthetic crease preview reconstructs structural and articulated hinge topology',()=>{
  const input=fixture(),frozen=JSON.stringify(input)
  const remesh=refineNativeUnderarmCreaseMeshResearch(input,{maxFlips:0})
  const result=buildNativeUnderarmCreaseConstraintGraphResearch(input,{maxFlips:0})
  assert.equal(result.materialGraphPreviewBuilt,true)
  assert.equal(result.solverReady,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.contactCertified,false)
  assert.equal(result.sweptCollisionCertified,false)
  for(let i=0;i<2;i++){
    independentlyAuditGraph(remesh.panels[i],result.panels[i])
    assert.equal(result.panels[i].sewingPairs.length,2)
  }
  assert.equal(JSON.stringify(input),frozen)
})

test('weighted virtual sewing retains original local ownership and interpolation',()=>{
  const p=fixture()
  p.virtualSeams=[{seamId:'seam-sleeve-l-underarm',
    sourceIndices:[0,2],sourceWeights:[.25,.75],
    targetIndices:[1,3],targetWeights:[.25,.75]}]
  const frozen=JSON.stringify(p)
  const graph=buildNativeUnderarmCreaseConstraintGraphResearch(p,{maxFlips:0})
  const pair=graph.panels[0].sewingPairs.at(-1)
  assert.deepEqual(pair.source,{localIndices:[0,2],weights:[.25,.75]})
  assert.deepEqual(pair.target,{localIndices:[1,3],weights:[.25,.75]})
  assert.equal(graph.panels[0].sewingPairs.length,3)
  assert.equal(graph.panels[1].sewingPairs.length,2)
  assert.equal(JSON.stringify(p),frozen)
})

test('real four-panel tee retains every underarm sewing pair with fail-closed mesh quality',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozen=[JSON.stringify(project),JSON.stringify(payload)]
  const refined=refineNativeUnderarmCreaseMeshResearch(payload)
  const start=performance.now()
  const graph=buildNativeUnderarmCreaseConstraintGraphResearch(payload)
  const elapsedMs=performance.now()-start
  const metrics=[]
  for(let i=0;i<2;i++){
    const piece=refined.panels[i],item=graph.panels[i]
    independentlyAuditGraph(piece,item)
    assert.equal(item.sewingPairs.length,5)
    assert.equal(item.creaseHingeCount,20)
    assert.equal(item.illConditionedRestTriangles,15)
    assert.equal(item.meshQualityApproved,false)
    assert.ok(item.minRestAltitudeMm<2)
    assert.ok(item.maxRestAspect>25)
    metrics.push({panel:item.panelId,vertices:item.vertexCount,
      triangles:item.triangleCount,structuralEdges:item.structuralEdges.length,
      bendingHinges:item.bendingHinges.length,creaseHinges:item.creaseHingeCount,
      sewingPairs:item.sewingPairs.length,illRestTriangles:item.illConditionedRestTriangles})
  }
  assert.equal(graph.structuralConstraintsInstalled,false)
  assert.equal(graph.bendingConstraintsInstalled,false)
  assert.equal(graph.solverReady,false)
  assert.equal(graph.strainCertified,false)
  assert.equal(graph.contactCertified,false)
  assert.equal(JSON.stringify(project),frozen[0])
  assert.equal(JSON.stringify(payload),frozen[1])
  console.log('UNDERARM_CONSTRAINT_GRAPH_QA '+JSON.stringify({metrics,
    runtimeMs:+elapsedMs.toFixed(3),sourceNonmutation:true,
    solverReady:false,physicalAcceptance:false}))
})

test('invalid budgets and missing or malformed sewing evidence fail closed',()=>{
  const p=fixture()
  for(const maxEdges of [0,-1,8193,NaN,1.5])
    assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(p,{maxEdges}),
      /Invalid bounded crease constraint graph budget/)
  for(const maxHinges of [0,8193,NaN,2.5])
    assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(p,{maxHinges}),
      /Invalid bounded crease constraint graph budget/)
  assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(p,{maxEdges:1}),
    /edge budget exhausted/)
  assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(p,{maxHinges:1}),
    /hinge budget exhausted/)
  const missing=structuredClone(p)
  missing.constraints=missing.constraints.filter(c=>c.seamId!=='seam-sleeve-l-underarm')
  assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(missing),
    /Missing or oversized (sleeve sewing constraints|underarm sewing evidence)/)
  const invalid=structuredClone(p)
  invalid.constraints[0].a=999
  assert.throws(()=>buildNativeUnderarmCreaseConstraintGraphResearch(invalid),
    /(Sleeve sewing endpoint missing or invalid|Underarm seam endpoint outside material panel)/)
})
