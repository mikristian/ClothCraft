import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeePlanarBodyDepth20261025 as research} from '../src/core/backends/nativeFoundationTeePlanarBodyDepthResearch20261025.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

const fixture = () => buildNativeSimulationPayload(createTemplateProject('tee'), {quality:'quality'})
const close = (a,b,tol=1e-8) => assert.ok(Math.abs(a-b)<=tol, `${a} differs from ${b}`)
const norm = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]))
const depths = [0,.005,.01,.013,.014,.02]

function independentlyStage(source, depth) {
  const copy = structuredClone(source)
  for (const id of ['front','back']) {
    const piece = copy.pieces.find(p=>p.id===id)
    const offset = [0,1,2].map(axis=>piece.particleIndices.reduce((sum,index,i)=>
      sum + (axis===2 ? source.particles[index].position[2] :
        source.particles[index].position[axis]-piece.flatVerticesM[i][axis]),0)/piece.particleIndices.length)
    for(let i=0;i<piece.particleIndices.length;i++) {
      const index=piece.particleIndices[i], uv=piece.flatVerticesM[i]
      const next=[uv[0]+offset[0],uv[1]+offset[1],offset[2]+(id==='front'?-depth:depth)]
      copy.particles[index].position=next
      copy.particles[index].previous=[...next]
    }
  }
  return copy
}

function independentSeams(payload) {
  const gaps=payload.constraints.filter(c=>c.type==='seam').map(c=>
    norm(payload.particles[c.a].position,payload.particles[c.b].position)*1000)
  assert.equal(gaps.length,102)
  return {max:Math.max(...gaps),rms:Math.sqrt(gaps.reduce((s,v)=>s+v*v,0)/gaps.length)}
}

function independentBodyEdges(payload) {
  let maximum=0, checked=0
  for(const piece of payload.pieces.filter(p=>['front','back'].includes(p.id))) {
    for(const [a,b,c] of piece.faces) for(const [i,j] of [[a,b],[b,c],[c,a]]) {
      maximum=Math.max(maximum,Math.abs(norm(payload.particles[piece.particleIndices[i]].position,
        payload.particles[piece.particleIndices[j]].position)-norm(piece.flatVerticesM[i],piece.flatVerticesM[j])))
      checked++
    }
  }
  return {maximum,checked}
}

test('four-panel depth grid independently reproduces seams, body edges, contacts, and strain controls',()=>{
  const source=fixture(), before=JSON.stringify(source)
  assert.equal(source.pieces.length,4)
  const result=research(source,{depthsM:depths,clearanceM:.001})
  assert.equal(JSON.stringify(source),before)
  const base=independentSeams(source)
  close(result.sourceSeams.maxGapMm,base.max)
  close(result.sourceSeams.rmsGapMm,base.rms)
  assert.equal(result.candidates.length,depths.length)
  const clear=[]
  for(let i=0;i<depths.length;i++) {
    const row=result.candidates[i], staged=independentlyStage(source,depths[i])
    const seam=independentSeams(staged), edges=independentBodyEdges(staged)
    const inter=inspectNativeInterpanelExactStaticContact(staged,{clearanceM:.001})
    const intra=inspectNativeIntrapanelStaticContact(staged,{clearanceM:.001})
    close(row.depthM,depths[i]); close(row.maxGapMm,seam.max)
    close(row.rmsGapMm,seam.rms)
    close(row.bodyEdgeErrorM,edges.maximum,1e-10)
    assert.equal(row.bodyEdgesChecked,edges.checked)
    assert.ok(edges.checked>0 && edges.maximum<=1e-10)
    assert.ok(Math.abs(row.bodyPrincipalExtensionPercent)<1e-7)
    assert.ok(Math.abs(row.bodyPrincipalCompressionPercent)<1e-7)
    assert.equal(row.bodyMetricPreserved,true)
    assert.equal(row.interpanelNearClearancePairs,inter.nearClearancePairs)
    assert.equal(row.interpanelStaticClear,inter.staticInterpanelExactClear)
    assert.equal(row.intrapanelIntersections,intra.intersectingTrianglePairs)
    assert.equal(row.staticContactValid,intra.staticDisjointThicknessScreenClear&&inter.staticInterpanelExactClear)
    assert.equal(row.physicalAcceptance,false)
    if(row.researchDepthScreenClear)clear.push(row)
  }
  assert.ok(clear.length>0,'must have at least one clear candidate')
  const preferred=[...clear].sort((a,b)=> a.rmsGapMm-b.rmsGapMm || a.maxGapMm-b.maxGapMm)[0]
  assert.equal(result.selectedDepthM,preferred.depthM)
  assert.equal(result.selected.depthM,preferred.depthM)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(result.avatarEntryCertified,false)
  assert.equal(result.continuousDeformableCCDCertified,false)
  assert.equal(result.sourceNonmutationVerified,true)
  assert.equal(JSON.stringify(source),before)
  assert.ok(result.selectedPayload)
  close(independentSeams(result.selectedPayload).rms,result.selected.rmsGapMm)
  const colliding=result.candidates.filter(c=>!c.interpanelStaticClear&&c.rmsGapMm<preferred.rmsGapMm)
  assert.ok(colliding.length>0,'lower-RMS colliding depth must be rejected')
  assert.ok(colliding.every(c=>c.depthM!==result.selectedDepthM))
  console.log('PLANAR_BODY_DEPTH_ORACLE '+JSON.stringify({selectedDepthM:result.selectedDepthM,
    clear:clear.map(c=>c.depthM),collidingLowerRms:colliding.map(c=>c.depthM),
    sourceRmsMm:base.rms,selectedRmsMm:preferred.rmsGapMm,bodyEdgesChecked:result.selected.bodyEdgesChecked}))
})

test('invalid bounded grids and clearances fail closed',()=>{
  const source=fixture()
  for(const grid of [[],[0],[0,.005,.005],[.01,0],[-.001,.01],[0,.041],
    [0,NaN],[0,Infinity],[0,'0.01'],Array(2),Array.from({length:13},(_,i)=>i*.001)])
    assert.throws(()=>research(source,{depthsM:grid}),/depth grid/)
  for(const clearance of [0,-.001,.011,Infinity,NaN,'0.001'])
    assert.throws(()=>research(source,{clearanceM:clearance}),/clearance/)
})

test('tampered four-panel payload rejected and source stays unchanged',()=>{
  const source=fixture(), before=JSON.stringify(source)
  const edits=[
    p=>p.particles[0].position[0]+=.002,
    p=>p.pieces.find(x=>x.id==='front').flatVerticesM[0][0]+=.001,
    p=>p.constraints.splice(p.constraints.findIndex(c=>c.type==='seam'),1),
    p=>p.pieces.find(x=>x.id==='back').faces.pop(),
    p=>p.particles[0].previous[2]+=.001,
  ]
  for(const edit of edits){const bad=structuredClone(source);edit(bad)
    assert.throws(()=>research(bad,{depthsM:[0,.014]}),/fixture identity mismatch/)}
  assert.equal(JSON.stringify(source),before)
  const result=research(source,{depthsM:[0,.014]})
  assert.equal(JSON.stringify(source),before)
  assert.equal(result.physicalAcceptance,false)
  assert.ok(result.candidates.every(c=>c.physicalAcceptance===false))
})
