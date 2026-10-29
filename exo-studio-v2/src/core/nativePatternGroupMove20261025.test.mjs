import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePatternGroupMove20261025} from './nativePatternGroupMove20261025.js'

const template={panels:[
  {id:'front',layout_2d:[1,2],layout_rotation_degrees:15,polygon:{points:[[0,0]]}},
  {id:'back',layout_2d:[3,4],layout_rotation_degrees:330,polygon:{points:[[1,0]]}},
  {id:'sleeve',layout_2d:[5,6],layout_rotation_degrees:0},
]}

test('multi-move translates only selected native panel origins while retaining rotation',()=>{
  const before=structuredClone(template)
  const result=planNativePatternGroupMove20261025(template,['front','back'],[.25,-.5])
  assert.equal(result.ok,true)
  assert.deepEqual(result.commands,[
    {kind:'BoardTransform',panel:'front',origin:[1.25,1.5],rotation_degrees:15},
    {kind:'BoardTransform',panel:'back',origin:[3.25,3.5],rotation_degrees:330},
  ])
  assert.deepEqual(template,before)
})
test('invalid, missing or duplicate selection fails closed before any native edit',()=>{
  for(const ids of [['front','missing'],['front','front'],['front']])
    assert.equal(planNativePatternGroupMove20261025(template,ids,[.1,.2]).ok,false)
  for(const delta of [[NaN,0],[Infinity,0],[.1]])
    assert.equal(planNativePatternGroupMove20261025(template,['front','back'],delta).ok,false)
})
