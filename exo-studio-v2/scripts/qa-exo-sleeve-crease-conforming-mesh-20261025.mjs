import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectNativeUnderarmCenterCrease} from
  '../src/core/backends/nativeUnderarmCenterCreaseResearch.js'
import {splitMaterialPanelAtCreaseResearch20261025 as split,
  researchFoundationTeeSleeveCreaseMesh20261025 as sleeve} from
  '../src/core/backends/nativeSleeveCreaseConformingMeshResearch20261025.js'

const twiceArea=(v,f)=>{
  const [a,b,c]=f.map(i=>v[i])
  return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
}
const quality=(v,faces)=>{
  let ill=0,minAltitude=Infinity,maxAspect=0
  for(const f of faces){
    const [a,b,c]=f.map(i=>v[i])
    const length=Math.max(...[[a,b],[b,c],[c,a]].map(([x,y])=>
      Math.hypot(x[0]-y[0],x[1]-y[1])))
    const altitude=Math.abs(twiceArea(v,f))/length,aspect=length/altitude
    if(altitude<.002||aspect>25)ill++
    minAltitude=Math.min(minAltitude,altitude)
    maxAspect=Math.max(maxAspect,aspect)
  }
  return {ill,minAltitude,maxAspect}
}
const make=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})

test('real sleeves split all crossing material triangles, reuse edges and retain authored sewing IDs',()=>{
  const payload=make(),before=JSON.stringify(payload)
  const baseline=measureNativeSeamResiduals(payload)
  const inventory=inspectNativeUnderarmCenterCrease(payload)
  const t0=performance.now()
  const results=['sleeve-left','sleeve-right'].map(id=>sleeve(payload,id))
  const runtimeMs=performance.now()-t0
  for(const result of results){
    const original=payload.pieces.find(p=>p.id===result.panelId)
    const crease=inventory.panels.find(p=>p.panelId===result.panelId)
    assert.equal(result.crossingFacesSplit,20)
    assert.equal(result.cutEdgeCount,17)
    assert.equal(result.flatVerticesM.length,112)
    assert.equal(result.faces.length,178)
    assert.equal(result.remainingCrossingFaces,0)
    assert.equal(result.originalFaceCount,original.faces.length)
    assert.deepEqual(result.flatVerticesM.slice(0,95),original.flatVerticesM)
    assert.deepEqual(result.originalParticleIndices,original.particleIndices)
    assert.equal(result.solverConstraintsRebuilt,false)
    assert.equal(result.physicalAcceptance,false)
    assert.equal(result.safeToAutoApply,false)
    const world=original.particleIndices.map(i=>payload.particles[i].position)
    assert.deepEqual(result.worldVerticesM.slice(0,95),world)
    let oldArea=0,newArea=0
    for(const f of original.faces)oldArea+=Math.abs(twiceArea(original.flatVerticesM,f))/2
    for(const f of result.faces){
      newArea+=Math.abs(twiceArea(result.flatVerticesM,f))/2
      const signed=f.map(i=>{
        const [x,y]=result.flatVerticesM[i],d=crease.creaseDirection
        return d[0]*(y-crease.creaseOriginM[1])-d[1]*(x-crease.creaseOriginM[0])
      })
      assert.ok(!(signed.some(x=>x>1e-8)&&signed.some(x=>x< -1e-8)))
    }
    assert.ok(Math.abs(oldArea-newArea)<1e-11)
    assert.ok(result.maxAreaErrorM2<1e-12)
    for(let i=95;i<result.flatVerticesM.length;i++){
      const p=result.vertexProvenance[i]
      assert.equal(p.kind,'edge-intersection')
      assert.ok(p.edge.every(j=>j<95))
      assert.ok(Math.abs(p.weights[0]+p.weights[1]-1)<1e-12)
      for(let k=0;k<3;k++){
        const expected=p.edge.reduce((s,j,t)=>s+world[j][k]*p.weights[t],0)
        assert.ok(Math.abs(result.worldVerticesM[i][k]-expected)<1e-12)
      }
    }
    const beforeQuality=quality(original.flatVerticesM,original.faces)
    const afterQuality=quality(result.flatVerticesM,result.faces)
    assert.equal(beforeQuality.ill,32)
    assert.equal(afterQuality.ill,46)
    assert.ok(afterQuality.maxAspect>beforeQuality.maxAspect)
    assert.equal(result.restConditioning.before.illConditionedFaces,beforeQuality.ill)
    assert.equal(result.restConditioning.after.illConditionedFaces,afterQuality.ill)
    assert.equal(result.restConditioning.after.approved,false)
    assert.equal(result.restConditioning.nonworse,false)
    console.log('SLEEVE_CREASE_MESH '+JSON.stringify({panelId:result.panelId,
      vertices:[95,112],faces:[144,178],cutEdges:17,crossingFaces:[20,0],
      illConditioned:[beforeQuality.ill,afterQuality.ill],
      maxAspect:[beforeQuality.maxAspect,afterQuality.maxAspect],
      minAltitudeM:[beforeQuality.minAltitude,afterQuality.minAltitude],
      areaErrorM2:result.maxAreaErrorM2,solverReady:false}))
  }
  const after=measureNativeSeamResiduals(payload)
  assert.deepEqual(after,baseline)
  assert.equal(baseline.pairCount,102)
  assert.equal(JSON.stringify(payload),before)
  console.log('SLEEVE_CREASE_MESH_RUNTIME '+JSON.stringify({runtimeMs:+runtimeMs.toFixed(2),
    sourceNonmutation:true,originalSeamsUnchanged:true}))
})

