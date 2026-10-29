import test from 'node:test'
import assert from 'node:assert/strict'
import {previewModarisSeamTrueing20261027 as trueSeam} from './modarisSeamTrueing20261027.js'
const rect=(id,w)=>({id,name:id,points:[{x:0,y:0},{x:w,y:0},{x:w,y:4},{x:0,y:4}],edgeNames:['top','right','bottom','left'],fabricId:'cotton'})
const project=()=>({revision:3,units:'cm',pieces:[rect('source',12),rect('target',10)],notes:'intact'})
const options={source:{pieceId:'source',edgeIndex:0},target:{pieceId:'target',edgeIndex:0},expectedRevision:3}
test('trueing corrects real target seam and adjacent edge, preserves metadata and input',()=>{
 const initial=project(),snapshot=structuredClone(initial)
 const result=trueSeam(initial,options)
 assert.deepEqual(initial,snapshot)
 assert.equal(result.sourceLengthCm,12)
 assert.equal(result.previousTargetLengthCm,10)
 assert.equal(result.targetLengthCm,12)
 assert.equal(result.candidateRevision,4)
 assert.equal(result.candidate.pieces[1].points[1].x,12)
 assert.deepEqual(result.candidate.pieces[1].edgeNames,snapshot.pieces[1].edgeNames)
 assert.equal(result.candidate.notes,'intact')
 assert.equal(result.manufacturingApproved,false)
})
test('closed seam length and near-zero discrepancy remain deterministic',()=>{
 const initial=project()
 const closed=trueSeam(initial,{...options,easeCm:-2})
 assert.equal(closed.changed,false)
 assert.equal(closed.candidateRevision,3)
 const tiny=trueSeam(initial,{...options,easeCm:-2+1e-10})
 assert.equal(tiny.changed,false)
 assert.equal(tiny.candidate.pieces[1].points[1].x,10)
 const ease=trueSeam(initial,{...options,easeCm:.75})
 assert(Math.abs(ease.measuredEaseCm-.75)<1e-10)
})
test('reject malformed refs, stale revision, attachments and units',()=>{
 const base=project()
 assert.throws(()=>trueSeam(base,{...options,expectedRevision:2}),/stale/)
 assert.throws(()=>trueSeam(base,{...options,target:{pieceId:'source',edgeIndex:1}}),/separate/)
 assert.throws(()=>trueSeam(base,{...options,target:{pieceId:'target',edgeIndex:44}}),/missing edge/)
 assert.throws(()=>trueSeam({...base,units:'mm'},options),/centimeter/)
 assert.throws(()=>trueSeam({...base,seams:[]},options),/unsupported/)
 assert.throws(()=>trueSeam({...base,grading:{}},options),/unsupported/)
 const curved=structuredClone(base);curved.pieces[1].curves={0:{cx:5,cy:-2}}
 assert.throws(()=>trueSeam(curved,options),/attachments/)
 const marked=structuredClone(base);marked.pieces[1].points[1].notch=true
 assert.throws(()=>trueSeam(marked,options),/marks/)
})
test('reject collapsed and self-intersecting target geometry without mutation',()=>{
 const base=project(),original=structuredClone(base)
 const bad=structuredClone(base);bad.pieces[1].points[2]={x:0,y:-1}
 assert.throws(()=>trueSeam(bad,options))
 const near=structuredClone(base);near.pieces[1].points[1].x=1e-9
 assert.throws(()=>trueSeam(near,options),/zero length/)
 assert.deepEqual(base,original)
})
