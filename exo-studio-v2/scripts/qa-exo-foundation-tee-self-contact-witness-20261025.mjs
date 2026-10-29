import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {inspectNativeIntrapanelStaticContact as inspect} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {diagnoseNativeSamePanelContactWitnesses20261025 as diagnose} from
  '../src/core/backends/nativeFoundationTeeSelfContactWitnessResearch20261025.js'
import {researchFoundationTeeHingedBody20261025 as hinge} from
  '../src/core/backends/nativeFoundationTeeHingedBodyResearch20261025.js'

const fixture=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const norm=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))

test('full original-tee witness inventory localizes all six to sewn sleeve endpoints',()=>{
  const source=fixture(),snapshot=JSON.stringify(source)
  const limited=inspect(source),full=inspect(source,{maxIntersectionWitnesses:6})
  assert.equal(limited.intersectingTrianglePairs,6)
  assert.equal(limited.intersections.length,5)
  assert.equal(limited.intersectionWitnessesComplete,false)
  assert.equal(full.intersections.length,6)
  assert.equal(full.intersectionWitnessesComplete,true)
  assert.deepEqual(full.intersectionCountsByPiece,
    {'sleeve-left':3,'sleeve-right':3})
  const report=diagnose(source)
  assert.equal(report.witnessInventoryComplete,true)
  assert.equal(report.totalIntersectionWarnings,6)
  assert.equal(report.strictTransversePiercingWitnesses,0)
  assert.equal(report.sampledUnresolvedWarnings,6)
  assert.equal(report.uninspectedIntersectionWarnings,0)
  assert.equal(report.staticContactClear,false)
  assert.equal(report.physicalAcceptance,false)
  assert.equal(report.safeToAutoApply,false)
  assert.equal(report.continuousDeformableCCDCertified,false)
  const expected=[]
  for(const id of ['sleeve-left','sleeve-right'])for(const b of [58,64,117])
    expected.push(`${id}:37:${b}`)
  assert.deepEqual(report.witnesses.map(w=>`${w.pieceId}:${w.faceA}:${w.faceB}`),expected)
  for(const w of report.witnesses){
    assert.equal(w.sharedMaterialVertices,0)
    assert.equal(w.materialFaceEdgeHops,null)
    assert.ok(w.exactTriangleDistanceMm<1e-8)
    assert.equal(w.classification,'unresolved-touching-tangency-or-other-contact')
    assert.equal(w.contactVetoRetained,true)
    const piece=source.pieces.find(p=>p.id===w.pieceId)
    const coincidence=w.coincidentDistinctMaterialVertices.find(c=>
      c.indexA===4&&c.indexB===7)
    assert.ok(coincidence,'opposite sleeve wings meet in world coordinates')
    assert.ok(coincidence.worldDistanceMm<1e-8)
    assert.ok(Math.abs(coincidence.materialDistanceMm-345)<1e-8)
    const seam=source.constraints.find(c=>c.type==='seam'&&
      ((c.a===piece.particleIndices[4]&&c.b===piece.particleIndices[7])||
       (c.b===piece.particleIndices[4]&&c.a===piece.particleIndices[7])))
    assert.ok(seam,'independent direct sewing lookup')
    assert.deepEqual(coincidence.directSewingSeamIds,[seam.seamId])
  }
  assert.equal(JSON.stringify(source),snapshot)
})

test('strict interior transverse piercing is distinguished from unresolved contact',()=>{
  const positions=[[0,0,0],[1,0,0],[0,1,0],
    [.25,.25,-.1],[.25,.25,.1],[.8,.3,.1]]
  const source={particles:positions.map(position=>({position})),
    pieces:[{id:'synthetic',particleIndices:[0,1,2,3,4,5],
      flatVerticesM:positions.map(p=>[p[0],p[1],0]),
      faces:[[0,1,2],[3,4,5]]}],constraints:[]}
  const before=JSON.stringify(source),report=diagnose(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.witnessInventoryComplete,true)
  assert.equal(report.strictTransversePiercingWitnesses,1)
  assert.ok(report.witnesses[0].strictTransverseCrossings.length>=1)
  assert.equal(report.witnesses[0].classification,'strict-transverse-piercing-detected')
  assert.equal(report.staticContactClear,false)
  assert.equal(JSON.stringify(source),before)
})