test('independent square split shares edge intersections, conserves signed area and interpolates world coordinates',()=>{
  const flat=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]]
  const world=flat.map(([x,y])=>[2*x,3*y,x*y])
  const faces=[[0,1,2],[0,2,3]]
  const original=JSON.stringify({flat,world,faces})
  const result=split(flat,world,faces,{originM:[0,0],direction:[0,-1]})
  assert.equal(result.cutEdgeCount,3)
  assert.equal(result.crossingFacesSplit,2)
  assert.equal(result.flatVerticesM.length,7)
  assert.equal(result.faces.length,6)
  assert.equal(result.sourceFaceIndices.length,6)
  assert.ok(Math.abs(result.faces.reduce((s,f)=>s+twiceArea(result.flatVerticesM,f),0)-8)<1e-10)
  const common=result.vertexProvenance.findIndex(p=>p.kind==='edge-intersection'&&
    p.edge.includes(0)&&p.edge.includes(2))
  assert.ok(common>=4)
  assert.ok(result.faces.filter(f=>f.includes(common)).length>=4)
  assert.deepEqual(result.flatVerticesM[common],[0,0,0])
  // World position follows the original triangle edge, not the nonlinear
  // z=x*y expression evaluated at the material midpoint.
  assert.deepEqual(result.worldVerticesM[common],[0,0,1])
  assert.equal(JSON.stringify({flat,world,faces}),original)
})

test('invalid topology, axes, degeneracy and resource exhaustion fail closed',()=>{
  const flat=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]]
  const world=flat.map(x=>[...x]),faces=[[0,1,2],[0,2,3]]
  const options={originM:[0,0],direction:[0,-1]}
  const snapshot=JSON.stringify({flat,world,faces,options})
  assert.throws(()=>split(flat,world,faces,{...options,maxVertices:4}),/budget/)
  assert.throws(()=>split(flat,world,faces,{...options,maxFaces:2}),/budget/)
  assert.throws(()=>split(flat,world,faces,{...options,direction:[0,0]}),/inputs/)
  assert.throws(()=>split(flat,world,[[0,0,2]],options),/source face/)
  assert.throws(()=>split(flat,world,[[0,1,4]],options),/source face/)
  assert.throws(()=>split(flat,world,[[0,1,2],[0,1,2],[0,1,2]],options),
    /Nonmanifold|winding/)
  // Adversarial independent review found that two adjacent source triangles
  // can share an edge with the SAME direction; incidence counts alone miss it.
  assert.throws(()=>split(flat,world,[[0,1,2],[0,3,2]],options),/winding/)
  const withTJunction=[...flat,[0,0,0]]
  assert.throws(()=>split(withTJunction,withTJunction,
    [[0,1,2],[0,4,3],[4,2,3]],options),/T-junction/)
  assert.throws(()=>split(flat,world,[[0,1,1]],options),/source face/)
  assert.throws(()=>split(flat,world.map(p=>[Infinity,...p.slice(1)]),faces,options),
    /inputs/)
  assert.throws(()=>split(flat,flat.map(()=>[0,0,0]),faces,options),
    /Collapsed crease source world triangle/)
  assert.throws(()=>sleeve(make(),'front'),/Only authored/)
  assert.equal(JSON.stringify({flat,world,faces,options}),snapshot)
})
