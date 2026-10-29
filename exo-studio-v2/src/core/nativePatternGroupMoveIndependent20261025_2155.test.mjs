// EXO2D-013 independent source-only contract checks. No native garment writes.
import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePatternGroupMove20261025 as plan} from './nativePatternGroupMove20261025.js'

const fixture=()=>({revision:42,panels:[
  {id:'front',layout_2d:[0.12,-0.34],layout_rotation_degrees:90,polygon:{points:[[0,0],[1,0],[0,1]]}},
  {id:'back',layout_2d:[-1.1,2.2],layout_rotation_degrees:-45,polygon:{points:[[0,0],[1,0],[0,1]]}},
  {id:'sleeve',layout_2d:[4.4,5.5],layout_rotation_degrees:0,polygon:{points:[[0,0],[1,0],[0,1]]}},
  {id:'cuff',layout_2d:[6.6,7.7],layout_rotation_degrees:180,polygon:{points:[[0,0],[1,0],[0,1]]}},
]})

test('EXO2D-013: three selected pieces share exactly one metric delta; unselected geometry is untouched',()=>{
  const garment=fixture(),original=structuredClone(garment)
  const moved=plan(garment,['front','sleeve','cuff'],[0.5,-0.125])
  assert.equal(moved.ok,true)
  assert.deepEqual(moved.commands.map(c=>c.panel),['front','sleeve','cuff'])
  for(const command of moved.commands){
    const source=garment.panels.find(p=>p.id===command.panel)
    assert.equal(command.kind,'BoardTransform')
    assert.deepEqual(command.origin.map((value,i)=>Number((value-source.layout_2d[i]).toFixed(9))),[0.5,-0.125])
    assert.equal(command.rotation_degrees,source.layout_rotation_degrees)
    assert.deepEqual(Object.keys(command).sort(),['kind','origin','panel','rotation_degrees'])
  }
  assert(!moved.commands.some(c=>c.panel==='back'))
  assert.deepEqual(garment,original)
})

test('EXO2D-013: missing, duplicate and oversized selections fail atomically',()=>{
  const garment=fixture()
  for(const selection of [['front','missing'],['front','front'],['front'],[],
    Array.from({length:257},(_,i)=>`id-${i}`),['front',null]]){
    const result=plan(garment,selection,[0.1,0.2])
    assert.equal(result.ok,false,`Selection ${JSON.stringify(selection)} must fail`)
    assert.equal(result.commands,undefined)
  }
})

test('EXO2D-013: nonfinite physical deltas, malformed origins and overflow never emit partial commands',()=>{
  const garment=fixture()
  for(const delta of [[NaN,0],[0,Infinity],[0,-Infinity],[1],[],[1,2,3],[0,'0.1'],null]){
    const result=plan(garment,['front','back'],delta)
    assert.equal(result.ok,false)
    assert.equal(result.commands,undefined)
  }
  for(const bad of [[1],['1',2],[NaN,0],[Infinity,0],null]){
    const changed=fixture();changed.panels[1].layout_2d=bad
    const result=plan(changed,['front','back'],[0.1,0.2])
    assert.equal(result.ok,false)
    assert.equal(result.commands,undefined)
  }
  const overflowing=fixture();overflowing.panels[1].layout_2d=[1e308,0]
  assert.equal(plan(overflowing,['front','back'],[1e308,0]).ok,false)
})

test('EXO2D-013: missing native source and invalid rotation fail before any command',()=>{
  assert.equal(plan(null,['front','back'],[1,1]).ok,false)
  for(const rotation of [Infinity,NaN,'not-an-angle']){
    const changed=fixture();changed.panels[1].layout_rotation_degrees=rotation
    const result=plan(changed,['front','back'],[0.1,0.2])
    assert.equal(result.ok,false)
    assert.equal(result.commands,undefined)
  }
})
