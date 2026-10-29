import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAdvancedCadCurveHandle20261024_1423 as edit} from './advancedCadCurveHandle20261024_1423.js'
import {edgeLength,edgePointAt} from './project.js'
import {gradeProject} from './grading.js'

const sizes=['S','M','L']
const rule=(dx,dy)=>({mode:'small-large-incremental',sizes,baseSize:'M',steps:[{dx,dy},{dx,dy}]})
function project(){
  return {revision:2,grading:{sizes,baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{
    id:'bodice',name:'Bodice',points:[
      {x:0,y:0,industrialGradeRule:rule(-1,-.5)},
      {x:20,y:0,industrialGradeRule:rule(1,-.5)},
      {x:20,y:20,industrialGradeRule:rule(1,.5)},
      {x:0,y:20,industrialGradeRule:rule(-1,.5)}
    ],curves:{0:{cx:10,cy:-3}},notches:[{id:'n',edgeIndex:0,t:.3,depthCm:.4}],
    seamAllowance:1,edgeSeamAllowances:{0:1.4},internalLines:[]}]}
}
test('curve control edit applies for three graded sizes and leaves source immutable',()=>{
  const source=project(),copy=structuredClone(source),result=edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-2})
  assert.deepEqual(source,copy)
  assert.equal(result.project.pieces[0].curves[0].cy,-5)
  assert.equal(result.project.revision,3)
  assert.equal(result.validation.sizes.length,3)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.project.pieces[0].edgeSeamAllowances[0],1.4)
})
test('physical curve length changes while unrelated edges remain untouched at every grade',()=>{
  const original=project(),next=edit(original,{kind:'curve.control.set',pieceId:'bodice',edgeIndex:0,cxCm:10,cyCm:-6}).project
  for(const size of sizes){
    const before=gradeProject(original,size).pieces[0],after=gradeProject(next,size).pieces[0]
    assert(edgeLength(after,0)>edgeLength(before,0))
    for(let k=1;k<4;k++)assert(Math.abs(edgeLength(after,k)-edgeLength(before,k))<1e-6)
  }
})
test('straight edge can become a quadratic curve without changing vertex topology',()=>{
  const source=project()
  const result=edit(source,{kind:'curve.control.set',pieceId:'bodice',edgeIndex:1,cxCm:24,cyCm:10})
  assert.equal(result.detail.wasStraight,true)
  assert.equal(result.project.pieces[0].points.length,4)
  assert.equal(result.project.pieces[0].curves[1].cx,24)
})
test('anchored construction endpoint reprojections follow edited curve',()=>{
  const source=project(),at=edgePointAt(source.pieces[0],0,.5).point
  source.pieces[0].internalLines=[{id:'guide',a:at,b:{x:15,y:11},aAnchor:{edgeIndex:0,t:.5}}]
  const next=edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-2}).project.pieces[0]
  const expected=edgePointAt(next,0,.5).point
  assert(Math.hypot(next.internalLines[0].a.x-expected.x,next.internalLines[0].a.y-expected.y)<1e-7)
})
test('notch with explicit source coordinates is kept on same physical edge fraction',()=>{
  const source=project(),pt=edgePointAt(source.pieces[0],0,.3).point
  source.pieces[0].notches[0]={...source.pieces[0].notches[0],...pt}
  const next=edit(source,{kind:'curve.control.set',pieceId:'bodice',edgeIndex:0,cxCm:10,cyCm:-5}).project.pieces[0]
  const expected=edgePointAt(next,0,.3).point
  assert(Math.hypot(next.notches[0].x-expected.x,next.notches[0].y-expected.y)<1e-7)
})
test('linked sewn edge cannot change before trueing',()=>{
  const source=project()
  source.seams=[{id:'body',a:{pieceId:'bodice',edgeIndex:0},b:{pieceId:'other',edgeIndex:1}}]
  assert.throws(()=>edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/SEWN_EDGE_REQUIRES_TRUEING/)
})
test('rejects fixed arclength grade notch until updated on every size',()=>{
  const source=project()
  source.pieces[0].notches[0].gradeArcStation={version:1,distanceCm:4,from:'start'}
  assert.throws(()=>edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/ARC_LENGTH_NOTCH/)
})
test('rejects crossings and excessive curve deflection without modifying source',()=>{
  const source=project(),copy=structuredClone(source)
  assert.throws(()=>edit(source,{kind:'curve.control.set',pieceId:'bodice',edgeIndex:0,cxCm:10,cyCm:40}),/SELF_INTERSECTION/)
  assert.deepEqual(source,copy)
  assert.throws(()=>edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:400,dyCm:0}),/EXCESSIVE_CONTROL_OFFSET/)
})
test('accessor and inherited toJSON are never evaluated during secure snapshot',()=>{
  const source=project(),attacks=[]
  Object.defineProperty(source.pieces[0].points[0],'x',{get(){attacks.push('getter');throw Error('executed')}})
  assert.throws(()=>edit(source,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/ACCESSOR/)
  assert.deepEqual(attacks,[])
  const inherited=project(),prior=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')
  Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value(){attacks.push('toJSON');throw Error('executed')}})
  try{
    assert.throws(()=>edit(inherited,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/UNSAFE_SERIALIZATION_ENVIRONMENT/)
    assert.deepEqual(attacks,[])
  }finally{if(prior)Object.defineProperty(Object.prototype,'toJSON',prior);else delete Object.prototype.toJSON}
})
test('malformed grade sizes and incomplete edge references fail closed',()=>{
  const p=project();p.grading.sizes=['S','M','S']
  assert.throws(()=>edit(p,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/SIZE_SET/)
  const q=project();q.pieces[0].internalLines=[{a:{x:4,y:-2},b:{x:7,y:4},aAnchor:{edgeIndex:0,t:2}}]
  assert.throws(()=>edit(q,{kind:'curve.control.move',pieceId:'bodice',edgeIndex:0,dxCm:0,dyCm:-1}),/LINE_ANCHOR/)
})
