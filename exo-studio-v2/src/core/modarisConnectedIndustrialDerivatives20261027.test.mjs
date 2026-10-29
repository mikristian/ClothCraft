import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisConnectedIndustrialDerivative20261027 as create,
  regenerateModarisConnectedIndustrialDerivative20261027 as update,
  verifySavedModarisConnectedIndustrialDerivative20261027 as verify} from './modarisConnectedIndustrialDerivatives20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
function fixture(){
  return {revision:8,grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},
    pieces:[{id:'front',name:'Front panel',points:[
      {id:'a',x:0,y:0,gradeRule:{enabled:true,dxPerSize:-1,dyPerSize:-0.5}},
      {id:'b',x:24,y:0,gradeRule:{enabled:true,dxPerSize:1,dyPerSize:-0.5}},
      {id:'c',x:24,y:40,gradeRule:{enabled:true,dxPerSize:1,dyPerSize:0.5}},
      {id:'d',x:0,y:40,gradeRule:{enabled:true,dxPerSize:-1,dyPerSize:0.5}}
    ]}]}
}
const options={sourcePieceId:'front',childPieceId:'facing',childName:'Rectangular facing study',depthCm:1.5}
test('six size views recompute exact inner dimensions with stable parent/child vertex identities',()=>{
  const project=fixture(), original=structuredClone(project), result=create(project,options)
  assert.deepEqual(project,original)
  assert.equal(result.sizeViews.length,6)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(new Set(result.sizeViews.map(v=>v.widthCm)).size,6)
  assert.equal(new Set(result.sizeViews.map(v=>v.heightCm)).size,6)
  for(const view of result.sizeViews){
    assert.deepEqual(view.sourceVertices.map(v=>v.id),['a','b','c','d'])
    assert.deepEqual(view.childVertices.map(v=>v.id),['facing_a','facing_b','facing_c','facing_d'])
    assert.deepEqual(view.childVertices.map(v=>v.sourceVertexId),['a','b','c','d'])
    assert.ok(Math.abs(view.innerAreaCm2-(view.widthCm-3)*(view.heightCm-3))<1e-8)
  }
  assert.deepEqual(verify(JSON.parse(JSON.stringify(project)),JSON.parse(JSON.stringify(result))),{ok:true,unit:'cm',sizeCount:6,manufacturingApproved:false})
})
test('changed source geometry requires revision advance and regenerates every size',()=>{
  const p=fixture(),previous=create(p,options)
  p.pieces[0].points[1].x+=3;p.pieces[0].points[2].x+=3
  assert.throws(()=>update(p,previous),/SILENT_SOURCE_EDIT/)
  p.revision++
  const next=update(p,previous,{expectedRevision:p.revision})
  assert.equal(next.sourceChanged,true)
  assert.equal(next.previousSourceRevision,8)
  assert.equal(next.sizeViews.length,6)
  for(let i=0;i<6;i++) assert.ok(next.sizeViews[i].widthCm>previous.sizeViews[i].widthCm)
  assert.throws(()=>verify(p,previous),/STALE_SAVED_DERIVATIVE/)
  assert.equal(verify(p,next).ok,true)
})
test('child identity, geometry, source sample, dimensions and provenance tamper fail closed',()=>{
  const project=fixture(), base=create(project,options)
  for(const change of [
    x=>{x.sizeViews[0].childVertices[0].x+=0.4},
    x=>{x.sizeViews[2].childVertices[1].id='forged'},
    x=>{x.sizeViews[1].sourceVertices[2].x+=0.4},
    x=>{x.sizeViews[5].widthCm+=0.5},
    x=>{x.provenance.childVertexIds[0]='other'},
    x=>{x.provenance.childHash='forged'}
  ]) {
    const changed=structuredClone(base);change(changed)
    assert.throws(()=>update(project,changed),/CONNECTED_DERIVATIVE_/)
  }
})
test('fail closed on source attachments, nonrectangular, invalid sizes, unit and stale revisions',()=>{
  for(const change of [
    p=>{p.pieces[0].curves={0:{cx:1,cy:2}}},
    p=>{p.pieces[0].notches=[]},
    p=>{p.pieces[0].points[2].x=22},
    p=>{p.pieces[0].points[0].extra=1},
    p=>{p.grading.sizes.pop()},
    p=>{p.seams=[]},
    p=>{p.pieces[0].points[2].y=2}
  ]){
    const p=fixture();change(p)
    assert.throws(()=>create(p,options),/CONNECTED_DERIVATIVE_/)
  }
  const original=fixture(), link=create(original,options)
  assert.throws(()=>update(original,link,{expectedRevision:9}),/REVISION_CONFLICT/)
  assert.throws(()=>create(original,{...options,depthCm:100}),/OPTIONS/)
})
