import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023 as audit} from './accumarkNativeGradedSewnSeamQA20261023.js'

const panel=(id,curved=false)=>({id,polygon:{points:[[0,0],[.4,0],[.4,.2],[0,.2]],
  edges:['hem','side','top','other'],curves:curved?{hem:[[.12,.08],[.28,.08]]}:{}}})
const fixture=(curved=false)=>({template:{panels:[panel('front',curved),panel('back',curved)],
  seams:[{id:'join',a:{panel:'front',edge:'hem',range:[0,1]},
    b:{panel:'back',edge:'hem',range:[0,1]},reverse_b:true,allow_ease:false}]}})
const rules=s=>{const created=createAccuMarkNativeRuleSet(s);assert(created.ok,created.reason);return created.ruleSet}

test('all six sizes compare actual curved sewn arclength and preserve inputs',()=>{
  const snapshot=fixture(true),ruleSet=rules(snapshot)
  const old=structuredClone([snapshot,ruleSet])
  const r=audit(snapshot,ruleSet)
  assert.equal(r.ok,true,JSON.stringify(r.issues))
  assert.equal(r.rows.length,6)
  assert.deepEqual(r.rows.map(row=>row.size),['XS','S','M','L','XL','XXL'])
  assert(r.rows.every(row=>row.sourceLengthMm>400&&row.mismatchMm<1e-8))
  assert.equal(r.manufacturingApproved,false)
  assert.equal(JSON.stringify([snapshot,ruleSet]),JSON.stringify(old))
})

test('size-specific sewn mismatch is blocked, with signed ease measured physically',()=>{
  const snapshot=fixture(),base=rules(snapshot)
  const edited=editAccuMarkNativePointRule(snapshot,base,{panelId:'back',size:'XL',pointIndex:1,dxMm:25,dyMm:0})
  assert(edited.ok,edited.reason)
  const r=audit(snapshot,edited.ruleSet)
  assert.equal(r.ok,false)
  assert.equal(r.rows.length,6)
  assert(r.rows.find(row=>row.size==='XL').signedEaseMm>24)
  assert.equal(r.blocks,1)
  assert.equal(r.rows.find(row=>row.size==='M').pass,true)
})

test('partial curved sewing uses normalized physical arclength, unlike whole-edge length',()=>{
  const s=fixture(true),ruleSet=rules(s)
  s.template.seams[0].a.range=[.15,.65]
  s.template.seams[0].b.range=[.25,.75]
  const r=audit(s,ruleSet)
  assert.equal(r.ok,true,JSON.stringify(r.issues))
  assert.equal(r.rows.length,6)
  assert(r.rows.every(row=>row.sourceLengthMm>200&&row.sourceLengthMm<300))
  assert(r.rows.every(row=>row.mismatchMm<1e-7&&row.reverseB))
  assert.deepEqual(r.rows[0].sourceRange,[.15,.65])
  s.template.seams[0].b.range=[.25,.9]
  const invalid=audit(s,ruleSet)
  assert.equal(invalid.ok,false)
  assert.equal(invalid.blocks,6)
  assert(invalid.rows.every(row=>row.signedEaseMm>0&&row.mismatchMm>50))
})

test('unknown, partial, and invalid seam representations fail closed',()=>{
  for(const mutate of [
    s=>{s.template.seams[0].a.range=[.9,.1]},
    s=>{s.template.seams[0].a.range=[-.1,.9]},
    s=>{s.template.seams[0].a.range=[.2,1.1]},
    s=>{delete s.template.seams[0].reverse_b},
    s=>{s.template.seams[0].a.edge='absent'},
    s=>{s.template.seams[0].unknown='unmapped'},
    s=>{s.template.panels[0].polygon.holes=[{}]},
  ]){
    const s=fixture(),ruleSet=rules(s);mutate(s)
    assert.equal(audit(s,ruleSet).ok,false)
  }
})
test('native Rust seam serialization including side, stiffness and notches remains valid',()=>{
  const s=fixture(),ruleSet=rules(s),seam=s.template.seams[0]
  seam.a.side='top';seam.b.side='bottom';seam.stiffness=50000
  seam.notches=[[.25,.25],[.75,.75]]
  const original=structuredClone(seam)
  assert.equal(audit(s,ruleSet).ok,true)
  assert.deepEqual(seam,original)
  for(const change of [
    x=>x.a.side='diagonal',x=>x.a.side=undefined,
    x=>x.stiffness=Infinity,x=>x.stiffness=-1,
    x=>x.notches=[[.8,.8],[.3,.9]],x=>x.notches=[[0,.5]],
    x=>x.notches=[[.5,NaN]],x=>x.notches=[['.5',.5]],
    x=>x.notches='bad',x=>x.unknown=true,x=>x.a.unknown=true,
    x=>x.allow_ease='false',
  ]){
    const tampered=structuredClone(s)
    change(tampered.template.seams[0])
    assert.equal(audit(tampered,ruleSet).ok,false)
  }
})
