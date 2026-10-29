import test from 'node:test'
import assert from 'node:assert/strict'
import {calibrateAccuMarkDigitizing,importAccuMarkDigitizedPiece} from './accumarkDigitizing20261023.js'
const project=()=>({pieces:[],grading:{sizes:['M'],baseSize:'M'}})
const square=[{x:20,y:40},{x:220,y:40},{x:220,y:140},{x:20,y:140},{x:20,y:40}]
const input=()=>({id:'front',name:'Front Panel',observedPoints:square,calibration:{anchors:[square[0],square[1]],sourceUnits:'pixels',physicalDistanceCm:20}})
test('calibration reproduces physical cm dimensions with explicit anchors and no mutation',()=>{
  const p=project(),s=input(),before=structuredClone(s),beforeProject=structuredClone(p)
  const result=importAccuMarkDigitizedPiece(p,s)
  assert.equal(result.validation.ok,true)
  assert.deepEqual(result.piece.points,[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}])
  assert.deepEqual(s,before);assert.deepEqual(p,beforeProject)
  assert.equal(result.validation.winding,'ccw')
})
test('mm/cm and image y flip/rotation calibration',()=>{
  const mm=calibrateAccuMarkDigitizing({anchors:[{x:0,y:0},{x:200,y:0}],sourceUnits:'mm',rotationDeg:90,flipY:true})
  assert.ok(Math.abs(mm.transform({x:200,y:0}).y-20)<1e-9)
  assert.ok(mm.transform({x:0,y:100}).x>9.999)
  const cm=calibrateAccuMarkDigitizing({anchors:[{x:2,y:4},{x:12,y:4}],sourceUnits:'cm'})
  assert.equal(cm.scaleCmPerSourceUnit,1)
})
test('fail closed for crossing, winding, repeated vertex, open and bad calibration',()=>{
  const p=project(),s=input()
  const bowtie=[{x:0,y:0},{x:200,y:100},{x:0,y:100},{x:200,y:0}]
  for(const overrides of [
    {observedPoints:bowtie},{winding:'cw'},{closed:false},
    {observedPoints:[...square.slice(0,4),square[2]]},
    {calibration:{anchors:[square[0],square[0]],sourceUnits:'pixels',physicalDistanceCm:20}},
    {calibration:{anchors:[square[0],square[1]],sourceUnits:'pixels'}},
  ])assert.throws(()=>importAccuMarkDigitizedPiece(p,{...s,...overrides}))
  assert.deepEqual(p,project())
})
test('source sewing annotations are reported as unhandled',()=>{
  const r=importAccuMarkDigitizedPiece(project(),{...input(),sourceSeams:[{from:0}],sourceNotches:[{edge:1}]})
  assert.deepEqual(r.warnings.map(w=>w.code),['UNMAPPED_SEAMS','UNMAPPED_NOTCHES'])
  assert.deepEqual(r.piece.notches,[])
})
