import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeDartPrecision20261023 as propose} from './nativeDartPrecision20261023.js'

const make=()=>({revision:4,template:{panels:[{id:'front',polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['hem','right','top','left'],curves:{}}}],seams:[]}})
test('metric physical dart places exact equal sewn legs and native Rust edit; does not mutate source',()=>{
  const snapshot=make(),before=structuredClone(snapshot)
  const p=propose(snapshot,{panelId:'front',edge:'hem',centerFraction:.5,intakeMm:40,depthMm:60})
  assert.equal(p.ok,true,p.reason)
  assert.equal(p.command.kind,'DartCutSew')
  assert.equal(p.command.left_t,.45);assert.equal(p.command.right_t,.55)
  assert.deepEqual(p.apex,[.2,.06])
  assert(Math.abs(p.legsMm[0]-p.legsMm[1])<1e-8);assert.equal(p.wedgeAreaMm2,1200)
  assert.equal(p.manufacturingApproved,false);assert.deepEqual(snapshot,before)
})
test('unsewn straight source must be selected and within Rust topology limits',()=>{
  for(const params of [
    {edge:'invalid'}, {intakeMm:2},{intakeMm:151},{depthMm:501},{depthMm:7},
    {centerFraction:0},{centerFraction:1},{centerFraction:.03,intakeMm:60},
    {intakeMm:Infinity},{depthMm:NaN},
  ]){
    const r=propose(make(),{panelId:'front',edge:'hem',...params})
    assert.equal(r.ok,false,JSON.stringify(params));assert.equal(r.command,undefined)
  }
  const sewn=make();sewn.template.seams.push({a:{panel:'front',edge:'hem'},b:{panel:'other',edge:'other'}})
  assert.equal(propose(sewn,{panelId:'front',edge:'hem'}).ok,false)
  const curved=make();curved.template.panels[0].polygon.curves.hem=[[.1,.05],[.3,.05]]
  assert.equal(propose(curved,{panelId:'front',edge:'hem'}).ok,false)
})
test('apex outside pattern, opposite winding, metadata attachments refuse creation',()=>{
  const outside=propose(make(),{panelId:'front',edge:'hem',intakeMm:20,depthMm:400})
  assert.equal(outside.ok,false)
  const clockwise=make();clockwise.template.panels[0].polygon.points.reverse()
  assert.equal(propose(clockwise,{panelId:'front',edge:'hem'}).ok,false)
  for(const meta of ['notches','target_lengths','vertex_ids']){
    const source=make();source.template.panels[0].polygon[meta]={hem:meta==='notches'?[{t:.5,depth_m:.003}]:meta==='target_lengths'?.4:'hand-authored'}
    assert.equal(propose(source,{panelId:'front',edge:'hem'}).ok,false)
  }
})
