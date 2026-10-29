import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativeMatchedSeamNotches20261024 as plan} from './nativeSeamMatchedNotch20261024.js'
const p=(id,reverse=false)=>({id,polygon:{
  points:reverse?[[.4,0],[0,0],[0,.2],[.4,.2]]:[[0,0],[.4,0],[.4,.2],[0,.2]],
  edges:['hem','right','top','left'],curves:{},notches:{}}})
const source=({reverse=false,partial=false,allowEase=false}={})=>({revision:7,template:{
  panels:[p('A'),p('B',reverse)],
  seams:[{id:'s',a:{panel:'A',edge:'hem',range:partial?[.15,.85]:[0,1]},
    b:{panel:'B',edge:'hem',range:partial?[.1,.8]:[0,1]},reverse_b:reverse,allow_ease:allowEase}],
}})
test('matched arclength physical notches do not mutate native source',()=>{
 const s=source(),old=structuredClone(s)
 const r=plan(s,{seamId:'s',fraction:.25,depthMm:3})
 assert.equal(r.ok,true,r.reason)
 assert.equal(r.commands.length,2)
 assert.equal(r.commands[0].t,.25)
 assert.equal(r.commands[1].t,.25)
 assert(Math.abs(r.proposals[0].stationMm[0]-100)<1e-6)
 assert(Math.abs(r.proposals[0].stationMm[1])<1e-6)
 assert.equal(r.commands[0].depth_m,.003)
 assert.equal(r.manufacturingApproved,false)
 assert.deepEqual(s,old)
})
test('reversed and partial sewn boundary correspondence maps t correctly',()=>{
 const r=plan(source({reverse:true,partial:true}),{seamId:'s',fraction:.25})
 assert.equal(r.ok,true,r.reason)
 assert(Math.abs(r.commands[0].t-.325)<1e-9)
 assert(Math.abs(r.commands[1].t-.625)<1e-9)
 assert.equal(r.reverseB,true)
})
test('refuses unsupported source, physical mismatch, ease and near-existing notches',()=>{
 const ease=plan(source({allowEase:true}),{seamId:'s'})
 assert.equal(ease.ok,false);assert.match(ease.reason,/Ease-enabled/)
 const diff=source();diff.template.panels[1].polygon.points[1][0]=.45
 assert.equal(plan(diff,{seamId:'s'}).ok,false)
 const near=source();near.template.panels[0].polygon.notches.hem=[{t:.5,depth_m:.004}]
 assert.equal(plan(near,{seamId:'s'}).ok,false)
 assert.equal(plan(source(),{seamId:'s',fraction:0}).ok,false)
 assert.equal(plan(source(),{seamId:'s',depthMm:15}).ok,false)
 assert.equal(plan(source(),{seamId:'missing'}).ok,false)
})
