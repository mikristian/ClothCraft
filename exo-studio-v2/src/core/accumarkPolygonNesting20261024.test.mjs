import test from 'node:test'
import assert from 'node:assert/strict'
import { nestPolygons,polygonConflict } from './accumarkPolygonNesting20261024.js'

const piece=(id,coords,more={})=>({id,name:id,points:coords.map(([x,y])=>({x,y})),grainAngleDeg:0,cutQuantity:1,marker:{nap:'one-way'},...more})
const L=[[0,0],[6,0],[6,2],[2,2],[2,6],[0,6]]
const square=[[0,0],[3,0],[3,3],[0,3]]
test('concave geometry can pack inside another bounding box',()=>{
  const result=nestPolygons({pieces:[piece('L',L),piece('small',square)]},{fabricWidth:7,gap:0.1,maxLength:20})
  assert.equal(result.ok,true)
  assert.equal(result.placements.length,2)
  assert.ok(result.metrics.length<9,'must improve on stacked 6+3 AABB length')
  assert.equal(result.manufacturingApproved,false)
  assert.equal(polygonConflict(result.placements[0].outline,result.placements[1].outline,0),false)
})
test('rejects missing grain, nap, fold, and holes',()=>{
  for(const override of [{grainAngleDeg:undefined},{marker:{}},{fold:true},{holes:[square]}]) {
    const result=nestPolygons({pieces:[piece('x',square,override)]})
    assert.equal(result.ok,false)
    assert.equal(result.placements.length,0)
    assert.equal(result.errors.length,1)
  }
})
test('quantities and impossible widths are explicit',()=>{
  const result=nestPolygons({pieces:[piece('x',square,{cutQuantity:2})]},{fabricWidth:2})
  assert.equal(result.ok,false)
  assert.equal(result.unplaced.length,2)
})
test('crossing and contained polygons collide, disjoint ones do not',()=>{
  const a=square.map(([x,y])=>({x,y}))
  assert.equal(polygonConflict(a,a.map(p=>({x:p.x+1,y:p.y+1})),0),true)
  assert.equal(polygonConflict(a,a.map(p=>({x:p.x+4,y:p.y})),0),false)
})
