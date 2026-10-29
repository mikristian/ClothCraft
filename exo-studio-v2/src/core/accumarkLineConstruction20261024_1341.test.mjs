import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkLineConstruction as apply,measureAccuMarkLineDistance as measure} from './accumarkLineConstruction20261024_1341.js'

const fixture=()=>({revision:2,pieces:[{id:'panel',points:[{x:0,y:0},{x:30,y:0},{x:30,y:25},{x:0,y:25}],curves:{0:{cx:15,cy:-3}},notches:[{edgeIndex:0,t:.2}],seamAllowance:1,internalLines:[]}],seams:[{a:{pieceId:'panel',edgeIndex:1},b:{pieceId:'other',edgeIndex:0}}]})
const run=(p,kind,rest,id='line-1')=>apply(p,{pieceId:'panel',kind,lineId:id,...rest})
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
test('two-point creates measured noncutting line and preserves original and attachments',()=>{
 const p=fixture(),before=JSON.stringify(p),r=run(p,'line.twoPoint',{a:{x:1,y:2},b:{x:4,y:6}})
 near(r.validation.lengthCm,5);assert.equal(r.line.type,'construction');assert.equal(JSON.stringify(p),before)
 assert.deepEqual(r.project.pieces[0].points,p.pieces[0].points)
 assert.deepEqual(r.project.pieces[0].curves,p.pieces[0].curves)
 assert.deepEqual(r.project.pieces[0].notches,p.pieces[0].notches)
 assert.deepEqual(r.project.seams,p.seams);assert.equal(r.project.revision,3)
 assert.equal(r.validation.manufacturingApproved,false)
})
test('parallel and offset retain direction, length and signed normal displacement',()=>{
 const p=fixture(),base={a:{x:1,y:1},b:{x:7,y:9}}
 for(const [kind,key,value] of [['line.parallel','distanceCm',3],['line.offset','offsetCm',-4]]){
  const r=run(p,kind,{...base,[key]:value})
  const u={x:6/10,y:8/10},d=r.line
  near((d.a.x-base.a.x)*u.x+(d.a.y-base.a.y)*u.y,0)
  near((d.a.x-base.a.x)*(-u.y)+(d.a.y-base.a.y)*u.x,value)
  near((d.b.x-d.a.x)*u.y-(d.b.y-d.a.y)*u.x,0)
  near(r.validation.lengthCm,10)
 }
})
test('perpendicular at fraction produces exact orthogonality and specified length',()=>{
 const r=run(fixture(),'line.perpendicular',{a:{x:2,y:2},b:{x:12,y:2},atFraction:.25,lengthCm:7})
 assert.deepEqual(r.line.a,{x:4.5,y:2});near(r.line.b.x,4.5);near(r.line.b.y,9);near(r.validation.lengthCm,7)
})
test('setLength uses referenced safe line and returns prescribed endpoint',()=>{
 const r1=run(fixture(),'line.twoPoint',{a:{x:0,y:0},b:{x:3,y:4}},'original')
 const r2=run(r1.project,'line.setLength',{referenceLineId:'original',lengthCm:25},'lengthened')
 assert.deepEqual(r2.line.a,{x:0,y:0});near(r2.line.b.x,15);near(r2.line.b.y,20)
 const m=measure(r2.project,{pieceId:'panel',referenceLineId:'lengthened'});near(m.lengthCm,25)
})
test('read-only measurement works for coordinates and rejects zero distance',()=>{
 const p=fixture(),before=JSON.stringify(p)
 near(run(p,'line.measureDistance',{a:{x:0,y:0},b:{x:5,y:12}}).measurement.lengthCm,13)
 assert.equal(JSON.stringify(p),before)
 assert.throws(()=>measure(p,{pieceId:'panel',a:{x:1,y:1},b:{x:1,y:1}}),/INVALID_REFERENCE_LENGTH_CM/)
})
test('invalid source references, unsafe attachments and finite bounds fail closed',()=>{
 const p=fixture();p.pieces[0].internalLines=[{id:'sewn',a:{x:0,y:0},b:{x:4,y:0},aAnchor:{edgeIndex:0,t:0}}]
 assert.throws(()=>run(p,'line.parallel',{referenceLineId:'sewn',distanceCm:1}),/UNSUPPORTED_SOURCE_ATTACHMENT/)
 assert.throws(()=>run(p,'line.twoPoint',{a:{x:0,y:0},b:{x:Infinity,y:0}}),/UNSAFE_INPUT_VALUE/)
 assert.throws(()=>run(p,'line.twoPoint',{a:{x:0,y:0},b:{x:0,y:0}}),/INVALID_RESULT_LENGTH_CM/)
 assert.throws(()=>run(p,'line.perpendicular',{a:{x:0,y:0},b:{x:1,y:0},lengthCm:2,atFraction:2}),/INVALID_REFERENCE_FRACTION/)
 assert.throws(()=>run(p,'line.offset',{a:{x:0,y:0},b:{x:1,y:0},offsetCm:1e7}),/INVALID_OFFSET_CM/)
 assert.throws(()=>run(p,'line.twoPoint',{a:{x:0,y:0},b:{x:1,y:0}},'sewn'),/DUPLICATE_LINE_ID/)
})
test('accessor preflight rejects project, nested point and spec without executing getters or mutation',()=>{
 let calls=0
 for(const change of [
  (p,s)=>Object.defineProperty(p,'pieces',{get(){calls++;throw Error('GETTER_EXECUTED')}}),
  (p,s)=>Object.defineProperty(p.pieces[0].points[1],'x',{get(){calls++;throw Error('GETTER_EXECUTED')}}),
  (p,s)=>Object.defineProperty(s.a,'x',{get(){calls++;throw Error('GETTER_EXECUTED')}}),
 ]){
  const p=fixture(),s={pieceId:'panel',kind:'line.twoPoint',lineId:'safe',a:{x:1,y:2},b:{x:3,y:4}}
  const original=structuredClone(p);change(p,s)
  assert.throws(()=>apply(p,s),/UNSAFE_INPUT_ACCESSOR/)
  assert.equal(calls,0)
  assert.equal(Object.getOwnPropertyDescriptor(p,'revision').value,original.revision)
  assert.equal(p.revision,2)
 }
})
test('cycles and oversized input reject before any mutation',()=>{
 const p=fixture(),s={pieceId:'panel',kind:'line.twoPoint',lineId:'test',a:{x:1,y:1},b:{x:3,y:2}}
 p.metadata={self:p}
 assert.throws(()=>apply(p,s),/SOURCE_COMPLEXITY_BUDGET/)
 assert.equal(p.revision,2);assert.deepEqual(p.pieces[0].internalLines,[])
 const large=fixture();large.pieces[0].points=Array.from({length:4097},(_,i)=>({x:i,y:0}))
 assert.throws(()=>apply(large,s),/SOURCE_COMPLEXITY_BUDGET/)
 assert.equal(large.revision,2)
})
