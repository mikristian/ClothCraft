import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {buildAccuMarkCutterPathStudy20261024 as study} from './accumarkCutterPathStudy20261024.js'
const piece=id=>({id,points:[{x:0,y:0},{x:3,y:0},{x:3,y:2},{x:0,y:2}],
 cutQuantity:1,seamAllowance:0,grainAngleDeg:0,marker:{nap:'one-way'}})
const nest=nestPolygons({pieces:[piece('front'),piece('back')]},{fabricWidth:15,gap:1})
test('generates physically measured, explicitly nonmachine-ready closed-cut records',()=>{
 assert.equal(nest.ok,true)
 const result=study(nest,{fabricWidthCm:15,spaceCm:1})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.records.length,2)
 assert.equal(result.totals.physicalCuts,2)
 assert(result.totals.totalPerimeterMm>100)
 assert.deepEqual(result.records[0].physicalCutPathMm[0],result.records[0].physicalCutPathMm.at(-1))
 assert.equal(result.calibration.horizontalMm,100)
 assert.equal(result.commandProtocol,null)
 assert.equal(result.cuttingAuthorized,false)
})
test('refuses overlap, out-of-width, duplicates and unverified nest',()=>{
 assert.equal(study({...nest,ok:false},{fabricWidthCm:15}).ok,false)
 assert.equal(study(nest,{fabricWidthCm:2}).code,'CUT_OUT_OF_BOUNDS')
 const overlap=structuredClone(nest);overlap.placements[1].outline=overlap.placements[0].outline
 assert.equal(study(overlap,{fabricWidthCm:15}).code,'CUTLINE_COLLISION')
 const duplicate=structuredClone(nest);duplicate.placements[1].pieceId='front'
 assert.equal(study(duplicate,{fabricWidthCm:15}).code,'DUPLICATE_INSTANCE')
 assert.equal(study(nest,{fabricWidthCm:15,calibrationMm:99}).code,'INVALID_STUDY_LIMITS')
})
