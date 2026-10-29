import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialGradedDrillHoleWitness20261028 as inspect} from './industrialGradedDrillHoleWitness20261028.mjs'
import {projectToDxf} from './dxf.js'

const source=()=>({
 grading:{sizes:Array.from({length:24},(_,i)=>`SIZE${i+1}`),baseSize:'SIZE12',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[
  {id:'front',points:[{x:0,y:0},{x:20,y:0},{x:20,y:15},{x:0,y:15}],
   seamAllowance:0,drills:[{id:'hole-A',x:4,y:4,anchor:{vertexIndex:0}}],
   holes:[{id:'eyelet',vertices:[
    {id:'a',x:4,y:4,anchor:{vertexIndex:0}},
    {id:'b',x:5,y:4,anchor:{vertexIndex:0}},
    {id:'c',x:4,y:5,anchor:{vertexIndex:0}},
   ]}]},
  {id:'back',points:[{x:30,y:0},{x:50,y:0},{x:50,y:15},{x:30,y:15}],seamAllowance:0},
 ],seams:[{id:'top',a:{pieceId:'front',edgeIndex:0},b:{pieceId:'back',edgeIndex:0}}],
})
test('24 named-size source preserves explicitly anchored drill and hole topology with seam-length checks',()=>{
 const p=source(),before=structuredClone(p),result=inspect(p)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizes.length,24)
 assert.equal(result.drillCount,24)
 assert.equal(result.holeCount,24)
 assert(result.sizes.every(s=>s.seams.length===1&&s.seams[0].mismatchCm<=.05))
 assert.equal(result.featureExportVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual(p,before)
})
test('missing drill anchors and unknown feature semantics refuse rather than copying marks',()=>{
 for(const mutate of [
  p=>{delete p.pieces[0].drills[0].anchor},
  p=>{p.pieces[0].drills[0].anchor={vertexIndex:99}},
  p=>{p.pieces[0].cutHoles=[{x:1,y:2}]},
  p=>{p.pieces[0].holes[0].vertices[0].anchor={edgeIndex:99,t:.5}},
 ]){
  const p=source();mutate(p)
  const result=inspect(p)
  assert.equal(result.ok,false,JSON.stringify(result))
  assert.equal(result.cuttingAuthorized,false)
 }
})
test('actual graded seam mismatch fails closed without manufacturing release',()=>{
 const p=source();p.pieces[1].points[1].x=56
 const result=inspect(p)
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='GRADED_FEATURE_VERIFICATION_REFUSED'))
 assert.deepEqual(result.sizes,[])
})
test('generic manufacturing DXF cannot silently strip physical drills or cut holes',()=>{
 const p=source()
 assert.throws(()=>projectToDxf(p,'SIZE12',{cutlineMode:'manufacturing'}),/MANUFACTURING_FEATURE_EXPORT_UNVERIFIED/)
 delete p.pieces[0].holes
 assert.throws(()=>projectToDxf(p,'SIZE12',{cutlineMode:'manufacturing'}),/MANUFACTURING_FEATURE_EXPORT_UNVERIFIED/)
})
