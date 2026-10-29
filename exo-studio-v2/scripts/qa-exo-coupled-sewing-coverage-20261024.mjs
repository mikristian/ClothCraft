import test from 'node:test'
import assert from 'node:assert/strict'
import {screenNativeCoupledCreaseAnglePath20261024 as screen} from
  '../src/core/backends/nativeCoupledCreaseAnglePathResearch20261024.js'

const flat=[[-.03,0,0],[0,0,0],[.03,0,0],[-.03,.1,0],[0,.1,0],[.03,.1,0]]
const faces=[[0,1,4],[0,4,3],[1,2,4],[2,5,4]]
const panels=()=>['a','b','c','d'].map((panelId,i)=>({panelId,
  verticesM:flat.map(v=>[...v]),
  worldPositionsM:flat.map(([x,y])=>[x,y,i*.05]),
  faces:faces.map(f=>[...f]),creaseEdges:[[1,4]]}))
const pair=(a,b,vertex=0)=>({a:{panelId:a,vertex},b:{panelId:b,vertex}})
const full=()=>[pair('a','b'),pair('b','c'),pair('c','d'),pair('a','b',3)]
const opts=(sewingPairs,requiredSewingPairs)=>({sewingPairs,requiredSewingPairs,
  subdivisions:2,seamToleranceMm:100})

test('connected spanning tree is insufficient against a four-pair sewing manifest',()=>{
  const p=panels(),before=JSON.stringify(p)
  const r=screen(p,opts(full().slice(0,3),full()))
  assert.equal(r.sewingGraphConnected,true)
  assert.equal(r.sampledContactClear,true)
  assert.equal(r.terminalSeamWithinTolerance,true)
  assert.equal(r.sewingCoverageChecked,true)
  assert.equal(r.sewingCoverageMatchesManifest,false)
  assert.equal(r.sampledResearchGatePass,false)
  assert.equal(r.physicalAcceptance,false)
  assert.equal(JSON.stringify(p),before)
})

test('all authored sewing pairs are recognized without implying physical certification',()=>{
  const r=screen(panels(),opts(full(),full()))
  assert.equal(r.sewingCoverageMatchesManifest,true)
  assert.equal(r.sampledResearchGatePass,true)
  assert.equal(r.physicalAcceptance,false)
  assert.equal(r.sweptCollisionCertified,false)
})

test('manifest matching ignores pair direction and pair ordering',()=>{
  const reverse=full().map(({a,b})=>({a:{...b},b:{...a}})).reverse()
  assert.equal(screen(panels(),opts(reverse,full())).sewingCoverageMatchesManifest,true)
})

test('an unapproved extra sewing pair fails the manifest even when all required pairs exist',()=>{
  const r=screen(panels(),opts([...full(),pair('b','d',3)],full()))
  assert.equal(r.sewingGraphConnected,true)
  assert.equal(r.sewingCoverageMatchesManifest,false)
  assert.equal(r.sampledResearchGatePass,false)
})

test('missing manifest is explicitly unverified, not silently certified',()=>{
  const r=screen(panels(),opts(full(),null))
  assert.equal(r.sewingCoverageChecked,false)
  assert.equal(r.sewingCoverageMatchesManifest,null)
  assert.equal(r.physicalAcceptance,false)
})

test('malformed, duplicate, self and unknown required correspondences fail closed',()=>{
  const p=panels()
  assert.throws(()=>screen(p,opts(full(),[])),/settings/)
  assert.throws(()=>screen(p,opts(full(),{})),/settings/)
  assert.throws(()=>screen(p,opts(full(),[pair('a','b'),pair('b','a')])),/Duplicate/)
  assert.throws(()=>screen(p,opts(full(),[pair('a','a')])),/cross-panel/)
  assert.throws(()=>screen(p,opts(full(),[pair('a','unknown')])),/cross-panel/)
  assert.throws(()=>screen(p,opts(full(),[pair('a','b',999)])),/cross-panel/)
})
