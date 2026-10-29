import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {adjustAccuMarkManualMarker20261024 as adjust} from './accumarkManualMarker20261024.js'
const square=[[0,0],[3,0],[3,3],[0,3]]
const piece=(id,more={})=>({id,points:square.map(([x,y])=>({x,y})),cutQuantity:1,
 grainAngleDeg:0,marker:{nap:'one-way'},...more})
const project={pieces:[piece('a'),piece('b')]}
const nest=nestPolygons(project,{fabricWidth:15,gap:1})
test('repositions a physically valid piece into free fabric without mutating source',()=>{
 assert.equal(nest.ok,true)
 const before=structuredClone(nest),p=nest.placements.find(x=>x.pieceId==='b')
 const updated=adjust(project,nest,{pieceId:'b',instance:0,x:9,y:0,rotationDeg:0,
  fabricWidthCm:15,gapCm:1})
 assert.equal(updated.ok,true,updated.reason)
 assert.equal(updated.placements.find(x=>x.pieceId==='b').x,9)
 assert.equal(updated.manufacturingApproved,false)
 assert.deepEqual(nest,before)
})
test('rejects physical collisions, bounds, unsafe grain and missing pieces',()=>{
 const opt={pieceId:'b',instance:0,x:0,y:0,rotationDeg:0,fabricWidthCm:15,gapCm:1}
 assert.equal(adjust(project,nest,opt).code,'PHYSICAL_COLLISION')
 assert.equal(adjust(project,nest,{...opt,x:14}).code,'FABRIC_BOUNDS')
 assert.equal(adjust(project,nest,{...opt,x:9,rotationDeg:180}).code,'GRAIN_NAP_VIOLATION')
 assert.equal(adjust(project,nest,{...opt,pieceId:'missing'}).code,'TARGET_MISSING')
 const incomplete={...nest,placements:nest.placements.slice(0,1)}
 assert.equal(adjust(project,incomplete,{...opt,pieceId:'a',x:0}).code,'MISSING_QUANTITY')
})
test('allows explicitly authorized reverse grain only for no-nap source',()=>{
 const proj={pieces:[piece('a',{marker:{nap:'none',allowReverseGrain:true}})]}
 const base=nestPolygons(proj,{fabricWidth:15,gap:1})
 const updated=adjust(proj,base,{pieceId:'a',x:5,y:0,rotationDeg:180,fabricWidthCm:15,gapCm:1})
 assert.equal(updated.ok,true,updated.reason)
 assert.equal(updated.placements[0].rotationDeg,180)
})
