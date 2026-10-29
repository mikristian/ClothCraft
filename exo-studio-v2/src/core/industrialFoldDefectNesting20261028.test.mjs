import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons,polygonConflict} from './accumarkPolygonNesting20261024.js'

const rectangle=(id,w,h,extra={})=>({id,name:id,cutQuantity:1,grainAngleDeg:0,seamAllowance:0,
 points:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],marker:{nap:'one-way'},...extra})
const fold=(id='fold')=>rectangle(id,4,6,{marker:{nap:'one-way',onFold:true,foldEdgeIndex:3}})
const opts={fabricWidth:20,maxLength:40,gap:0,maxCandidates:5000}

test('fold edge is geometrically pinned to left usable fabric edge',()=>{
 const result=nestPolygons({pieces:[fold()]},{...opts,foldEdge:'left'})
 assert.equal(result.ok,true,JSON.stringify(result.errors))
 assert.equal(result.placements.length,1)
 assert.equal(result.placements[0].x,0)
 assert.equal(result.placements[0].folded,true)
 assert.equal(result.manufacturingApproved,false)
})

test('fold edge can be constrained to the right edge without changing source',()=>{
 const source={pieces:[rectangle('right',4,6,{marker:{nap:'one-way',onFold:true,foldEdgeIndex:1}})]}
 const before=structuredClone(source)
 const result=nestPolygons(source,{...opts,foldEdge:'right'})
 assert.equal(result.ok,true,JSON.stringify(result.errors))
 assert.equal(result.placements[0].x,16)
 assert.deepEqual(source,before)
})

test('defect rectangles are excluded with physical polygon clearance, not dropped',()=>{
 const defect={x:0,y:0,width:5,height:8}
 const source={pieces:[rectangle('a',4,4),rectangle('b',4,4)]}
 const result=nestPolygons(source,{...opts,defectZones:[defect],gap:.5})
 assert.equal(result.ok,true,JSON.stringify([...result.errors,...result.unplaced]))
 const outline=[{x:0,y:0},{x:5,y:0},{x:5,y:8},{x:0,y:8}]
 assert.equal(result.placements.length,2)
 for(const p of result.placements)assert.equal(polygonConflict(p.outline,outline,.5),false)
 assert.equal(result.metrics.defectCount,1)
 assert.equal(result.manufacturingApproved,false)
})

test('a defect covering the fold blocks rather than moving fold pieces away from it',()=>{
 const result=nestPolygons({pieces:[fold()]},{...opts,foldEdge:'left',defectZones:[{x:0,y:0,width:4,height:40}]})
 assert.equal(result.ok,false)
 assert.equal(result.placements.length,0)
 assert.equal(result.unplaced.length,1)
})

test('malformed defects, wrong fold edges and missing fold semantics fail closed',()=>{
 for(const defectZones of [[{x:0,y:0,width:-1,height:2}],[{x:0,y:0,width:30,height:2}],[{x:NaN,y:0,width:2,height:2}]]){
  const result=nestPolygons({pieces:[rectangle('a',3,3)]},{...opts,defectZones})
  assert.equal(result.ok,false)
  assert.deepEqual(result.errors,['invalid-physical-constraints'])
 }
 assert.equal(nestPolygons({pieces:[fold()]},opts).ok,false)
 assert.equal(nestPolygons({pieces:[fold()]},{...opts,foldEdge:'right'}).ok,false)
})
