import test from 'node:test'
import assert from 'node:assert/strict'
import {splitGradedStraightEdge20261024 as split} from './gradedStraightEdgeSplit20261024_1453.js'
import {gradeProject} from './grading.js'

const sizes=['S','M','L','XL']
const rule=(a,b,c)=>({mode:'small-large-incremental',sizes,baseSize:'M',steps:[{dx:a,dy:0},{dx:b,dy:0},{dx:c,dy:0}]})
const fixture=()=>({
  revision:7,
  grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'front',points:[
    {id:'a',x:0,y:0,industrialGradeRule:rule(-2,3,5)},
    {id:'b',x:12,y:0,industrialGradeRule:rule(2,-3,-5)},
    {id:'c',x:12,y:10,industrialGradeRule:rule(2,-3,-5)},
    {id:'d',x:0,y:10,industrialGradeRule:rule(-2,3,5)}
  ]}]
})
const call=(p,options={})=>split(p,{pieceId:'front',edgeIndex:0,fraction:0.25,...options})

test('unequal industrial grade breaks preserve split location for all four sizes',()=>{
  const source=fixture(),original=structuredClone(source)
  const out=call(source)
  for(const size of sizes){
    const before=gradeProject(original,size).pieces[0].points
    const after=gradeProject(out.project,size).pieces[0].points
    assert.ok(Math.abs(after[1].x-(before[0].x*.75+before[1].x*.25))<1e-8)
    assert.ok(Math.abs(after[1].y-(before[0].y*.75+before[1].y*.25))<1e-8)
    assert.deepEqual(after.filter((_,i)=>i!==1).map(p=>({x:p.x,y:p.y})),before.map(p=>({x:p.x,y:p.y})))
  }
  assert.deepEqual(source,original)
  assert.equal(out.validation.manufacturingApproved,false)
  assert.equal(out.project.revision,7)
})
test('closing edge split indexes after last vertex and preserves ids',()=>{
 const out=call(fixture(),{edgeIndex:3,fraction:.5})
 assert.equal(out.detail.insertedIndex,4)
 assert.deepEqual(out.project.pieces[0].points.map(p=>p.id).slice(0,4),['a','b','c','d'])
 assert.match(out.project.pieces[0].points[4].id,/^front:split:3:/)
})
test('inserted vertex ID is deterministic and collision-safe',()=>{
 const original=fixture()
 const first=call(original).detail.vertex.id
 assert.equal(call(original).detail.vertex.id,first)
 original.pieces[0].points[3].id=first
 const second=call(original).detail.vertex.id
 assert.equal(second,first+':1')
 assert.equal(new Set(call(original).project.pieces[0].points.map(p=>p.id)).size,5)
})
test('rejects mixed automatic, legacy, or industrial grade rule vertices',()=>{
 for(const mutate of [
  p=>{delete p.pieces[0].points[1].industrialGradeRule},
  p=>{delete p.pieces[0].points[2].industrialGradeRule;p.pieces[0].points[2].gradeRule={enabled:true,dxPerSize:1,dyPerSize:0}},
 ]) {
  const p=fixture();mutate(p)
  assert.throws(()=>call(p),/MIXED_GRADE_RULES/)
 }
})
test('blocks opaque metadata at project, piece, grading and point levels',()=>{
 for(const mutate of [
  p=>{p.customState={vertexIndex:1}},
  p=>{p.seams=[]},
  p=>{p.pieces[0].metadata={edgeIndex:0}},
  p=>{p.pieces[0].grainAngle=0},
  p=>{p.grading.namedRules={rule:1}},
  p=>{p.pieces[0].points[0].metadata={vertexIndex:1}},
  p=>{p.pieces[0].points[0].industrialGradeRule.holeReference=0},
 ]) {
  const p=fixture();mutate(p)
  assert.throws(()=>call(p),/ATTACHMENT/)
 }
})
test('blocks opaque attachments on other pieces as well as selected piece',()=>{
 const p=fixture()
 p.pieces.push({id:'back',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],notches:[]})
 assert.throws(()=>call(p),/UNSUPPORTED_PIECE_ATTACHMENT/)
})
test('rejects grade sizes mismatch before committing',()=>{
 const p=fixture();p.grading.sizes=['S','M','L']
 assert.throws(()=>call(p),/GRADE_EVALUATION_FAILED/)
})
test('rejects attached notches, curves and construction elements',()=>{
 for(const payload of [{curves:{0:{cx:3,cy:-2}}},{notches:[{edgeIndex:0,t:.5}]},{internalLines:[]},{edgeSeamAllowances:{0:1}}]){
  const p=fixture();Object.assign(p.pieces[0],payload)
  assert.throws(()=>call(p),/UNSUPPORTED_PIECE_ATTACHMENT/)
 }
})
test('rejects project seam references, even when target contour is otherwise valid',()=>{
 const p=fixture();p.seams=[{id:'pair'}]
 assert.throws(()=>call(p),/PROJECT_GEOMETRY_ATTACHMENT/)
})
test('rejects out of range, noninteger and boundary fractions',()=>{
 for(const fraction of [0,1,.0499,.951,NaN,Infinity,'0.5'])
 assert.throws(()=>call(fixture(),{fraction}),/SPLIT_FRACTION|NONFINITE_SOURCE/)
 for(const edgeIndex of [-1,4,1.2,NaN])assert.throws(()=>call(fixture(),{edgeIndex}),/EDGE_INDEX|NONFINITE_SOURCE/)
})
test('rejects crossing size contour before split',()=>{
 const p=fixture();p.pieces[0].points[2].x=-20
 assert.throws(()=>call(p),/INVALID_CONTOUR|GRADE/)
})
test('rejects hidden own metadata without silently stripping it',()=>{
 const p=fixture()
 Object.defineProperty(p.pieces[0].points[0],'secret',{value:'protected',enumerable:false})
 assert.throws(()=>call(p),/ACCESSOR_OR_HIDDEN_SOURCE/)
})
test('rejects accessor getters without executing',()=>{
 const p=fixture()
 let count=0
 Object.defineProperty(p.pieces[0].points[0],'x',{get(){count++;return 0},enumerable:true})
 assert.throws(()=>call(p),/ACCESSOR_OR_HIDDEN_SOURCE/)
 assert.equal(count,0)
})
test('legacy automatic grading either has exact size parity or fails closed',()=>{
 const p={grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},
 pieces:[{id:'front',points:[{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10}]}]}
 try {
  const out=split(p,{pieceId:'front',edgeIndex:0,fraction:.5})
  assert.equal(out.validation.sizes.length,3)
 }catch(error){assert.match(error.message,/GRADED_INSERTION_DRIFT|EXISTING_GRADE_VERTEX_DRIFT/)}
})
