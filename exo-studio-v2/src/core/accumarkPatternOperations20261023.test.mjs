import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkPatternOperation as apply} from './accumarkPatternOperations20261023.js'

const fixture=()=>({grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}]})
test('local alteration changes only selected point and returns reversible spec without mutating input',()=>{
  const original=fixture(),snapshot=structuredClone(original)
  const result=apply(original,{kind:'alter.local',pieceId:'front',indices:[2],dxCm:1,dyCm:2,protectedIndices:[0,1]})
  assert.deepEqual(original,snapshot)
  assert.deepEqual(result.project.pieces[0].points[2],{x:11,y:10})
  assert.deepEqual(result.validation.gradedSizes,['S','M','L'])
  assert.deepEqual(apply(result.project,result.inverse).project,original)
})
test('slash and spread rotates selected cut section about stable vertex, reversible',()=>{
  const source=fixture(),spec={kind:'fullness.spread',pieceId:'front',pivotIndex:1,indices:[2],angleDeg:12}
  const output=apply(source,spec)
  assert.notDeepEqual(output.project.pieces[0].points[2],source.pieces[0].points[2])
  const back=apply(output.project,output.inverse).project.pieces[0].points[2]
  assert.ok(Math.hypot(back.x-10,back.y-8)<1e-10)
})
test('dart pivot rigidly preserves angular intake and apex-to-leg distances',()=>{
  const source=fixture(),apex={x:5,y:3},legs=[source.pieces[0].points[1],source.pieces[0].points[2]]
  const result=apply(source,{kind:'dart.pivot',pieceId:'front',indices:[1,2],legIndices:[1,2],apex,angleDeg:8})
  const moved=[result.project.pieces[0].points[1],result.project.pieces[0].points[2]]
  const dist=p=>Math.hypot(p.x-apex.x,p.y-apex.y)
  assert.ok(legs.every((leg,i)=>Math.abs(dist(leg)-dist(moved[i]))<1e-10))
  const angle=(a,b)=>Math.atan2((a.x-apex.x)*(b.y-apex.y)-(a.y-apex.y)*(b.x-apex.x),(a.x-apex.x)*(b.x-apex.x)+(a.y-apex.y)*(b.y-apex.y))
  assert.ok(Math.abs(angle(...legs)-angle(...moved))<1e-10)
  assert.deepEqual(source,fixture())
})
test('invalid topology, parameters and metadata fail closed',()=>{
  const p=fixture()
  for(const spec of [
    {kind:'alter.local',indices:[0],dxCm:5,dyCm:0,protectedIndices:[0]},
    {kind:'alter.local',indices:[2],dxCm:Infinity,dyCm:1},
    {kind:'alter.local',indices:[2],dxCm:-10,dyCm:-8},
    {kind:'fullness.spread',indices:[1],pivotIndex:1,angleDeg:10},
    {kind:'dart.pivot',indices:[1,2],legIndices:[1,2],apex:{x:5,y:3},angleDeg:180},
  ])assert.throws(()=>apply(p,{pieceId:'front',...spec}))
  for(const property of [{curves:{0:{cx:5,cy:0}}},{notches:[{edgeIndex:0,t:.5}]},{internalLines:[{a:{x:1,y:1},b:{x:2,y:2}}]}]){
    const unsupported=fixture();Object.assign(unsupported.pieces[0],property)
    assert.throws(()=>apply(unsupported,{kind:'alter.local',pieceId:'front',indices:[2],dxCm:1,dyCm:1}),/UNSUPPORTED/)
  }
  assert.deepEqual(p,fixture())
})
test('fullness and dart mutations reject production attachments and preserve distant small outlines',()=>{
  const spec={kind:'alter.local',pieceId:'front',indices:[2],dxCm:0.001,dyCm:0.001}
  const distant=fixture()
  distant.pieces[0].points=distant.pieces[0].points.map(p=>({x:p.x+1000000,y:p.y+1000000}))
  const edited=apply(distant,spec)
  assert.equal(edited.project.pieces[0].points[2].x,1000010.001)
  assert.equal(edited.validation.contours,'valid')
  assert.deepEqual(distant.pieces[0].points[2],{x:1000010,y:1000008})
  for(const attachment of [{seamAllowance:1},{grainline:{from:0,to:2}},{allowances:{0:1}},{notches:{0:{fraction:.5}}}]){
    const source=fixture()
    Object.assign(source.pieces[0],attachment)
    assert.throws(()=>apply(source,spec),/UNSUPPORTED_ATTACHED_GEOMETRY/)
  }
  const attached=fixture()
  attached.sewingPairs=[{a:'front',b:'back'}]
  assert.throws(()=>apply(attached,spec),/UNSUPPORTED_PROJECT_ATTACHMENTS/)
  const overflow=fixture()
  overflow.pieces[0].points[2].x=1e8
  assert.throws(()=>apply(overflow,spec),/INVALID_CONTOUR/)
})
