import test from 'node:test'
import assert from 'node:assert/strict'
import {printPieces20261025} from './printLayout20261025.js'
import {printPatternGuideOverlay20261025} from './printPatternGuideOverlay20261025.js'

const torso={id:'front',name:'Front Bodice',polygon:{
  points:[[.02,.01],[.28,.01],[.30,.12],[.31,.60],[0,.60],[0,.12]],
  edges:['shoulder','shoulder-right','side-right','hem','side-left','shoulder-left'],
}}
const native=panel=>printPieces20261025({template:{panels:[panel]}},{native:true})[0]

test('native underarm chest and belly use real print-local cm, with visible measurements',()=>{
  const piece=native(torso),snapshot=structuredClone({piece,torso})
  const {guides,dimensions}=printPatternGuideOverlay20261025(piece,torso)
  assert.equal(guides.length,3)
  const chest=guides.find(g=>g.kind==='chest'),belly=guides.find(g=>g.kind==='belly')
  assert.ok(chest)
  assert.ok(belly)
  assert.ok(Math.abs(chest.pointsCm[0][1]-11)<1e-8)
  assert.ok(Math.abs(chest.lengthCm-30)<1e-8)
  assert.ok(Math.abs(belly.pointsCm[0][1]-37.76)<1e-8)
  assert.ok(guides.some(g=>g.kind==='center-front'&&g.style==='dotted'))
  for(const guide of guides){
    const dimension=dimensions.find(d=>d.id===`${guide.id}:measurement`)
    assert.ok(dimension)
    assert.equal(dimension.valueCm,guide.lengthCm)
    assert.ok(dimension.positionCm.every(Number.isFinite))
  }
  assert.deepEqual({piece,torso},snapshot)
})

test('non-torso panels do not acquire fabricated body references',()=>{
  const sleeve={...torso,id:'sleeve',name:'Sleeve',polygon:structuredClone(torso.polygon)}
  assert.deepEqual(printPatternGuideOverlay20261025(native(sleeve),sleeve),{guides:[],dimensions:[]})
})

test('concave cutouts split vertical stations and clip guides to occupied cloth',()=>{
  const panel={id:'back',name:'Back',polygon:{points:[
    [0,0],[.4,0],[.4,.6],[.26,.6],[.26,.35],[.14,.35],[.14,.6],[0,.6],
  ]}}
  const result=printPatternGuideOverlay20261025(native(panel),panel)
  const vertical=result.guides.filter(g=>g.kind==='center-back')
  assert.ok(vertical.length>=1)
  assert.ok(vertical.every(g=>g.pointsCm.every(([x,y])=>x>=0&&x<=40&&y>=0&&y<=60)))
  assert.ok(vertical.every(g=>g.lengthCm>0))
})
