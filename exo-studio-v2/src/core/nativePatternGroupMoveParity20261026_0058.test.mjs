// EXO2D-013: independent adversarial JS/Rust transform-parity contract.
// Source-only. No native session, browser, garment writes, or installed-app work.
// Red cases are intentional until the owner resolves the integration contract.
import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePatternGroupMove20261025 as plan} from './nativePatternGroupMove20261025.js'

const panel = (id, origin, rotation=0) => ({
  id, layout_2d:origin, layout_rotation_degrees:rotation,
  pattern:{width:.3},
})

test('EXO2D-013 control: explicit metric origins and numeric rotations translate identically',()=>{
  const source={panels:[panel('front',[0,0],45),panel('back',[.45,0],-90)]}
  const before=structuredClone(source)
  const result=plan(source,['front','back'],[.025,-.05])
  assert.equal(result.ok,true)
  assert.deepEqual(result.commands,[
    {kind:'BoardTransform',panel:'front',origin:[.025,-.05],rotation_degrees:45},
    {kind:'BoardTransform',panel:'back',origin:[.45+.025,-.05],rotation_degrees:-90},
  ])
  assert.deepEqual(source,before)
})

test('EXO2D-013 negative: string rotation is rejected, not silently coerced to degrees',()=>{
  const source={panels:[panel('front',[0,0],'45'),panel('back',[.45,0],0)]}
  const before=structuredClone(source)
  const result=plan(source,['front','back'],[.025,0])
  assert.equal(result.ok,false,'Unvalidated string rotation crosses the numeric Rust command boundary')
  assert.equal(result.commands,undefined)
  assert.deepEqual(source,before)
})

test('EXO2D-013 negative: boolean rotation is rejected, not coerced to 1 degree',()=>{
  const source={panels:[panel('front',[0,0],true),panel('back',[.45,0],0)]}
  const result=plan(source,['front','back'],[.025,0])
  assert.equal(result.ok,false,'Boolean is not a valid physical angle')
  assert.equal(result.commands,undefined)
})

test('EXO2D-013 parity: native implicit layout is resolved before transforming',()=>{
  // Rust authoring::layout(template, index) derives the second panel's origin
  // from the first panel width + 0.15m when layout_2d is absent.
  const source={panels:[
    {id:'front',pattern:{width:.3}},
    {id:'back',pattern:{width:.2}},
  ]}
  const before=structuredClone(source)
  const result=plan(source,['front','back'],[.025,-.05])
  assert.equal(result.ok,true,'Planner and Rust must agree on absent layout_2d before native edit-batch')
  assert.deepEqual(result.commands,[
    {kind:'BoardTransform',panel:'front',origin:[.025,-.05],rotation_degrees:0},
    {kind:'BoardTransform',panel:'back',origin:[.3+.15+.025,-.05],rotation_degrees:0},
  ])
  assert.deepEqual(source,before)
})