test('positive-area coplanar overlap stays rejected without a transverse witness',()=>{
  const positions=[[0,0,0],[1,0,0],[0,1,0],
    [.1,.1,0],[.8,.1,0],[.1,.8,0]]
  const source={particles:positions.map(position=>({position})),
    pieces:[{id:'coplanar',particleIndices:[0,1,2,3,4,5],
      flatVerticesM:positions.map(p=>[p[0],p[1],0]),
      faces:[[0,1,2],[3,4,5]]}],constraints:[]}
  const before=JSON.stringify(source),report=diagnose(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.strictTransversePiercingWitnesses,0)
  assert.equal(report.sampledUnresolvedWarnings,1)
  assert.equal(report.uninspectedIntersectionWarnings,0)
  assert.equal(report.staticContactClear,false)
  assert.equal(report.witnesses[0].classification,
    'unresolved-touching-tangency-or-other-contact')
  assert.equal(report.witnesses[0].contactVetoRetained,true)
  assert.equal(JSON.stringify(source),before)
})

test('removing underarm correspondence does not silently waive coincident contact',()=>{
  const source=fixture()
  source.constraints=source.constraints.filter(c=>
    c.seamId!=='seam-sleeve-l-underarm'&&
    c.seamId!=='seam-sleeve-r-underarm')
  const before=JSON.stringify(source),report=diagnose(source)
  assert.equal(report.totalIntersectionWarnings,6)
  assert.equal(report.staticContactClear,false)
  assert.equal(report.physicalAcceptance,false)
  for(const w of report.witnesses){
    const coincident=w.coincidentDistinctMaterialVertices.find(c=>
      c.indexA===4&&c.indexB===7)
    assert.deepEqual(coincident.directSewingSeamIds,[])
    assert.equal(w.contactVetoRetained,true)
  }
  assert.equal(JSON.stringify(source),before)
})

test('hinged body motion cannot be credited with fixing unchanged sleeve contacts',()=>{
  const source=fixture(),snapshot=JSON.stringify(source)
  const result=hinge(source,{anglesRadians:[.4],depthsM:[.013]})
  const posed=structuredClone(result.splitTopologyPayload)
  for(const id of ['front','back']){
    const original=source.pieces.find(p=>p.id===id)
    const piece=posed.pieces.find(p=>p.id===id)
    const frame=[0,1,2].map(k=>original.particleIndices.reduce((sum,global,i)=>
      sum+(k===2?source.particles[global].position[2]:
        source.particles[global].position[k]-original.flatVerticesM[i][k]),0)/
      original.particleIndices.length)
    for(let i=0;i<piece.particleIndices.length;i++){
      const uv=piece.flatVerticesM[i]
      posed.particles[piece.particleIndices[i]].position=[
        frame[0]+uv[0]*Math.cos(.4),frame[1]+uv[1],
        frame[2]+(id==='front'?-1:1)*(.013+Math.abs(uv[0])*Math.sin(.4))]
    }
  }
  for(const id of ['sleeve-left','sleeve-right']){
    const piece=source.pieces.find(p=>p.id===id)
    for(const global of piece.particleIndices)
      assert.equal(norm(source.particles[global].position,
        posed.particles[global].position),0)
  }
  const report=diagnose(posed)
  assert.equal(report.totalIntersectionWarnings,6)
  assert.equal(report.strictTransversePiercingWitnesses,0)
  assert.equal(report.staticContactClear,false)
  assert.equal(JSON.stringify(source),snapshot)
})

test('witness budgets are bounded and cannot imply complete evidence',()=>{
  const source=fixture(),snapshot=JSON.stringify(source)
  for(const value of [-1,257,1.5,NaN,Infinity,'6',null])
    assert.throws(()=>inspect(source,{maxIntersectionWitnesses:value}),/witness budget/)
  const none=inspect(source,{maxIntersectionWitnesses:0})
  assert.equal(none.intersections.length,0)
  assert.equal(none.intersectionWitnessesComplete,false)
  assert.equal(none.intersectingTrianglePairs,6)
  assert.equal(JSON.stringify(source),snapshot)
})

test('capped crossing evidence separates uninspected from sampled unresolved pairs',()=>{
  const positions=[],faces=[]
  for(let i=0;i<257;i++){
    const x=i*3,base=positions.length
    positions.push([x,0,0],[x+1,0,0],[x,1,0],
      [x+.25,.25,-.1],[x+.25,.25,.1],[x+.8,.3,.1])
    faces.push([base,base+1,base+2],[base+3,base+4,base+5])
  }
  const source={particles:positions.map(position=>({position})),
    pieces:[{id:'bounded-crossings',particleIndices:positions.map((_,i)=>i),
      flatVerticesM:positions.map(p=>[p[0],p[1],0]),faces}],constraints:[]}
  const before=JSON.stringify(source),report=diagnose(source)
  assert.equal(report.totalIntersectionWarnings,257)
  assert.equal(report.witnesses.length,256)
  assert.equal(report.witnessInventoryComplete,false)
  assert.equal(report.strictTransversePiercingWitnesses,256)
  assert.equal(report.sampledUnresolvedWarnings,0)
  assert.equal(report.uninspectedIntersectionWarnings,1)
  assert.equal(report.staticContactClear,false)
  assert.equal(report.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),before)
})
