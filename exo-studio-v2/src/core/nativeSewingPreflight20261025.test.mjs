import test from 'node:test'
import assert from 'node:assert/strict'
import {preflightNativeSewing20261025 as plan} from './nativeSewingPreflight20261025.js'

const poly=(height=.4)=>({points:[[0,0],[.2,0],[.2,height],[0,height]],
  edges:['top','right','bottom','left'],curves:{},notches:{},seam_allowances:{},
  free_curve_points:{},internal_lines:[],holes:[]})
const source=(height=.4)=>({template:{panels:[{id:'front',polygon:poly()},{id:'back',polygon:poly(height)}],seams:[]}})
const ref=(panel,edge,range=[0,1])=>({panel,edge,range})
test('matched straight edges produce actual Rust Sew command without mutation',()=>{
  const before=source(),copy=structuredClone(before)
  const result=plan(before,{a:ref('front','right'),b:ref('back','right'),reverse:true})
  assert.equal(result.ok,true)
  assert.equal(result.command.kind,'Sew')
  assert.equal(result.command.reverse,true)
  assert.equal(result.mismatchMm,0)
  assert.equal(result.measuredMm[0],400)
  assert.deepEqual(before,copy)
})
test('mismatch must explicitly enable easing and remains non-certified',()=>{
  const args={a:ref('front','right'),b:ref('back','right')}
  const blocked=plan(source(.44),args)
  assert.equal(blocked.ok,false);assert.match(blocked.reason,/differ/)
  const eased=plan(source(.44),{...args,ease:true})
  assert.equal(eased.ok,true);assert.equal(eased.requiresEase,true)
  assert.ok(Math.abs(eased.mismatchMm-40)<1e-8)
  assert.equal(eased.manufacturingApproved,false)
})
test('partial reversed ranges use physical sewn intervals, not whole chords',()=>{
  const seam=plan(source(),{a:ref('front','right',[.1,.6]),b:ref('back','right',[.3,.8]),reverse:true})
  assert.equal(seam.ok,true)
  assert.ok(Math.abs(seam.measuredMm[0]-200)<1e-9)
  assert.deepEqual(seam.command.b.range,[.3,.8])
})
test('existing occupied range and invalid coordinates fail closed',()=>{
  const input=source();input.template.seams.push({a:ref('front','right',[0,.5]),b:ref('back','top',[0,1])})
  assert.match(plan(input,{a:ref('front','right',[.25,.8]),b:ref('back','right')}).reason,/overlap/)
  assert.equal(plan(input,{a:ref('front','right'),b:ref('front','right')}).ok,false)
  for(const range of [[.6,.3],[-.1,.2],[0,1.01],[0,NaN],[0,Infinity],[0,0],['0',1]])
    assert.equal(plan(source(),{a:ref('front','right',range),b:ref('back','right')}).ok,false)
})
test('missing and malformed polygons and tolerances cannot submit a seam',()=>{
  assert.equal(plan(source(),{a:ref('x','right'),b:ref('back','right')}).ok,false)
  assert.equal(plan(source(),{a:ref('front','absent'),b:ref('back','right')}).ok,false)
  assert.equal(plan(source(),{a:ref('front','right'),b:ref('back','right'),toleranceMm:Infinity}).ok,false)
  assert.equal(plan(source(),{a:ref('front','right'),b:ref('back','right'),ease:'true'}).ok,false)
})
test('revision compare and swap rejects stale sewing intent',()=>{
  const snapshot={...source(),revision:11}
  const args={a:ref('front','right'),b:ref('back','right'),expectedRevision:11}
  assert.equal(plan(snapshot,args).sourceRevision,11)
  assert.match(plan(snapshot,{...args,expectedRevision:10}).reason,/Stale sewing selection/)
})
test('malicious saved sewing drift rejects subsequent creation',()=>{
  const input=source()
  input.template.seams=[
    {id:'one',a:ref('front','top',[0,.8]),b:ref('back','top',[0,.8])},
    {id:'two',a:ref('front','top',[.5,1]),b:ref('back','bottom',[0,1])}]
  assert.match(plan(input,{a:ref('front','right'),b:ref('back','right')}).reason,/overlap/)
  input.template.seams[1].a.range=[-1,1]
  assert.match(plan(input,{a:ref('front','right'),b:ref('back','right')}).reason,/invalid boundary or interval/)
})
test('microscopic sewn intervals and duplicate panel inventory reject atomically',()=>{
  const args={a:ref('front','right',[0,1e-7]),b:ref('back','right',[0,1e-7])}
  assert.match(plan(source(),args).reason,/shorter than 0.1 mm/)
  const input=source();input.template.panels.push(structuredClone(input.template.panels[0]))
  assert.match(plan(input,{a:ref('front','right'),b:ref('back','right')}).reason,/duplicate or invalid/)
})
