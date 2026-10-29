import test from 'node:test'
import assert from 'node:assert/strict'
import {penCubicAt,penSegmentAt,insertPenAnchor,reshapePenDraftSegment} from './vectorcraftPenGesture20261023.js'

test('VectorCraft Add Anchor targets actual clicked open segment, not selected anchor',()=>{
  const points=[[0,0],[.1,0],[.3,.2]],tangents=[[0,0],[0,0],[0,0]]
  const hit=penSegmentAt(points,tangents,[.2,.1],.00001)
  assert.equal(hit?.index,1)
  const added=insertPenAnchor(points,tangents,hit.index,hit.t)
  assert.equal(added.points.length,4)
  assert.equal(added.index,2)
  assert.ok(Math.hypot(added.points[2][0]-.2,added.points[2][1]-.1)<.0001)
  assert.deepEqual(added.points[0],points[0])
  assert.deepEqual(added.points[1],points[1])
  assert.deepEqual(added.points[3],points[2])
})

test('Add Anchor on cubic uses De Casteljau actual point and rejects distant clicks',()=>{
  const pts=[[0,0],[.3,0]],handles=[[.09,.16],[.06,-.11]],t=.3
  const actual=penCubicAt(pts[0],pts[1],handles[0],handles[1],t).p
  const hit=penSegmentAt(pts,handles,actual,.0005)
  assert.equal(hit?.index,0)
  assert.ok(Math.abs(hit.t-t)<.005)
  const added=insertPenAnchor(pts,handles,0,hit.t)
  assert.ok(Math.hypot(added.points[1][0]-actual[0],added.points[1][1]-actual[1])<.001)
  assert.equal(penSegmentAt(pts,handles,[9,9],.005),null)
  assert.equal(insertPenAnchor(pts,handles,0,0),null)
  assert.equal(insertPenAnchor(pts,handles,0,1),null)
})

test('Add Anchor input guards reject invalid coordinates and distance',()=>{
  assert.equal(penSegmentAt([[0,0],[1,1]],[],[NaN,0],.1),null)
  assert.equal(penSegmentAt([[0,0],[1,1]],[],[.5,.5],0),null)
  assert.equal(penSegmentAt([],[],[0,0],.1),null)
})

test('Anchor Point drag over unfinished line bends it without adding or moving draft points',()=>{
  const points=[[0,0],[.24,0],[.24,.25]],tangents=[[0,0],[0,0],[0,0]]
  const result=reshapePenDraftSegment(points,tangents,0,.5,[0,-.036])
  assert.deepEqual(result.points,points)
  assert.deepEqual(points,[[0,0],[.24,0],[.24,.25]])
  assert.equal(result.tangents.length,3)
  assert.ok(result.tangents[0][1]<0&&result.tangents[1][1]>0)
  assert.ok(Math.abs(penCubicAt(points[0],points[1],result.tangents[0],result.tangents[1],.5).p[1]+.036)<1e-10)
  assert.deepEqual(result.tangents[2],[0,0])
})

test('Shift Anchor Point drag bends a draft segment perpendicular to its anchors',()=>{
  const points=[[.02,.04],[.26,.04]],tangents=[[0,0],[0,0]]
  const result=reshapePenDraftSegment(points,tangents,0,.5,[.05,.03],{perpendicular:true})
  assert.ok(result)
  const a=penCubicAt(points[0],points[1],result.tangents[0],result.tangents[1],.5).p
  assert.ok(Math.abs(a[1]-.07)<1e-10)
  assert.ok(Math.abs(a[0]-.14)<1e-10)
  assert.equal(reshapePenDraftSegment(points,tangents,0,.5,[Infinity,0]),null)
})
