import test from 'node:test'
import assert from 'node:assert/strict'
import {gradePiece, gradeProject} from './grading.js'
import {gradeConstructionAttachments} from './gradedConstructionAttachments.js'
import {createTemplateProject} from '../data/templates.js'
import {edgePointAt} from './project.js'

const sizes=['XS','S','M','L','XL','XXL']
const grading={sizes,baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:0.5}
const rule=(dx,dy)=>({mode:'small-large-incremental',sizes,baseSize:'M',steps:Array.from({length:5},()=>({dx,dy}))})
const fixture=()=>({
 id:'front',points:[
  {id:'a',x:0,y:0,industrialGradeRule:rule(-.3,-.2)},
  {id:'b',x:20,y:0,industrialGradeRule:rule(.3,-.2)},
  {id:'c',x:20,y:20,industrialGradeRule:rule(.3,.2)},
  {id:'d',x:0,y:20,industrialGradeRule:rule(-.3,.2)},
 ],
 curves:{0:{cx:10,cy:-3}},
 notches:[{id:'N1',type:'single',edgeIndex:0,t:.2,depthCm:.45}],
 internalLines:[
  {id:'fold',type:'fold',a:{x:0,y:10},b:{x:20,y:10},aAnchor:{edgeIndex:3,t:.5},bAnchor:{edgeIndex:1,t:.5}},
  {id:'dart',type:'dart',a:{x:10,y:8},b:{x:10,y:15},widthCm:2},
 ],
})

test('all graded sizes retain notch edge and fraction, anchored fold line endpoints, and point identity',()=>{
 const source=fixture(), preserved=structuredClone(source)
 for(const size of sizes){
  const p=gradePiece(source,grading,size)
  assert.deepEqual(p.points.map(x=>x.id),preserved.points.map(x=>x.id))
  assert.deepEqual(p.notches.map(n=>({id:n.id,edgeIndex:n.edgeIndex,t:n.t})),[{id:'N1',edgeIndex:0,t:.2}])
  const fold=p.internalLines[0]
  const onEdge=(a,b,mark)=>Math.abs(mark.x-(a.x+b.x)/2)<1e-9&&Math.abs(mark.y-(a.y+b.y)/2)<1e-9
  assert(onEdge(p.points[3],p.points[0],fold.a),size+' fold start lost edge attachment')
  assert(onEdge(p.points[1],p.points[2],fold.b),size+' fold end lost edge attachment')
  assert(p.internalLines[1].a.x>p.points[0].x&&p.internalLines[1].a.x<p.points[1].x)
  assert(Number.isFinite(p.curves[0].cx)&&Number.isFinite(p.curves[0].cy))
  assert.notStrictEqual(p.notches[0],source.notches[0])
  assert.notStrictEqual(p.internalLines[0],source.internalLines[0])
 }
 assert.deepEqual(source,preserved,'grading cannot mutate source')
})

test('zero/base size anchored markings stay exactly stable and save/reopen is deterministic',()=>{
 const piece=fixture(),project={pieces:[piece],seams:[],grading}
 const result=gradeProject(project,'M')
 assert.deepEqual(result.pieces[0].internalLines.map(l=>[l.a,l.b]),piece.internalLines.map(l=>[l.a,l.b]))
 assert.deepEqual(result.pieces[0].notches,piece.notches)
 const reopened=JSON.parse(JSON.stringify(project))
 assert.deepEqual(gradeProject(reopened,'XXL'),gradeProject(project,'XXL'))
})

test('construction POM anchors re-evaluate on graded piece vertices rather than unrelated automatic size scaling',()=>{
  const piece=fixture(),project={id:'measurement-test',pieces:[piece],seams:[],grading,
    customMeasurements:[{id:'graded-width',pieceId:'front',a:{x:0,y:0},b:{x:20,y:0},aAnchor:{vertexIndex:0},bAnchor:{vertexIndex:1},toleranceCm:.2}]}
  const graded=gradeProject(project,'XL')
  const row=graded.customMeasurements[0]
  assert.deepEqual({x:row.a.x,y:row.a.y},{x:graded.pieces[0].points[0].x,y:graded.pieces[0].points[0].y})
  assert.deepEqual({x:row.b.x,y:row.b.y},{x:graded.pieces[0].points[1].x,y:graded.pieces[0].points[1].y})
  assert.notEqual(row.b.x-row.a.x,20)
  assert.deepEqual(project.customMeasurements[0].a,{x:0,y:0})
})

test('an internal mark anchored to a quadratic edge follows its actual curved control',()=>{
 const source=fixture()
 source.internalLines[0].aAnchor={edgeIndex:0,t:.5}
 source.internalLines[0].a={x:10,y:-1.5}
 const graded=gradePiece(source,grading,'L')
  const quadraticMid=edgePointAt(graded,0,.5,64).point
 assert(Math.hypot(quadraticMid.x-graded.internalLines[0].a.x,quadraticMid.y-graded.internalLines[0].a.y)<1e-10)
})

test('malformed notch and invalid edge anchors fail closed without changing input',()=>{
 const source=fixture(),copy=structuredClone(source)
 source.notches[0].edgeIndex=99
 assert.throws(()=>gradePiece(source,grading,'L'),/notch/i)
 assert.deepEqual(source.internalLines,copy.internalLines)
 const invalid=fixture();invalid.internalLines[0].bAnchor.t=1.3
 assert.throws(()=>gradePiece(invalid,grading,'L'),/anchor/i)
})

test('current ten-piece hoodie remains gradeable with internal fold markings and notches',()=>{
 const hoodie=createTemplateProject('hoodie')
 for(const size of hoodie.grading.sizes){
  const graded=gradeProject(hoodie,size)
  assert.equal(graded.pieces.length,hoodie.pieces.length)
  for(const piece of graded.pieces){
   assert(piece.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
   for(const n of piece.notches||[])assert.equal(n.edgeIndex>=0&&n.edgeIndex<piece.points.length,true)
  }
 }
})
