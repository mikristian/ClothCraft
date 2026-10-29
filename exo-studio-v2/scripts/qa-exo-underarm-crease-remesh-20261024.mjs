import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {buildNativeUnderarmCreaseRemeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseRemeshResearch.js'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const edges=f=>[[f[0],f[1]],[f[1],f[2]],[f[2],f[0]]]
const signedArea=(v,f)=>{
  const [a,b,c]=f.map(i=>v[i])
  return ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2
}
const edgeCounts=faces=>{
  const map=new Map()
  for(const f of faces)for(const [a,b] of edges(f)){
    const k=key(a,b);map.set(k,(map.get(k)||0)+1)
  }
  return map
}
const quality=(v,faces)=>{
  let ill=0,minimumAltitudeMm=Infinity,maximumAspect=0
  for(const f of faces){
    const [a,b,c]=f.map(i=>v[i])
    const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(b[0]-c[0],b[1]-c[1]))
    const altitude=2*Math.abs(signedArea(v,f))/longest
    const aspect=longest/altitude
    minimumAltitudeMm=Math.min(minimumAltitudeMm,altitude*1000)
    maximumAspect=Math.max(maximumAspect,aspect)
    if(altitude<.002||aspect>25)ill++
  }
  return {ill,minimumAltitudeMm,maximumAspect}
}
function fixture(){
  const flat=[[-1,0,0],[1,0,0],[-1,1,0],[1,1,0]]
  return {pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
    id,particleIndices:[0,1,2,3].map(i=>i+j*4),
    flatVerticesM:flat.map(p=>[...p]),faces:[[0,1,2],[1,3,2]]})),
    particles:Array.from({length:8},(_,i)=>({position:[...flat[i%4]],invMass:1})),
    constraints:['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
      .flatMap((seamId,j)=>[0,2].map(i=>({type:'seam',seamId,
        a:i+j*4,b:i+1+j*4}))),virtualSeams:[]}
}

function independentAudit(piece,output,particles){
  const before=piece.flatVerticesM,after=output.verticesM
  assert.deepEqual(after.slice(0,before.length),before)
  assert.deepEqual(output.originalParticleIndices,piece.particleIndices)
  assert.equal(output.newVertexCount,after.length)
  assert.equal(output.newFaceCount,output.faces.length)
  const oldArea=piece.faces.reduce((s,f)=>s+Math.abs(signedArea(before,f)),0)
  const newArea=output.faces.reduce((s,f)=>s+Math.abs(signedArea(after,f)),0)
  assert.ok(Math.abs(oldArea-newArea)<1e-9)
  const originalEdges=edgeCounts(piece.faces),newEdges=edgeCounts(output.faces)
  assert.ok([...newEdges.values()].every(n=>n===1||n===2))
  const splits=new Map()
  for(const {index,edge:[a,b],weights} of output.newVertexProvenance){
    const interpolated=before[a].map((x,i)=>x*weights[0]+before[b][i]*weights[1])
    for(let i=0;i<3;i++)assert.ok(Math.abs(interpolated[i]-after[index][i])<1e-10)
    const worldA=particles[piece.particleIndices[a]].position
    const worldB=particles[piece.particleIndices[b]].position
    for(let i=0;i<3;i++)assert.ok(Math.abs(
      worldA[i]*weights[0]+worldB[i]*weights[1]-output.worldPositionsM[index][i])<1e-10)
    assert.equal(weights[0]+weights[1],1)
    splits.set(key(a,b),index)
  }
  const expectedBoundary=new Set()
  for(const [edge,count] of originalEdges){
    if(count!==1)continue
    const [a,b]=edge.split(':').map(Number),mid=splits.get(edge)
    if(mid===undefined)expectedBoundary.add(edge)
    else{expectedBoundary.add(key(a,mid));expectedBoundary.add(key(mid,b))}
  }
  const newBoundary=new Set([...newEdges].filter(([,n])=>n===1).map(([k])=>k))
  assert.deepEqual([...newBoundary].sort(),[...expectedBoundary].sort())
  for(const face of output.faces){
    assert.equal(new Set(face).size,3)
    assert.ok(Math.abs(signedArea(after,face))>1e-14)
    const xs=face.map(i=>after[i][0])
    assert.ok(!(Math.min(...xs)<-1e-9&&Math.max(...xs)>1e-9),
      'triangle must not cross the x=0 crease')
  }
  assert.ok(output.creaseEdges.length>0)
  for(const [a,b] of output.creaseEdges){
    assert.ok(Math.abs(after[a][0])<1e-9&&Math.abs(after[b][0])<1e-9)
    assert.equal(newEdges.get(key(a,b)),2)
  }
}

