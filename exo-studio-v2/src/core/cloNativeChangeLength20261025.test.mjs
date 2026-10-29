import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeCloNativeChangeLength20261025 as change} from './cloNativeChangeLength20261025.js'

const rectangle=()=>({points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['top','right','bottom','left'],vertex_ids:{top:'anchor-a',right:'anchor-b'},subdivisions:5})

for(const mode of ['Start','End','Both'])test(`${mode} makes exact metre length and preserves native IDs`,()=>{
  const source=rectangle(),before=structuredClone(source)
  const result=change(source,{edge:'top',lengthM:.5,mode,template:{seams:[]},panelId:'front'})
  assert.equal(result.ok,true,result.reason)
  assert.ok(Math.abs(result.qa.measuredLengthM-.5)<1e-12)
  assert.deepEqual(result.polygon.edges,source.edges)
  assert.deepEqual(result.polygon.vertex_ids,source.vertex_ids)
  assert.deepEqual(source,before)
  assert.notEqual(result.polygon,source)
  assert.equal(result.manufacturingApproved,false)
  if(mode==='Start')assert.deepEqual(result.polygon.points[1],source.points[1])
  if(mode==='End')assert.deepEqual(result.polygon.points[0],source.points[0])
  if(mode==='Both')assert.ok(result.polygon.points[0][0]<0&&result.polygon.points[1][0]>.4)
})

test('rejections include degenerate, nonfinite, invalid dimensions and shape topology',()=>{
  for(const lengthM of [0,-.1,Infinity,NaN,101,'0.5'])assert.equal(change(rectangle(),{edge:'top',lengthM}).ok,false)
  const p=rectangle();p.points[1]=[0,0];assert.equal(change(p,{edge:'top',lengthM:.5}).ok,false)
  const q=rectangle();q.points[1]=[Infinity,0];assert.equal(change(q,{edge:'top',lengthM:.5}).ok,false)
  assert.equal(change(rectangle(),{edge:'missing',lengthM:.5}).ok,false)
  assert.equal(change(rectangle(),{edge:'top',lengthM:.5,mode:'Center'}).ok,false)
})

test('curved, free station, notch, sewn and material geometry fail closed',()=>{
  for(const field of ['curves','free_curve_points','notches','seam_allowances','target_lengths']){
    const p=rectangle();p[field]={right:field==='curves'?[[.4,.1],[.4,.2]]:field==='free_curve_points'?[{t:.5,position:[.4,.15]}]:field==='notches'?[{t:.5,depth_m:.003}]:.01}
    assert.equal(change(p,{edge:'top',lengthM:.5}).ok,false,field)
  }
  const sewn={seams:[{a:{panel:'front',edge:'left'},b:{panel:'back',edge:'right'}}]}
  assert.equal(change(rectangle(),{edge:'top',lengthM:.5,template:sewn,panelId:'front'}).ok,false)
  const p=rectangle();p.lines=[{id:'grain'}];assert.equal(change(p,{edge:'top',lengthM:.5}).ok,false)
})

test('cannot collapse another edge or reverse the native contour',()=>{
  assert.equal(change(rectangle(),{edge:'top',lengthM:0.0000001}).ok,false)
  const p=rectangle();assert.equal(change(p,{edge:'top',lengthM:0.8,mode:'End'}).ok,true)
  const q=rectangle();assert.equal(change(q,{edge:'top',lengthM:0.8,mode:'Start'}).ok,true)
})
