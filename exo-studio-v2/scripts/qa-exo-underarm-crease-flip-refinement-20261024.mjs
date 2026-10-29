import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {buildNativeUnderarmCreaseRemeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseRemeshResearch.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'

const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const edges=faces=>{
  const map=new Map()
  for(const f of faces)for(let i=0;i<3;i++){
    const a=f[i],b=f[(i+1)%3],k=key(a,b)
    map.set(k,(map.get(k)||0)+1)
  }
  return map
}
const independentQuality=(v,faces)=>{
  let ill=0,minAltitudeMm=Infinity,maxAspect=0,area=0
  for(const f of faces){
    assert.equal(new Set(f).size,3)
    const [a,b,c]=f.map(i=>v[i])
    const signed=cross(a,b,c)
    assert.ok(Number.isFinite(signed)&&Math.abs(signed)>1e-14)
    const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
      Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
    const altitude=Math.abs(signed)/longest,aspect=longest/altitude
    if(altitude<.002||aspect>25)ill++
    minAltitudeMm=Math.min(minAltitudeMm,altitude*1000)
    maxAspect=Math.max(maxAspect,aspect)
    area+=Math.abs(signed)/2
    assert.ok(Math.min(a[0],b[0],c[0])>=-1e-9||
      Math.max(a[0],b[0],c[0])<=1e-9,'No triangle may cross crease')
  }
  return {ill,minAltitudeMm,maxAspect,area}
}
const strictCross=(a,b,c,d)=>{
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  return x*y< -1e-16&&z*w< -1e-16
}
function independentTopology(base,panel){
  assert.deepEqual(panel.verticesM,base.verticesM)
  assert.deepEqual(panel.worldPositionsM,base.worldPositionsM)
  assert.deepEqual(panel.originalParticleIndices,base.originalParticleIndices)
  assert.deepEqual(panel.newVertexProvenance,base.newVertexProvenance)
  const originalEdges=edges(base.faces),finalEdges=edges(panel.faces)
  assert.ok([...finalEdges.values()].every(x=>x===1||x===2))
  assert.deepEqual([...originalEdges].filter(([,n])=>n===1).map(([k])=>k).sort(),
    [...finalEdges].filter(([,n])=>n===1).map(([k])=>k).sort())
  for(const [a,b] of base.creaseEdges)
    assert.equal(finalEdges.get(key(a,b)),2,'Crease hinge must survive')
  const segments=[...finalEdges.keys()].map(k=>k.split(':').map(Number))
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    const [a,b]=segments[i],[c,d]=segments[j]
    if(new Set([a,b,c,d]).size<4)continue
    assert.equal(strictCross(panel.verticesM[a],panel.verticesM[b],
      panel.verticesM[c],panel.verticesM[d]),false,
    'Refinement must not create intersecting interior edges')
  }
}

function simpleFixture(){
  const v=[[-1,0,0],[1,0,0],[-1,1,0],[1,1,0]]
  return {pieces:['sleeve-left','sleeve-right'].map((id,j)=>({
    id,particleIndices:[0,1,2,3].map(i=>i+j*4),
    flatVerticesM:v.map(p=>[...p]),faces:[[0,1,2],[1,3,2]]})),
    particles:Array.from({length:8},(_,i)=>({position:[...v[i%4]],invMass:1})),
    constraints:['seam-sleeve-l-underarm','seam-sleeve-r-underarm']
      .flatMap((seamId,j)=>[0,2].map(i=>({type:'seam',seamId,
        a:i+j*4,b:i+1+j*4}))),virtualSeams:[]}
}

test('zero-flip budget reproduces prior crease topology and never claims acceptance',()=>{
  const p=simpleFixture(),frozen=JSON.stringify(p)
  const before=buildNativeUnderarmCreaseRemeshResearch(p)
  const after=refineNativeUnderarmCreaseMeshResearch(p,{maxFlips:0})
  assert.equal(after.safeToAutoApply,false)
  assert.equal(after.meshConditioningCertified,false)
  assert.equal(after.structuralConstraintsRebuilt,false)
  assert.equal(after.bendingConstraintsRebuilt,false)
  assert.equal(after.contactCertified,false)
  assert.equal(after.sweptCollisionCertified,false)
  for(let i=0;i<2;i++){
    assert.equal(after.panels[i].flipCount,0)
    assert.deepEqual(after.panels[i].faces,before.panels[i].faces)
    independentTopology(before.panels[i],after.panels[i])
  }
  assert.equal(JSON.stringify(p),frozen)
})

test('invalid budgets and invalid mesh inputs fail closed',()=>{
  const p=simpleFixture()
  for(const maxFlips of [-1,513,NaN,1.5])
    assert.throws(()=>refineNativeUnderarmCreaseMeshResearch(p,{maxFlips}),
      /Invalid bounded edge-flip budget/)
  assert.throws(()=>refineNativeUnderarmCreaseMeshResearch(p,{axisToleranceM:0}),
    /Invalid bounded crease remesh budget/)
  const bad=structuredClone(p)
  bad.pieces[0].faces.push([0,1,2],[0,1,2])
  assert.throws(()=>refineNativeUnderarmCreaseMeshResearch(bad),/Nonmanifold/)
})

test('real Foundation Tee constrained flips improve rest quality without altering sewing or geometry',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const frozen=[JSON.stringify(project),JSON.stringify(payload)]
  const base=buildNativeUnderarmCreaseRemeshResearch(payload)
  const started=performance.now()
  const refined=refineNativeUnderarmCreaseMeshResearch(payload)
  const runtimeMs=performance.now()-started
  const measurements=[]
  for(let i=0;i<2;i++){
    const b=base.panels[i],r=refined.panels[i]
    independentTopology(b,r)
    const before=independentQuality(b.verticesM,b.faces)
    const after=independentQuality(r.verticesM,r.faces)
    assert.equal(before.ill,46)
    assert.ok(r.flipCount>0&&r.flipCount<=128)
    assert.ok(after.ill<before.ill,'Constrained flips must reduce sliver count')
    assert.ok(after.minAltitudeMm>before.minAltitudeMm)
    assert.ok(after.maxAspect<before.maxAspect)
    assert.ok(Math.abs(before.area-after.area)<1e-10)
    assert.equal(r.afterQuality.illConditioned,after.ill)
    assert.equal(r.qualityApproved,false)
    assert.equal(r.qualityRegressed,after.ill>b.beforeQuality.illConditioned)
    measurements.push({panel:r.panelId,flips:r.flipCount,
      beforeIll:before.ill,afterIll:after.ill,
      beforeMinAltitudeMm:before.minAltitudeMm,afterMinAltitudeMm:after.minAltitudeMm,
      beforeMaxAspect:before.maxAspect,afterMaxAspect:after.maxAspect,
      materialAreaM2:after.area})
  }
  assert.equal(JSON.stringify(project),frozen[0])
  assert.equal(JSON.stringify(payload),frozen[1])
  assert.equal(refined.safeToAutoApply,false)
  console.log('UNDERARM_CONSTRAINED_FLIP_QA '+JSON.stringify({measurements,
    runtimeMs:+runtimeMs.toFixed(3),sourceNonmutation:true,
    constraintsRebuilt:false,contactCertified:false,physicalAcceptance:false}))
})