test('synthetic sleeves split crossing triangles with shared crease and unchanged boundary',()=>{
  const p=fixture(),frozen=JSON.stringify(p)
  const result=buildNativeUnderarmCreaseRemeshResearch(p)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.structuralConstraintsRebuilt,false)
  assert.equal(result.contactCertified,false)
  assert.equal(result.meshConditioningCertified,false)
  for(const output of result.panels){
    assert.equal(output.splitEdgeCount,3)
    assert.equal(output.originalVertexCount,4)
    assert.equal(output.newVertexCount,7)
    independentAudit(p.pieces.find(x=>x.id===output.panelId),output,p.particles)
  }
  assert.equal(JSON.stringify(p),frozen)
})

test('nonmanifold input, malformed positions and exhausted budgets fail closed',()=>{
  const base=fixture()
  assert.throws(()=>buildNativeUnderarmCreaseRemeshResearch(base,{maxOutputFaces:4}),
    /budget exhausted/)
  assert.throws(()=>buildNativeUnderarmCreaseRemeshResearch(base,{axisToleranceM:0}),
    /Invalid bounded/)
  const nonmanifold=structuredClone(base)
  nonmanifold.pieces[0].faces.push([0,1,2],[0,1,2])
  assert.throws(()=>buildNativeUnderarmCreaseRemeshResearch(nonmanifold),/Nonmanifold/)
  const invalidWorld=structuredClone(base)
  invalidWorld.particles[0].position=[NaN,0,0]
  assert.throws(()=>buildNativeUnderarmCreaseRemeshResearch(invalidWorld),/finite sleeve world/)
})

test('real four-panel Foundation Tee preserves material area, boundary and sewing ownership',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozen=[JSON.stringify(project),JSON.stringify(payload)]
  const started=performance.now()
  const result=buildNativeUnderarmCreaseRemeshResearch(payload)
  const elapsed=performance.now()-started
  assert.equal(result.panels.length,2)
  const measurements=[]
  for(const output of result.panels){
    const original=payload.pieces.find(p=>p.id===output.panelId)
    independentAudit(original,output,payload.particles)
    assert.equal(output.originalVertexCount,95)
    assert.equal(output.originalFaceCount,144)
    assert.equal(output.newVertexCount,112)
    assert.equal(output.newFaceCount,178)
    assert.equal(output.splitEdgeCount,17)
    assert.equal(output.creaseEdgeCount,20)
    assert.deepEqual(output.beforeQuality.illConditioned,quality(original.flatVerticesM,original.faces).ill)
    assert.deepEqual(output.afterQuality.illConditioned,quality(output.verticesM,output.faces).ill)
    assert.equal(output.qualityRegressed,true)
    assert.equal(output.qualityApproved,false)
    measurements.push({panel:output.panelId,
      before:quality(original.flatVerticesM,original.faces),
      after:quality(output.verticesM,output.faces),
      originalFaces:output.originalFaceCount,newFaces:output.newFaceCount,
      originalVertices:output.originalVertexCount,newVertices:output.newVertexCount,
      splitEdges:output.splitEdgeCount,creaseEdges:output.creaseEdgeCount})
  }
  assert.deepEqual([JSON.stringify(project),JSON.stringify(payload)],frozen)
  console.log('UNDERARM_CREASE_REMESH '+JSON.stringify({measurements,
    runtimeMs:+elapsed.toFixed(3),sourceNonmutation:true,
    constraintsRebuilt:false,physicalAcceptance:false,contactCertified:false}))
})
