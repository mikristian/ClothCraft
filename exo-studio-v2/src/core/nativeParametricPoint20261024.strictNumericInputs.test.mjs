import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeParametricPointProposal} from './nativeParametricPoint20261023.js'

const polygon={points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['bottom','right','top','left'],curves:{},free_curve_points:{}}
const snapshot={revision:7,template:{panels:[{id:'front',polygon}]}}
const propose=options=>buildNativeParametricPointProposal(snapshot,{panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceMm:250,...options})

test('native point distances reject nondecimal strings and implicit object/boolean/null coercion',()=>{
  const before=structuredClone(snapshot)
  for(const distanceMm of ['0xFA','0b11111010','0o372',true,null,{valueOf(){return 250}},[250]]){
    const result=propose({distanceMm})
    assert.equal(result.ok,false,`accepted distance ${String(distanceMm)}`)
    assert.equal(result.command,undefined)
  }
  assert.deepEqual(snapshot,before)
})

test('native point indices reject implicit coercion while preserving decimal indices',()=>{
  for(const options of [{pointIndex:true},{pointIndex:'0x1'},{pointIndex:[1]},{a:'0x0'},{a:false},{b:'0b1'},{b:{valueOf(){return 1}}}]){
    const result=propose(options)
    assert.equal(result.ok,false,`accepted index ${JSON.stringify(options)}`)
    assert.equal(result.command,undefined)
  }
})

test('native point angle rejects nondecimal representations without emitting an edit',()=>{
  for(const angleDeg of ['0x1e','0b11110',true,{valueOf(){return 30}}]){
    const result=propose({mode:'polar',angleDeg,distanceMm:200})
    assert.equal(result.ok,false,`accepted angle ${String(angleDeg)}`)
    assert.equal(result.command,undefined)
  }
})

test('finite numbers, decimal strings and scientific notation still construct immutable native proposals',()=>{
  const before=structuredClone(snapshot)
  const along=propose({pointIndex:'1',a:'0',b:'1',distanceMm:'2.5e2'})
  assert.equal(along.ok,true,along.reason)
  assert.deepEqual(along.command.position,[.25,0])
  const polar=propose({mode:'polar',distanceMm:'200.0',angleDeg:'3e1'})
  assert.equal(polar.ok,true,polar.reason)
  assert.ok(Math.abs(polar.proposedMm[0]-173.2050807569)<1e-6)
  assert.equal(polar.manufacturingApproved,false)
  assert.deepEqual(snapshot,before)
})
