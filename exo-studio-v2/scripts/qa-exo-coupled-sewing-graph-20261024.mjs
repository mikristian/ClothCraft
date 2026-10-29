import test from 'node:test'
import assert from 'node:assert/strict'
import {screenNativeCoupledCreaseAnglePath20261024 as screen} from
  '../src/core/backends/nativeCoupledCreaseAnglePathResearch20261024.js'

const flat=[[-.03,0,0],[0,0,0],[.03,0,0],[-.03,.1,0],[0,.1,0],[.03,.1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
const panel=(id,z)=>({panelId:id,
  verticesM:flat.map(v=>[...v]),
  worldPositionsM:flat.map(([x,y])=>[x,y,z]),
  faces:faces.map(f=>[...f]),creaseEdges:[[1,4]]})
const pair=(a,b)=>({a:{panelId:a,vertex:0},b:{panelId:b,vertex:0}})
const four=()=>['a','b','c','d'].map((id,i)=>panel(id,i*.05))
const options=sewingPairs=>({sewingPairs,subdivisions:2,seamToleranceMm:100})

test('self-correspondence cannot spoof a perfectly closed four-panel seam',()=>{
  const panels=four(),before=JSON.stringify(panels)
  assert.throws(()=>screen(panels,options([pair('a','a')])),/cross-panel/)
  assert.equal(JSON.stringify(panels),before)
})

test('one plausible seam cannot certify an otherwise disconnected four-panel garment',()=>{
  const panels=four(),before=JSON.stringify(panels)
  const result=screen(panels,options([pair('a','b')]))
  assert.equal(result.sampledContactClear,true)
  assert.equal(result.sampledStrainValid,true)
  assert.equal(result.terminalSeamWithinTolerance,true)
  assert.equal(result.sewingGraphConnected,false)
  assert.equal(result.sampledResearchGatePass,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(JSON.stringify(panels),before)
})

test('two disconnected sewn pairs are insufficient even with small RMS and max gaps',()=>{
  const result=screen(four(),options([pair('a','b'),pair('c','d')]))
  assert.ok(result.poses.at(-1).maximumSeamGapMm<100)
  assert.ok(result.poses.at(-1).rmsSeamGapMm<100)
  assert.equal(result.sewingGraphConnected,false)
  assert.equal(result.sampledResearchGatePass,false)
})

test('independently connected three-edge spanning chain retains research-only pass',()=>{
  const panels=four(),before=JSON.stringify(panels)
  const pairs=[pair('a','b'),pair('b','c'),pair('c','d')]
  // Independent graph oracle: every panel is reachable from the first.
  const reached=new Set(['a'])
  for(let i=0;i<4;i++)for(const p of pairs){
    if(reached.has(p.a.panelId))reached.add(p.b.panelId)
    if(reached.has(p.b.panelId))reached.add(p.a.panelId)
  }
  assert.equal(reached.size,4)
  const result=screen(panels,options(pairs))
  assert.equal(result.sewingGraphConnected,true)
  assert.equal(result.terminalSeamWithinTolerance,true)
  assert.equal(result.sampledContactClear,true)
  assert.equal(result.sampledResearchGatePass,true)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.sweptCollisionCertified,false)
  assert.equal(result.avatarContactChecked,false)
  assert.equal(JSON.stringify(panels),before)
})

test('a connected and perfectly closed seam still fails when fabric intersects',()=>{
  const panels=[panel('a',0),panel('b',0)]
  const result=screen(panels,options([pair('a','b')]))
  assert.equal(result.sewingGraphConnected,true)
  assert.equal(result.terminalSeamWithinTolerance,true)
  assert.equal(result.sampledContactClear,false)
  assert.equal(result.sampledResearchGatePass,false)
  assert.equal(result.physicalAcceptance,false)
})

test('reversed duplicates, unknown panels, and out-of-range vertices fail closed',()=>{
  const panels=four()
  assert.throws(()=>screen(panels,options([pair('a','b'),pair('b','a')])),/Duplicate/)
  assert.throws(()=>screen(panels,options([pair('a','missing')])),/cross-panel/)
  const bad=pair('a','b');bad.a.vertex=999
  assert.throws(()=>screen(panels,options([bad])),/cross-panel/)
  assert.throws(()=>screen(panels,{sewingPairs:{length:1}}),/settings/)
})
