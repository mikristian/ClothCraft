import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeCurveStation20261023 as propose} from './nativeCurveStation20261023.js'

const rectangle={points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['bottom','right','top','left'],curves:{}}
const snapshot={revision:12,template:{panels:[{id:'front',polygon:rectangle}]}}

test('real physical millimetre station creates native undoable SplitBoundary, never source mutation',()=>{
  const prior=structuredClone(snapshot)
  const p=propose(snapshot,{panelId:'front',edge:'bottom',distanceMm:'125'})
  assert.equal(p.ok,true);assert.equal(p.revision,12);assert.equal(p.manufacturingApproved,false)
  assert.equal(p.command.kind,'SplitBoundary');assert.equal(p.command.at_m,.125)
  assert.equal(p.stationMm,125);assert(Math.abs(p.edgeLengthMm-400)<1e-6)
  assert(Math.abs(p.position[0]-.125)<1e-6)
  const half=propose(snapshot,{panelId:'front',edge:'bottom',mode:'fraction',fraction:.5})
  assert.equal(half.ok,true);assert(Math.abs(half.command.at_m-.2)<1e-7)
  assert.deepEqual(snapshot,prior)
})

test('curved physical station is not falsely equated with cubic parameter',()=>{
  const curved=structuredClone(snapshot)
  curved.template.panels[0].polygon.curves.bottom=[[.05,.12],[.38,-.05]]
  const p=propose(curved,{panelId:'front',edge:'bottom',mode:'fraction',fraction:.25})
  assert.equal(p.ok,true,p.reason)
  assert(p.edgeLengthMm>400)
  assert(Math.abs(p.command.at_m-p.edgeLengthMm*.25/1000)<1e-8)
  assert(p.position.every(Number.isFinite))
})

test('stale/missing, edge endpoint and invalid station reject without command',()=>{
  for(const opts of [{panelId:'wrong',edge:'bottom'},{panelId:'front',edge:'wrong'},
    {panelId:'front',edge:'bottom',distanceMm:0},
    {panelId:'front',edge:'bottom',distanceMm:400},
    {panelId:'front',edge:'bottom',distanceMm:Infinity},
    {panelId:'front',edge:'bottom',distanceMm:'abc'},
    {panelId:'front',edge:'bottom',mode:'fraction',fraction:-.1},
    {panelId:'front',edge:'bottom',mode:'fraction',fraction:1.1}]){
    const p=propose(snapshot,opts)
    assert.equal(p.ok,false,JSON.stringify(opts));assert.equal(p.command,undefined)
  }
  const stale={...snapshot,revision:null}
  assert.equal(propose(stale,{panelId:'front',edge:'bottom'}).ok,false)
})
