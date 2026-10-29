import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {buildAccuMarkCutterPathStudy20261024 as build} from './accumarkCutterPathStudy20261024.js'
import {inspectCutterStudyOutlineGeometry20261028 as inspect} from './accumarkCutterPathInspectionGeometry20261028.js'

const garment={pieces:[{id:'front',points:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],
  cutQuantity:1,seamAllowance:0,grainAngleDeg:0,marker:{nap:'one-way'}}]}
const original=nestPolygons(garment,{fabricWidth:20,gap:1})
assert.equal(original.ok,true,JSON.stringify(original.errors))
const forged=outline=>{
 const nest=structuredClone(original)
 nest.placements[0].outline=outline
 nest.ok=true
 nest.unplaced=[]
 nest.errors=[]
 return build(nest,{fabricWidthCm:20,spaceCm:1})
}

test('real disposable garment produces identical 0.0001 mm physical inspection coordinates without cutting authorization',()=>{
 const result=build(original,{fabricWidthCm:20,spaceCm:1})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.records.length,1)
 assert.equal(result.records[0].physicalCutPathMm.length,5)
 assert.deepEqual(result.records[0].physicalCutPathMm[0],result.records[0].physicalCutPathMm.at(-1))
 assert.equal(result.commandProtocol,null)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.manufacturingApproved,false)
 const check=inspect(original.placements[0].outline)
 assert.equal(check.ok,true,check.reason)
 assert.deepEqual(result.records[0].physicalCutPathMm.slice(0,-1),
  check.serializedOutlineMm.map(p=>({xMm:p.x,yMm:p.y})))
})

test('forged ok:true nest with self-crossing CUT outline is refused before any machine-neutral path is emitted',()=>{
 const result=forged([{x:1,y:1},{x:4,y:4},{x:1,y:4},{x:4,y:1}])
 assert.equal(result.ok,false)
 assert.ok(['CUTLINE_AREA_COLLAPSE','CUTLINE_SELF_INTERSECTION'].includes(result.code),result.code)
 assert.equal(result.cuttingAuthorized,false)
})

test('self-touching and repeated vertices are not valid cutting contours',()=>{
 const touch=forged([{x:1,y:1},{x:4,y:1},{x:4,y:4},{x:2,y:2},{x:1,y:4},{x:2,y:2}])
 assert.equal(touch.code,'CUTLINE_SELF_INTERSECTION')
 const repeated=forged([{x:1,y:1},{x:4,y:1},{x:4,y:4},{x:1,y:4},{x:1,y:1}])
 assert.equal(repeated.code,'CUTLINE_QUANTIZED_COLLAPSE')
})

test('subprecision edges and area collapse at 0.0001 mm serialized precision fail closed',()=>{
 const short=forged([{x:1,y:1},{x:1+1e-8,y:1},{x:4,y:1},{x:4,y:4},{x:1,y:4}])
 assert.equal(short.code,'CUTLINE_QUANTIZED_COLLAPSE')
 const flat=forged([{x:1,y:1},{x:2,y:1},{x:3,y:1}])
 assert.equal(flat.code,'CUTLINE_AREA_COLLAPSE')
})

test('valid concave physical contour is allowed; invalid finite input is not laundered by nest.ok',()=>{
 const concave=forged([{x:1,y:1},{x:6,y:1},{x:6,y:2},{x:2,y:2},{x:2,y:5},{x:1,y:5}])
 assert.equal(concave.ok,true,concave.reason)
 assert.equal(concave.records[0].notchCuttingVerified,false)
 assert.equal(concave.records[0].drillVerified,false)
 const nonfinite=forged([{x:1,y:1},{x:4,y:1},{x:Infinity,y:4},{x:1,y:4}])
 assert.equal(nonfinite.code,'INVALID_CUTLINE')
})
