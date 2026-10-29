import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeParametricPointProposal as propose, sampleNativeConstructionContour,simulateNativeAnchorRemap20261023} from './nativeParametricPoint20261023.js'

const poly={points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['bottom','right','top','left'],curves:{},free_curve_points:{}}
const snapshot={revision:7,template:{panels:[{id:'front',polygon:poly}]}}
const run=(mode,props={})=>propose(snapshot,{panelId:'front',pointIndex:1,mode,...props})

test('measured along / normal / polar construction stays in metres in Rust and mm in UI, without mutation',()=>{
  const before=structuredClone(snapshot)
  const along=run('along',{a:0,b:1,distanceMm:250})
  assert.equal(along.ok,true);assert.deepEqual(along.command.position,[.25,0]);assert.deepEqual(along.proposedMm,[250,0])
  const normal=run('normal',{a:0,b:1,distanceMm:-150})
  assert.equal(normal.ok,true);assert(Math.abs(normal.proposedMm[1]+150)<1e-8)
  const polar=run('polar',{a:0,distanceMm:200,angleDeg:30})
  assert.equal(polar.ok,true);assert(Math.abs(polar.proposedMm[0]-173.2050807569)<1e-6)
  assert.equal(polar.revision,7);assert.equal(polar.manufacturingApproved,false)
  assert.deepEqual(snapshot,before)
})

test('projection / reflection / line intersection solve analytic positions',()=>{
  const projected=run('project',{a:0,b:2})
  assert.equal(projected.ok,true)
  const mirrored=run('mirror',{a:0,b:2})
  // Analytic reflection is supported, but a mirror destroying the closed
  // panel is correctly rejected rather than corrupting the sewing boundary.
  assert.equal(mirrored.ok,false);assert.match(mirrored.reason,/area|intersect/)
  // Move the top-right vertex to the intersection of top and right axes;
  // the original lies at that junction already, so fail closed on no-op.
  const none=propose(snapshot,{panelId:'front',pointIndex:2,mode:'intersect',a:1,b:2,c:2,d:3})
  assert.equal(none.ok,false);assert.match(none.reason,/does not change/)
})

test('invalid, degenerate, extreme and stale source settings never produce a native command',()=>{
  for(const s of [
    {pointIndex:-1},{pointIndex:999},{a:42},{mode:'unknown'},
    {distanceMm:Infinity},{distanceMm:'nope'},{distanceMm:99999},
    {mode:'intersect',a:0,b:1,c:2,d:3},
  ]){
    const result=run(s.mode??'along',s)
    assert.equal(result.ok,false,JSON.stringify(s));assert.equal(result.command,undefined)
  }
  const corrupted=structuredClone(snapshot);corrupted.template.panels[0].polygon.points[2]=[Infinity,2]
  assert.equal(propose(corrupted,{panelId:'front',pointIndex:1}).ok,false)
  const stale={...snapshot,revision:null}
  assert.equal(propose(stale,{panelId:'front',pointIndex:1}).ok,false)
  assert(sampleNativeConstructionContour(poly).length>=4)
})

test('topology rejects collapsed, self-crossed or curved invalid proposals',()=>{
  const crossed=run('polar',{a:0,distanceMm:200,angleDeg:110})
  assert.equal(crossed.ok,false)
  const bad=structuredClone(snapshot);bad.template.panels[0].polygon.free_curve_points.bottom=[{t:.5,position:[NaN,0]}]
  assert.equal(propose(bad,{panelId:'front',pointIndex:1}).ok,false)
})

test('curved native Anchor proposal shifts outgoing and incoming handles exactly as Rust remap_anchors',()=>{
  const source=structuredClone(poly)
  source.curves.bottom=[[.12,-.04],[.30,-.03]]
  source.curves.right=[[.45,.09],[.44,.18]]
  const immutable=structuredClone(source)
  const next=simulateNativeAnchorRemap20261023(source,1,[.46,0])
  assert.deepEqual(next.points[1],[.46,0])
  assert.deepEqual(next.curves.bottom[0],source.curves.bottom[0])
  assert(Math.abs(next.curves.bottom[1][0]-.36)<1e-12)
  assert(Math.abs(next.curves.right[0][0]-.51)<1e-12)
  assert.deepEqual(next.curves.right[1],source.curves.right[1])
  assert.deepEqual(source,immutable,'no source mutation')
  const moved={revision:22,template:{panels:[{id:'front',polygon:source}]}}
  const checked=propose(moved,{panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceMm:450})
  assert.equal(checked.ok,true,checked.reason)
  assert.equal(checked.command.position[0],.45)
  assert.equal(checked.manufacturingApproved,false)
})

test('first corner remap wraps outgoing and previous-edge cubic control indexing',()=>{
  const source=structuredClone(poly)
  source.curves.bottom=[[.12,0],[.24,0]]
  source.curves.left=[[0,.2],[0,.1]]
  const next=simulateNativeAnchorRemap20261023(source,0,[.02,-.01])
  assert(Math.abs(next.curves.bottom[0][0]-.14)<1e-12)
  assert(Math.abs(next.curves.left[1][1]-.09)<1e-12)
  assert.deepEqual(source.points[0],[0,0])
})
