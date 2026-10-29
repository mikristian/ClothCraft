import test from 'node:test'
import assert from 'node:assert/strict'
import {previewModarisCurvedSeamTrueing20261027 as trueCurve} from './modarisCurvedSeamTrueing20261027.js'
import {edgeLength} from './project.js'

const panel=(id,x,bulge)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}],curves:{0:{cx:x+5,cy:bulge}} ,edgeNames:['seam','right','top','left']})
const fixture=()=>({revision:7,units:'cm',pieces:[panel('source',0,-3),panel('target',20,-2.7)]})
const request={source:{pieceId:'source',edgeIndex:0},target:{pieceId:'target',edgeIndex:0},expectedRevision:7}

test('quadratic correction changes physical arclength with fixed vertices, names, orientation, and source',()=>{
 const input=fixture(),before=structuredClone(input),sourceLength=edgeLength(input.pieces[0],0)
 const result=trueCurve(input,{...request,maxTangentDriftDeg:12})
 assert.equal(result.changed,true)
 assert.equal(result.candidate.revision,8)
 assert.ok(Math.abs(result.targetLengthCm-sourceLength)<1e-9)
 assert.ok(Math.abs(result.residualCm)<1e-6)
 assert.ok(result.startTangentDriftDeg<=12&&result.endTangentDriftDeg<=12)
 assert.deepEqual(result.candidate.pieces[1].points,before.pieces[1].points)
 assert.deepEqual(result.candidate.pieces[1].edgeNames,before.pieces[1].edgeNames)
 assert.deepEqual(result.candidate.pieces[0],before.pieces[0])
 assert.deepEqual(input,before)
 assert.deepEqual(trueCurve(input,{...request}).candidate,result.candidate)
})
test('ease target is achieved by quadratic arc length and negative target adjustment',()=>{
 const input=fixture(),easeCm=-0.08
 const result=trueCurve(input,{...request,easeCm})
 assert.ok(Math.abs(result.measuredEaseCm-easeCm)<1e-6)
 assert.ok(result.targetLengthCm<result.previousTargetLengthCm||result.targetLengthCm>0)
})
test('refuses stale revisions, attachments, unsupported asymmetric controls and invalid tangents',()=>{
 assert.throws(()=>trueCurve(fixture(),{...request,expectedRevision:6}),/STALE_REVISION/)
 const graded=fixture();graded.grading={sizes:['M']}
 assert.throws(()=>trueCurve(graded,request),/PROJECT_ATTACHMENTS/)
 const sewn=fixture();sewn.seams=[]
 assert.throws(()=>trueCurve(sewn,request),/PROJECT_ATTACHMENTS/)
 const marked=fixture();marked.pieces[1].notches=[{edgeIndex:0,t:0.5}]
 assert.throws(()=>trueCurve(marked,request),/UNSUPPORTED_PIECE_ATTACHMENT/)
 const asymmetric=fixture();asymmetric.pieces[1].curves[0].cx+=0.2
 assert.throws(()=>trueCurve(asymmetric,request),/ASYMMETRIC_CONTROL/)
 assert.throws(()=>trueCurve(fixture(),{...request,maxTangentDriftDeg:0}),/TANGENT_DRIFT/)
 const narrow=fixture();narrow.pieces[1].curves[0].cy=-0.03
 assert.throws(()=>trueCurve(narrow,request),/TANGENT_DRIFT|BULGE_RANGE/)
})
test('self intersections and poison accessors fail atomically',()=>{
 const intersected=fixture()
 intersected.pieces[1].curves[0].cy=18
 assert.throws(()=>trueCurve(intersected,request),/SELF_INTERSECTION|BULGE_RANGE/)
 const input=fixture()
 Object.defineProperty(input.pieces[1].curves[0],'cy',{get(){throw Error('executed accessor')},enumerable:true})
 assert.throws(()=>trueCurve(input,request),/UNSAFE_ACCESSOR/)
})
