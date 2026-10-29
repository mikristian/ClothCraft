import test from 'node:test'
import assert from 'node:assert/strict'
import { makeRectanglePiece } from './project.js'
import { gradeProject } from './grading.js'
import { applyAccuMarkPieceRigidAction20261024_1341 as act } from './accumarkPieceRigidActions20261024_1341.js'

function setup(){const piece=makeRectanglePiece(0);piece.id='front';return {pieces:[piece],seams:[],grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}}}
const area=p=>Math.abs(p.reduce((s,v,i)=>{const q=p[(i+1)%p.length];return s+v.x*q.y-q.x*v.y},0)/2)
const signed=p=>p.reduce((s,v,i)=>{const q=p[(i+1)%p.length];return s+v.x*q.y-q.x*v.y},0)/2
const invoke=(p,action,rest={})=>act(p,{pieceId:'front',action,...rest})

test('MOVE changes source CUT coordinates in centimeters and gradeProject preserves graded translation',()=>{
 const p=setup(),before=structuredClone(p), out=invoke(p,'MOVE',{dxCm:12.5,dyCm:-8})
 assert.deepEqual(p,before)
 assert.deepEqual(out.piece.points,p.pieces[0].points.map(q=>({x:q.x+12.5,y:q.y-8})))
 assert.equal(out.project.revision,1)
 assert.deepEqual(gradeProject(out.project,'S').pieces[0].points,out.piece.points)
 const undone=invoke(out.project,'MOVE',{dxCm:-12.5,dyCm:8})
 assert.deepEqual(undone.piece.points,p.pieces[0].points)
})
test('ROTATE is real contour rotation preserving signed cut winding and area',()=>{
 const p=setup(),r=invoke(p,'ROTATE',{angleDeg:90})
 assert.ok(Math.abs(r.piece.points[0].x-18)<1e-8)
 assert.ok(Math.abs(r.piece.points[0].y-0)<1e-8)
 assert.equal(area(r.piece.points),area(p.pieces[0].points))
 assert.ok(signed(r.piece.points)>0)
 assert.deepEqual(gradeProject(r.project,'S').pieces[0].points,r.piece.points)
 const undone=invoke(r.project,'ROTATE',{angleDeg:-90})
 undone.piece.points.forEach((q,i)=>{assert.ok(Math.hypot(q.x-p.pieces[0].points[i].x,q.y-p.pieces[0].points[i].y)<1e-8)})
})
test('MIRROR restores CUT winding, area and includes seam-label limitation warning',()=>{
 const p=setup(),r=invoke(p,'MIRROR',{axis:'vertical'})
 assert.ok(signed(r.piece.points)>0)
 assert.equal(area(r.piece.points),area(p.pieces[0].points))
 assert.match(r.warnings.join(' '),/seam labels/i)
 assert.deepEqual(gradeProject(r.project,'M').pieces[0].points,r.piece.points)
 assert.notDeepEqual(r.piece.points,p.pieces[0].points)
})
test('COPY adds controlled stable ID, preserving original and metadata',()=>{
 const p=setup(),r=invoke(p,'COPY',{copyId:'front-copy',copyName:'Front duplicate'})
 assert.equal(r.project.pieces.length,2)
 assert.deepEqual(r.project.pieces[0],p.pieces[0])
 assert.equal(r.piece.id,'front-copy')
 assert.deepEqual(r.piece.points,p.pieces[0].points)
 assert.deepEqual(gradeProject(r.project,'S').pieces[1].points,r.piece.points)
 assert.throws(()=>invoke(r.project,'COPY',{copyId:'front-copy'}),/COPY_ID/)
})
test('reject curves, grading rules, sewing, grain/nap, marks and unknown metadata',()=>{
 const bad=[{curves:{0:{cx:1,cy:2}}},{notches:[]},{internalLines:[]},{grainAngleDeg:0},{nap:'up'},{seams:[]},{custom:'x'},{points:[{x:0,y:0,gradeRule:{enabled:true}},{x:2,y:0},{x:2,y:2},{x:0,y:2}]}]
 for(const extra of bad){const p=setup();Object.assign(p.pieces[0],extra);assert.throws(()=>invoke(p,'MOVE',{dxCm:1}),/RIGID_PIECE_/)}
 const p=setup();p.seams=[{a:{pieceId:'front',edgeIndex:0}}]
 assert.throws(()=>invoke(p,'MOVE',{dxCm:1}),/PROJECT_ATTACHMENT/)
})
test('reject self-intersecting contour, overflow, locked and mismatched grading',()=>{
 const p=setup();p.pieces[0].points=[{x:0,y:0},{x:2,y:2},{x:0,y:2},{x:2,y:0}]
 assert.throws(()=>invoke(p,'ROTATE',{angleDeg:5}),/DEGENERATE_CONTOUR|SELF_INTERSECTION/)
 const q=setup();q.pieces[0].locked=true;assert.throws(()=>invoke(q,'MOVE',{dxCm:1}),/LOCKED/)
 const g=setup();g.grading.widthPerSizeCm=3;assert.throws(()=>invoke(g,'MIRROR'),/GRADING_NOT_RIGID_EQUIVARIANT/)
 assert.throws(()=>invoke(setup(),'MOVE',{dxCm:100001}),/TRANSFORM/)
})
test('getters are blocked before execution',()=>{
 const p=setup();let called=false
 Object.defineProperty(p.pieces[0],'curves',{enumerable:true,get(){called=true;throw Error('executed')}})
 assert.throws(()=>invoke(p,'MOVE'),/PROJECT_ACCESSOR/)
 assert.equal(called,false)
})
test('COPY and MIRROR cannot execute inherited toJSON or preserve symbol and hidden metadata',()=>{
 const original=Object.prototype.toJSON
 let invoked=0
 Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value(){invoked++;throw Error('inherited serialization hook')}})
 try {
  const p=setup()
  const copy=invoke(p,'COPY',{copyId:'copy-safe'})
  assert.equal(copy.piece.id,'copy-safe')
  const mirrored=invoke(p,'MIRROR')
  assert.equal(Math.sign(signed(mirrored.piece.points)),Math.sign(signed(p.pieces[0].points)))
  assert.equal(invoked,0)
 }finally{
  if(original===undefined)delete Object.prototype.toJSON
  else Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value:original})
 }
 const p=setup();p.pieces[0][Symbol('hidden-grain')]='up'
 assert.throws(()=>invoke(p,'COPY',{copyId:'symbol'}),/PROJECT_METADATA/)
 const q=setup();Object.defineProperty(q.pieces[0],'secret',{enumerable:false,value:'hidden'})
 assert.throws(()=>invoke(q,'MIRROR'),/PROJECT_ACCESSOR/)
 const sparse=setup();delete sparse.pieces[0].points[1]
 assert.throws(()=>invoke(sparse,'COPY',{copyId:'sparse'}),/SPARSE_ARRAY/)
})
test('mirrored winding and graded contours agree for clockwise and asymmetric shapes',()=>{
 for(const axis of ['vertical','horizontal']){
  const p=setup();p.pieces[0].points=[{x:1,y:0},{x:2,y:4},{x:6,y:4},{x:5,y:0}]
  const r=invoke(p,'MIRROR',{axis})
  assert.equal(Math.sign(signed(r.piece.points)),Math.sign(signed(p.pieces[0].points)))
  assert.ok(Math.abs(area(r.piece.points)-area(p.pieces[0].points))<1e-8)
  for(const size of p.grading.sizes)assert.deepEqual(gradeProject(r.project,size).pieces[0].points,r.piece.points)
 }
})
test('options getters and prototype tricks are rejected without execution',()=>{
 let executed=false
 const options={pieceId:'front',action:'COPY',copyId:'new'}
 Object.defineProperty(options,'copyName',{enumerable:true,get(){executed=true;return 'bad'}})
 assert.throws(()=>act(setup(),options),/OPTIONS/)
 assert.equal(executed,false)
 assert.throws(()=>act(setup(),Object.create({pieceId:'front',action:'MOVE'})),/OPTIONS/)
})
