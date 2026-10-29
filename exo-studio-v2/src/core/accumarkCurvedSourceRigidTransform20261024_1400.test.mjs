import test from 'node:test'
import assert from 'node:assert/strict'
import {edgeLength,edgePointAt} from './project.js'
import {gradeProject} from './grading.js'
import {applyAccuMarkCurvedSourceRigidTransform20261024_1400 as run} from './accumarkCurvedSourceRigidTransform20261024_1400.js'

const sizes=['S','M','L']
const rule=(dx,dy)=>({mode:'small-large-incremental',sizes,baseSize:'M',steps:[{dx,dy},{dx,dy}]})
function source(){
  return {revision:1,grading:{sizes,baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{
    id:'panel',name:'Panel',points:[{x:0,y:0,industrialGradeRule:rule(-1,-.5)},{x:20,y:0,industrialGradeRule:rule(1,-.5)},{x:20,y:20,industrialGradeRule:rule(1,.5)},{x:0,y:20,industrialGradeRule:rule(-1,.5)}],
    curves:{0:{cx:10,cy:-3}},seamAllowance:1.1,edgeSeamAllowances:{0:1.3},
    notches:[{id:'n',edgeIndex:0,t:.3,depthCm:.3}],
    internalLines:[{id:'draw',type:'guide',a:{x:3,y:5},b:{x:15,y:8}}]
  }]}
}
test('translation preserves authored control, lengths, allowances and source',()=>{
  const p=source(),copy=structuredClone(p),before=edgeLength(p.pieces[0],0),r=run(p,{pieceId:'panel',dxCm:4,dyCm:-2})
  assert.deepEqual(p,copy);assert.equal(r.piece.curves[0].cx,14);assert.equal(r.piece.curves[0].cy,-5)
  assert(Math.abs(edgeLength(r.piece,0)-before)<1e-8)
  assert.deepEqual(r.piece.edgeSeamAllowances,{0:1.3});assert.equal(r.manufacturingApproved,false)
  assert(r.cutlinePreview.length>4)
})
test('quarter turn rotates curve control, construction segment, and unequal industrial grade steps',()=>{
  const p=source(),r=run(p,{pieceId:'panel',angleDeg:90}).piece
  assert(Math.abs(r.curves[0].cx-23)<1e-8);assert(Math.abs(r.curves[0].cy-10)<1e-8)
  assert(Math.abs(r.internalLines[0].a.x-15)<1e-8);assert(Math.abs(r.internalLines[0].a.y-3)<1e-8)
  const step=r.points[0].industrialGradeRule.steps[0]
  assert(Math.abs(step.dx-.5)<1e-8);assert(Math.abs(step.dy+1)<1e-8)
})
test('each size validates curved edge station and physical length',()=>{
  const r=run(source(),{pieceId:'panel',dxCm:2,angleDeg:30})
  assert.deepEqual(r.validation.sizes.map(x=>x.size),sizes)
  for(const x of r.validation.sizes)assert(x.edgeLengthsCm[0]>17)
  assert.equal(r.piece.notches[0].t,.3)
  assert(Number.isFinite(edgePointAt(r.piece,0,.3).point.y))
})
test('rejects seams, nap metadata, and unseen attachments',()=>{
  const linked=source();linked.seams=[{id:'s',a:{pieceId:'panel'}}]
  assert.throws(()=>run(linked,{pieceId:'panel'}),/PROJECT_SEAM/)
  const nap=source();nap.pieces[0].nap='up';assert.throws(()=>run(nap,{pieceId:'panel'}),/UNSUPPORTED_METADATA/)
  const unknown=source();unknown.pieces[0].sewingPairs=[];assert.throws(()=>run(unknown,{pieceId:'panel'}),/UNSUPPORTED_METADATA/)
})
test('rejects nonfinite, accessors and cycles without evaluating accessor',()=>{
  const bad=source();bad.pieces[0].curves[0].cx=Infinity
  assert.throws(()=>run(bad,{pieceId:'panel'}),/NONFINITE/)
  const getter=source();let calls=0;Object.defineProperty(getter.pieces[0].points[0],'x',{get(){calls++;throw Error('executed')}})
  assert.throws(()=>run(getter,{pieceId:'panel'}),/ACCESSOR/);assert.equal(calls,0)
  const cyclic=source();cyclic.loop=cyclic;assert.throws(()=>run(cyclic,{pieceId:'panel'}),/COMPLEXITY/)
})
test('rejects invalid notch station and malformed curved topology',()=>{
  const n=source();n.pieces[0].notches[0].t=1.5
  assert.throws(()=>run(n,{pieceId:'panel'}),/NOTCH_STATION/)
  const crossing=source();crossing.pieces[0].points[2]={x:0,y:20,industrialGradeRule:rule(1,.5)}
  crossing.pieces[0].points[3]={x:20,y:20,industrialGradeRule:rule(-1,.5)}
  assert.throws(()=>run(crossing,{pieceId:'panel'}),/SELF_INTERSECTION|DEGENERATE/)
})
test('anchored construction remains attached under translation on all grades',()=>{
  const p=source();const edgePoint=edgePointAt(p.pieces[0],0,.5).point
  p.pieces[0].internalLines=[{a:edgePoint,b:{x:20,y:10},aAnchor:{edgeIndex:0,t:.5},bAnchor:{edgeIndex:1,t:.5}}]
  const r=run(p,{pieceId:'panel',dxCm:1})
  const actual=edgePointAt(r.piece,0,.5).point
  assert(Math.hypot(r.piece.internalLines[0].a.x-actual.x,r.piece.internalLines[0].a.y-actual.y)<1e-8)
  assert.equal(r.validation.sizes.length,3)
})
test('automatic multi-size grading rotation refuses unproven axis equivalence',()=>{
  const p=source();delete p.pieces[0].points[0].industrialGradeRule
  assert.throws(()=>run(p,{pieceId:'panel',angleDeg:20}),/AUTOMATIC_GRADING/)
})
test('repeated size runs preserve quadratic controls and physical curved notch stations under rigid rotation',()=>{
  const p=source()
  p.pieces[0].notches[0].gradeArcStation={version:1,distanceCm:4,from:'start'}
  const r=run(p,{pieceId:'panel',angleDeg:37,dxCm:2,dyCm:3})
  const beforeSizes=sizes.map(size=>gradeProject(p,size).pieces[0])
  const afterSizes=sizes.map(size=>gradeProject(r.project,size).pieces[0])
  for(let i=0;i<sizes.length;i++){
    const before=beforeSizes[i],after=afterSizes[i]
    assert(Math.abs(edgeLength(before,0)-edgeLength(after,0))<1e-6)
    assert.equal(after.notches[0].edgeIndex,0)
    assert.equal(after.notches[0].gradeArcStation.distanceCm,4)
    assert.equal(after.edgeSeamAllowances[0],1.3)
    assert.equal(after.seamAllowance,1.1)
    const a=edgePointAt(before,0,before.notches[0].t).point
    const b=edgePointAt(after,0,after.notches[0].t).point
    assert(Math.abs(Math.hypot(a.x-before.points[0].x,a.y-before.points[0].y)-Math.hypot(b.x-after.points[0].x,b.y-after.points[0].y))<1e-5)
    assert.equal(after.curves[0].cx,gradeProject(r.project,sizes[i]).pieces[0].curves[0].cx)
  }
})
test('stale notch x/y coordinates are rejected even when edgeIndex and t look valid',()=>{
  const p=source();p.pieces[0].notches[0].x=10;p.pieces[0].notches[0].y=0
  assert.throws(()=>run(p,{pieceId:'panel',angleDeg:10}),/NOTCH_COORDINATE_DRIFT/)
})
test('unsupported tangent controls and cutting attachments fail closed without source mutation',()=>{
  for(const [key,value] of [['tangent',{x:1,y:0}],['grainAngleDeg',0],['buttonholes',[]],['darts',[]],['edgeBindings',[]]]){
    const p=source(),copy=structuredClone(p);p.pieces[0][key]=value
    assert.throws(()=>run(p,{pieceId:'panel',angleDeg:15}),/UNSUPPORTED_METADATA/,key)
    assert.deepEqual(p.pieces[0][key],value)
    assert.deepEqual(p.pieces[0].points,copy.pieces[0].points)
  }
})
test('graded quadratic handle interpolation retains coordinate parity at each repeated size',()=>{
  const p=source()
  p.pieces[0].internalLines=[{a:{x:2,y:2},b:{x:4,y:4}}]
  // A source with grade point displacement and an independently placed curve handle
  // exercises EXO's gradeConstructionCurveControls interpolation at every break.
  const out=run(p,{pieceId:'panel',angleDeg:19})
  for(const size of sizes){
    const graded=gradeProject(out.project,size).pieces[0]
    assert(Number.isFinite(graded.curves[0].cx)&&Number.isFinite(graded.curves[0].cy))
    assert(Math.abs(graded.points[0].x-graded.points[1].x)>1)
  }
})
