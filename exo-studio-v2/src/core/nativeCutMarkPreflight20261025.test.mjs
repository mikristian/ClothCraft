import test from 'node:test'
import assert from 'node:assert/strict'
import {preflightNativeCutMark20261025 as plan} from './nativeCutMarkPreflight20261025.js'
const fixture=()=>({template:{panels:[{id:'a',polygon:{
  points:[[0,0],[.3,0],[.3,.4],[0,.4]],edges:['top','right','bottom','left'],
  curves:{},notches:{right:[{t:.25,depth_m:.006}]},free_curve_points:{}
}}]}})
test('allowance mm writes real native metres; width zero removes allowance',()=>{
 const f=fixture(),original=structuredClone(f)
 const p=plan(f,{panelId:'a',edge:'top',kind:'allowance',widthMm:12.5})
 assert.equal(p.ok,true);assert.equal(p.command.width_m,.0125)
 assert.equal(plan(f,{panelId:'a',edge:'top',kind:'allowance',widthMm:0}).command.width_m,0)
 assert.deepEqual(f,original)
})
test('add/delete notches respects saved physical station and mm tolerance',()=>{
 const f=fixture()
 assert.equal(plan(f,{panelId:'a',edge:'right',t:.25}).ok,false)
 const ok=plan(f,{panelId:'a',edge:'right',t:.5,depthMm:4})
 assert.equal(ok.ok,true);assert.equal(ok.command.depth_m,.004)
 const remove=plan(f,{panelId:'a',edge:'right',kind:'remove',t:.251})
 assert.equal(remove.ok,true);assert.equal(remove.command.t,.25)
 assert.equal(plan(f,{panelId:'a',edge:'right',kind:'remove',t:.5}).ok,false)
})
test('pair stations use physical mm and never exceed endpoints',()=>{
 const f=fixture(),p=plan(f,{panelId:'a',edge:'right',kind:'pair',t:.5,spacingMm:8})
 assert.equal(p.ok,true)
 assert.equal(p.stations.length,2)
 assert.ok(Math.abs((p.stations[1]-p.stations[0])*p.lengthMm-8)<1e-10)
 assert.equal(plan(f,{panelId:'a',edge:'right',kind:'pair',t:.001,spacingMm:100}).ok,false)
})
test('nonfinite or malformed input rejects without mutating source',()=>{
 const f=fixture(),before=structuredClone(f)
 for(const x of [NaN,Infinity,-2,501])
  assert.equal(plan(f,{panelId:'a',edge:'top',kind:'allowance',widthMm:x}).ok,false)
 for(const t of [NaN,Infinity,-.1,0,1])
  assert.equal(plan(f,{panelId:'a',edge:'top',kind:'notch',t}).ok,false)
 assert.equal(plan(f,{panelId:'a',edge:'missing',kind:'allowance',widthMm:1}).ok,false)
 assert.deepEqual(f,before)
})
