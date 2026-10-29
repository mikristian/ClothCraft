import test from 'node:test'
import assert from 'node:assert/strict'
import {splitAttachedGradedCurve20261024 as split} from './advancedAttachedCadEdit20261024_1516.js'
import {edgePointAt} from './project.js'
import {gradeProject} from './grading.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=()=>({mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',steps:Array.from({length:5},()=>({dx:0,dy:0}))})
const fixture=()=>({id:'draft',revision:4,grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
  {id:'body',points:[{id:'a',x:0,y:0,industrialGradeRule:rule()},{id:'b',x:12,y:0,industrialGradeRule:rule()},{id:'c',x:12,y:10,industrialGradeRule:rule()},{id:'d',x:0,y:10,industrialGradeRule:rule()}],curves:{0:{cx:6,cy:-2}}}
]})
const call=(p,options={})=>split(p,{pieceId:'body',edgeIndex:0,fraction:0.5,...options})

test('splits actual quadratic into two exact segments for every one of six sizes',()=>{
 const source=fixture(),prior=structuredClone(source),out=call(source)
 assert.deepEqual(source,prior)
 assert.equal(out.validation.sizes.length,6)
 assert.equal(out.validation.manufacturingApproved,false)
 assert.equal(out.project.revision,4)
 for(const size of sizes){
  const old=gradeProject(source,size).pieces[0],cur=gradeProject(out.project,size).pieces[0]
  assert.equal(cur.points.length,5)
  assert.equal(cur.points[1].id,out.detail.vertexId)
  for(let n=0;n<=24;n++){
   const t=n/24
   // symmetric arch has its half-length at Bézier parameter .5
   const originalPoint={x:(1-t)**2*0+2*(1-t)*t*6+t*t*12,y:2*(1-t)*t*-2}
   const selected=t<=.5?{a:cur.points[0],c:cur.curves[0],b:cur.points[1],t:t*2}:{a:cur.points[1],c:cur.curves[1],b:cur.points[2],t:2*t-1}
   const u=1-selected.t,c=selected.c
   const point={x:u*u*selected.a.x+2*u*selected.t*c.cx+selected.t**2*selected.b.x,y:u*u*selected.a.y+2*u*selected.t*c.cy+selected.t**2*selected.b.y}
   assert.ok(Math.hypot(point.x-originalPoint.x,point.y-originalPoint.y)<1e-5)
  }
 }
})
test('reindexes unmodified curve edges and closing edge safely',()=>{
 const p=fixture();p.pieces[0].curves[2]={cx:6,cy:12}
 const out=call(p);assert.deepEqual(out.project.pieces[0].curves[3],{cx:6,cy:12})
 const closing=call(p,{edgeIndex:2,fraction:.5});assert.ok(Math.abs(closing.project.pieces[0].curves[2].cx-9)<1e-8)
})
test('preserves attached notch after indexed unmodified edge',()=>{
 const p=fixture();p.pieces[0].notches=[{id:'n',edgeIndex:1,t:.5,x:12,y:5}]
 const out=call(p).project.pieces[0];assert.equal(out.notches[0].edgeIndex,2);assert.equal(out.notches[0].y,5)
})
test('preserves on-curve authored notch physical station',()=>{
 const p=fixture(),position=edgePointAt(p.pieces[0],0,.25).point
 p.pieces[0].notches=[{id:'n',edgeIndex:0,t:.25,x:position.x,y:position.y}]
 const out=call(p).project.pieces[0]
 assert.equal(out.notches[0].edgeIndex,0)
 assert.ok(Math.hypot(out.notches[0].x-position.x,out.notches[0].y-position.y)<1e-4)
})
test('moves midpoint notch to inserted vertex anchor when mathematically exact',()=>{
 const p=fixture(),point=edgePointAt(p.pieces[0],0,.5).point
 p.pieces[0].notches=[{id:'n',edgeIndex:0,t:.5,x:point.x,y:point.y}]
 const result=call(p).project.pieces[0]
 assert.equal(result.notches[0].edgeIndex,0)
 assert.ok(Math.hypot(result.notches[0].x-point.x,result.notches[0].y-point.y)<1e-4)
})
test('preserves line endpoints attached to edges and indexed vertices',()=>{
 const p=fixture(),q=p.pieces[0],position=edgePointAt(q,0,.25).point
 q.internalLines=[{id:'fold',type:'fold',a:position,b:{x:12,y:10},aAnchor:{edgeIndex:0,t:.25},bAnchor:{vertexIndex:2}}]
 const result=call(p).project.pieces[0]
 assert.equal(result.internalLines[0].bAnchor.vertexIndex,3)
 assert.ok(Math.hypot(result.internalLines[0].a.x-position.x,result.internalLines[0].a.y-position.y)<1e-4)
})
test('rejects stale notch coordinates and stale anchored construction points',()=>{
 const p=fixture();p.pieces[0].notches=[{id:'n',edgeIndex:0,t:.5,x:999,y:999}]
 assert.throws(()=>call(p),/STALE_NOTCH_COORDINATES/)
 delete p.pieces[0].notches;p.pieces[0].internalLines=[{id:'x',a:{x:9,y:9},b:{x:12,y:10},aAnchor:{edgeIndex:0,t:.5},bAnchor:{vertexIndex:2}}]
 assert.throws(()=>call(p),/STALE_LINE_ANCHOR/)
})
test('blocks all unknown project, point, curve and attachment metadata',()=>{
 for(const mutate of [p=>p.other={edgeIndex:0},p=>p.pieces[0].points[0].seamId='a',p=>p.pieces[0].curves[0].metadata={x:1},p=>p.pieces[0].notches=[{id:'n',edgeIndex:0,t:.2,other:1}]]){
  const p=fixture();mutate(p);assert.throws(()=>call(p),/UNSUPPORTED/)
 }
})
test('rejects opaque references in every nested industrial grade rule without changing source',()=>{
 for(const mutate of [
  rule=>{rule.opaqueReference={edgeIndex:0}},
  rule=>{rule.steps[0].opaqueReference={edgeIndex:0}},
  rule=>{rule.steps[0].seamId='old-seam'},
  rule=>{rule.down=[{dx:0,dy:0}]},
 ]){
  const p=fixture(),before=structuredClone(p)
  mutate(p.pieces[0].points[0].industrialGradeRule)
  const withMetadata=structuredClone(p)
  assert.throws(()=>call(p),/UNSUPPORTED_GRADE_RULE_METADATA/)
  assert.deepEqual(p,withMetadata)
  assert.deepEqual(before.pieces[0].points[1],p.pieces[0].points[1])
 }
})
test('rejects unknown nested metadata in supported cumulative grade rules',()=>{
 const p=fixture()
 const r=p.pieces[0].points[0].industrialGradeRule
 r.mode='base-up-down-cumulative';delete r.steps
 r.down=[{dx:0,dy:0},{dx:0,dy:0}];r.up=[{dx:0,dy:0},{dx:0,dy:0},{dx:0,dy:0}]
 assert.doesNotThrow(()=>call(p))
 r.up[1].edgeIndex=0
 assert.throws(()=>call(p),/UNSUPPORTED_GRADE_RULE_METADATA/)
})
test('rejects accessor getter without invoking it',()=>{
 const p=fixture();let hit=0
 Object.defineProperty(p.pieces[0].points[0],'x',{get(){hit++;return 0},enumerable:true})
 assert.throws(()=>call(p),/UNSAFE_DESCRIPTOR/);assert.equal(hit,0)
})
test('rejects hidden fields, sparse arrays, and invalid prototype',()=>{
 const a=fixture();Object.defineProperty(a.pieces[0],'secret',{value:1});assert.throws(()=>call(a),/UNSAFE_DESCRIPTOR/)
 const b=fixture();delete b.pieces[0].points[1];assert.throws(()=>call(b),/SPARSE_ARRAY/)
 const c=fixture();Object.setPrototypeOf(c.pieces[0].curves[0],{extra:true});assert.throws(()=>call(c),/UNSAFE_PROTOTYPE/)
})
test('rejects malformed edge/grade and unsupported industrial rule',()=>{
 for(const bad of [0,1,NaN,'0.5'])assert.throws(()=>call(fixture(),{fraction:bad}),/INVALID_FRACTION|NONFINITE_SOURCE/)
 const a=fixture();delete a.pieces[0].curves[0];assert.throws(()=>call(a),/CURVE_EDGE_REQUIRED/)
 const b=fixture();b.pieces[0].points[0].industrialGradeRule.sizes=['S','M'];assert.throws(()=>call(b),/INVALID_GRADE_RULE|GRADE_SIZE_MISMATCH/)
})
test('fails closed on an unsupported seam graph and preserves original',()=>{
 const p=fixture(),original=structuredClone(p);p.seams=[{a:{pieceId:'body',edgeIndex:0}}]
 assert.throws(()=>call(p),/UNSUPPORTED_PROJECT_METADATA/)
 assert.deepEqual(p.pieces,original.pieces)
})
