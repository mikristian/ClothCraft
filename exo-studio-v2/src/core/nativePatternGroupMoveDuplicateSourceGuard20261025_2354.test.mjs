// EXO2D-013 negative-path regression: duplicate source IDs must never resolve
// to an arbitrary last panel. Source-only; no garment session or UI writes.
import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePatternGroupMove20261025 as plan} from './nativePatternGroupMove20261025.js'

const panel=(id,x)=>({id,layout_2d:[x,0],layout_rotation_degrees:0})

test('duplicate selected source panel IDs reject the entire transform',()=>{
  const source={revision:5,panels:[panel('front',1),panel('back',2),panel('front',999)]}
  const before=structuredClone(source)
  const result=plan(source,['front','back'],[.25,.5])
  assert.equal(result.ok,false,'Ambiguous source must not silently use the last duplicate')
  assert.equal(result.commands,undefined,'Never issue a partial native edit-batch')
  assert.deepEqual(source,before,'Failed validation must not modify the garment')
})

test('duplicate unselected source IDs also fail closed before a native write',()=>{
  const source={panels:[panel('front',1),panel('back',2),panel('sleeve',3),panel('sleeve',4)]}
  const result=plan(source,['front','back'],[.25,.5])
  assert.equal(result.ok,false)
  assert.equal(result.commands,undefined)
})

test('missing or invalid source panel IDs reject the batch',()=>{
  for(const bad of [undefined,null,'', '  ',123]){
    const source={panels:[panel('front',1),panel('back',2),panel(bad,3)]}
    const result=plan(source,['front','back'],[.25,.5])
    assert.equal(result.ok,false,`Bad source ID ${String(bad)} must fail`)
    assert.equal(result.commands,undefined)
  }
})

test('unique source IDs still produce a stable, ordered two-piece translation',()=>{
  const source={panels:[panel('front',1),panel('back',2),panel('sleeve',3)]}
  const result=plan(source,['back','front'],[-.25,.5])
  assert.equal(result.ok,true)
  assert.deepEqual(result.commands,[
    {kind:'BoardTransform',panel:'back',origin:[1.75,.5],rotation_degrees:0},
    {kind:'BoardTransform',panel:'front',origin:[.75,.5],rotation_degrees:0},
  ])
})
