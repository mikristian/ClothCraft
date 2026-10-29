import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeCurveStation20261023 as propose} from './nativeCurveStation20261023.js'

const snapshot={revision:12,template:{panels:[{id:'front',polygon:{
  points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['bottom','right','top','left'],curves:{},
}}]}}
const station=options=>propose(snapshot,{panelId:'front',edge:'bottom',...options})

test('native physical station rejects nondecimal string distances without command',()=>{
  for(const distanceMm of ['0x7d','0b1111101','0o175']){
    const result=station({distanceMm})
    assert.equal(result.ok,false,distanceMm)
    assert.equal(result.command,undefined)
  }
})

test('native station rejects coerced booleans, arrays, and objects without command',()=>{
  for(const options of [
    {distanceMm:true},{distanceMm:[125]},{distanceMm:{valueOf:()=>125}},
    {mode:'fraction',fraction:{valueOf:()=>0.5}},
  ]){
    const result=station(options)
    assert.equal(result.ok,false,JSON.stringify(options))
    assert.equal(result.command,undefined)
  }
})

test('native station does not execute untrusted coercion hooks',()=>{
  let calls=0
  const hostile={valueOf(){calls++;return 125},toString(){calls++;return '125'}}
  assert.equal(station({distanceMm:hostile}).ok,false)
  assert.equal(station({mode:'fraction',fraction:hostile}).ok,false)
  assert.equal(calls,0)
})

test('native station preserves finite decimal and scientific notation, and source',()=>{
  const before=structuredClone(snapshot)
  for(const distanceMm of [125, '125', ' 1.25e2 ', '+125.0', '1.25E+2']){
    const result=station({distanceMm})
    assert.equal(result.ok,true,String(distanceMm))
    assert.equal(result.command.at_m,.125)
  }
  const fraction=station({mode:'fraction',fraction:'5e-1'})
  assert.equal(fraction.ok,true,fraction.reason)
  assert.equal(fraction.command.at_m,.2)
  assert.deepEqual(snapshot,before)
})
