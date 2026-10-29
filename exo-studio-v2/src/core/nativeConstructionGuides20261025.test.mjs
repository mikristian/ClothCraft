import test from 'node:test'
import assert from 'node:assert/strict'
import {clipNativeConstructionLine20261025 as clip,
  nativePanelLocalToWorld20261025 as toWorld,
  nativePanelWorldToLocal20261025 as toLocal,
  buildNativeConstructionGuides20261025 as build} from './nativeConstructionGuides20261025.js'

const rectangle=[[0,0],[.2,0],[.2,.2],[0,.2]]
const snapshot=(polygon=rectangle,extra={})=>({revision:5,template:{panels:[{id:'front',layout_rotation_degrees:90,polygon:{points:polygon,...extra}}]}})
test('rotated panel coordinate transformation is reversible',()=>{
  const panel=snapshot().template.panels[0],layout=[1,2],point=[.03,.08]
  const world=toWorld(panel,layout,point)
  assert.ok(Math.abs(world[0]-.92)<1e-12)
  assert.deepEqual(toLocal(panel,layout,world).map(n=>Number(n.toFixed(9))),point)
})
test('clipping preserves disconnected segments of concave panel',()=>{
  const concave=[[0,0],[.3,0],[.3,.3],[.2,.3],[.2,.1],[.1,.1],[.1,.3],[0,.3]]
  const result=clip(concave,[-.1,.2],[.4,.2])
  assert.equal(result.length,2)
  assert.deepEqual(result.map(s=>s.map(p=>Number(p[0].toFixed(8)))),[[0,.1],[.2,.3]])
})
test('native fold/pleat create bounded panel-local commands',()=>{
  const fold=build(snapshot(),{panelId:'front',kind:'fold',start:[-.1,.1],end:[.3,.1]})
  assert.equal(fold.ok,true)
  assert.equal(fold.guides.length,1)
  assert.ok(Math.abs(fold.guides[0].lengthMm-199)<1e-8)
  assert.ok(fold.guides[0].command.points[0][0]>0)
  assert.ok(fold.guides[0].command.points[1][0]<.2)
  assert.deepEqual(fold.guides[0].command.tangents,[[0,0],[0,0]])
  const pleat=build(snapshot(),{panelId:'front',kind:'pleat',start:[.03,.1],end:[.17,.1],count:3,spacingMm:30})
  assert.equal(pleat.ok,true)
  assert.equal(pleat.guides.length,3)
  assert.deepEqual(pleat.guides.map(g=>g.role),['pleat-fold','pleat-placement','pleat-fold'])
})
test('dart legs clip and remain strictly internal to panel',()=>{
  const result=build(snapshot(),{panelId:'front',kind:'dart',start:[.04,.04],end:[.16,.04],depthMm:45,intakeMm:20})
  assert.equal(result.ok,true)
  assert.equal(result.guides.length,2)
  assert.ok(result.guides.every(g=>g.command.kind==='InternalLine'&&g.lengthMm>40))
})
test('world-space coordinates use native rotation before clipping',()=>{
  const panel=snapshot().template.panels[0],layout=[1,2]
  const start=toWorld(panel,layout,[-.1,.1]),end=toWorld(panel,layout,[.3,.1])
  const result=build(snapshot(),{panelId:'front',kind:'internal',start,end,space:'world',layout})
  assert.equal(result.ok,true)
  assert.ok(Math.abs(result.guides[0].lengthMm-199)<1e-7)
})
test('reject unsupported holes, boundary overlaps, invalid and out-of-panel marks',()=>{
  assert.equal(build(snapshot(rectangle,{holes:[[[.02,.02],[.03,.02],[.03,.03]]]}),{panelId:'front',start:[.05,.05],end:[.1,.1]}).ok,false)
  assert.throws(()=>clip(rectangle,[0,0],[.2,0]),/overlaps/)
  assert.equal(build(snapshot(),{panelId:'front',start:[.3,.3],end:[.4,.4]}).ok,false)
  assert.equal(build(snapshot(),{panelId:'front',kind:'pleat',start:[.03,.1],end:[.17,.1],count:200}).ok,false)
  assert.equal(build(snapshot(),{panelId:'front',kind:'dart',start:[.04,.04],end:[.16,.04],intakeMm:200}).ok,false)
})
test('existing fold centred in a pleat arrangement is reused and not duplicated',()=>{
  const original=snapshot()
  original.template.panels[0].polygon.lines=[{id:'fold-existing',
    points:[[.03,.1],[.17,.1]],tangents:[[0,0],[0,0]]}]
  const preserved=structuredClone(original)
  const result=build(original,{panelId:'front',kind:'pleat',start:[.03,.1],end:[.17,.1],
    count:3,spacingMm:15})
  assert.equal(result.ok,true)
  assert.equal(result.reusedLines,1)
  assert.equal(result.guides.length,2)
  assert.deepEqual(original,preserved)
})
test('crossing an already saved fold rejects intersecting dart marks before native edits',()=>{
 const original=snapshot()
 original.template.panels[0].polygon.lines=[{id:'fold',points:[[.03,.05],[.17,.05]],
  tangents:[[0,0],[0,0]]}]
 const protectedBefore=structuredClone(original)
 const proposal=build(original,{panelId:'front',kind:'dart',
  start:[.04,.04],end:[.16,.04],intakeMm:20,depthMm:40})
 assert.equal(proposal.ok,false)
 assert.match(proposal.reason,/intersects an existing/)
 assert.deepEqual(original,protectedBefore)
})
