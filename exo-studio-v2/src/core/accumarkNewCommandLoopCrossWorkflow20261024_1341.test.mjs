import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkPieceRigidAction20261024_1341 as editPiece} from './accumarkPieceRigidActions20261024_1341.js'
import {applyAccuMarkLineConstruction as construct} from './accumarkLineConstruction20261024_1341.js'
import {inspectAccuMarkGradedStack20261024_1341 as inspect} from './accumarkGradeStackActions20261024_1341.js'

const source=()=>({id:'source-1',name:'Detached draft sandbox',
 pieces:[{id:'front-detached',name:'Front reference',points:[
  {x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],cutQuantity:1,
  fabricId:'main',seamAllowance:0,locked:false}],
 grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 seams:[],revision:0})

test('real pattern editing loop: move detached source, add parallel/perpendicular construction, measure, align size stack',()=>{
 const before=source()
 const moved=editPiece(before,{pieceId:'front-detached',action:'MOVE',dxCm:10,dyCm:5})
 assert.deepEqual(moved.project.pieces[0].points[0],{x:10,y:5})
 assert.deepEqual(before,source())
 const lined=construct(moved.project,{pieceId:'front-detached',kind:'line.parallel',lineId:'parallel-1',
  a:{x:10,y:5},b:{x:30,y:5},distanceCm:2})
 assert.deepEqual(lined.line.a,{x:10,y:7})
 const perpendicular=construct(lined.project,{pieceId:'front-detached',kind:'line.perpendicular',
  lineId:'perpendicular-1',referenceLineId:'parallel-1',lengthCm:4,atFraction:.5})
 const measured=construct(perpendicular.project,{pieceId:'front-detached',kind:'line.measureDistance',
  referenceLineId:'perpendicular-1'})
 assert.equal(measured.measurement.lengthCm,4)
 assert.equal(perpendicular.project.pieces[0].internalLines.length,2)
 const stack=inspect(perpendicular.project,{pieceId:'front-detached',
  pointIndex:0,edgeIndex:0,edgeFraction:.5,sizes:['S','M','L']})
 assert.equal(stack.rows.length,3)
 assert(stack.rows.every(x=>Math.abs(x.selectedEdgeLengthCm-20)<1e-8))
 assert.equal(stack.sourceGradeRulesUnchanged,true)
 assert.equal(stack.cuttingAuthorized,false)
 assert.equal(stack.manufacturingApproved,false)
 assert.equal(perpendicular.project.pieces[0].cutQuantity,1)
})

test('attached new line refuses later rigid piece transform instead of silently orphaning a non-cutting mark',()=>{
 const first=construct(source(),{pieceId:'front-detached',kind:'line.twoPoint',
  lineId:'mark-1',a:{x:0,y:0},b:{x:4,y:2}})
 assert.throws(()=>editPiece(first.project,{pieceId:'front-detached',action:'ROTATE',angleDeg:90}),/UNSUPPORTED_ATTACHMENT/)
})

test('grade alignment does not overwrite edited dimensional source geometry after successful piece move',()=>{
 const original=source()
 const outcome=editPiece(original,{pieceId:'front-detached',action:'MOVE',dxCm:3.25,dyCm:-2.5})
 const before=structuredClone(outcome.project)
 const o=inspect(outcome.project,{pieceId:'front-detached',pointIndex:2,align:'anchor'})
 assert(o.rows.every(row=>Math.abs(row.alignedAnchor.xCm-23.25)<1e-9))
 assert.deepEqual(outcome.project,before)
})
