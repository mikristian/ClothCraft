import test from 'node:test'
import assert from 'node:assert/strict'
import {resizeTechPackGroup} from './techPackGroupResize.js'

const items=[
  {id:'front',x:100,y:100,width:100,height:100,baseWidth:100,baseHeight:100,value:{x:0,y:0,scaleX:1,scaleY:1}},
  {id:'back',x:220,y:100,width:100,height:100,baseWidth:100,baseHeight:100,value:{x:0,y:0,scaleX:1,scaleY:1}},
]

test('west handle grows both members outward while keeping right edge fixed',()=>{
  const result=resizeTechPackGroup(items,'front',{}, {scaleX:1.4,scaleY:1},'w')
  assert(result.front.scaleX>1)
  assert(result.back.scaleX>1)
  assert(result.front.x<0)
  assert.equal(result.back.x+220+100*result.back.scaleX,320)
  assert.equal(result.front.scaleY,1)
})

test('north handle grows upward, preserves bottom edge and horizontal scale',()=>{
  const result=resizeTechPackGroup(items,'front',{}, {scaleX:1,scaleY:1.3},'n')
  assert(result.front.scaleY>1)
  assert(result.back.scaleY>1)
  assert.equal(result.front.y+100+100*result.front.scaleY,200)
  assert.equal(result.back.scaleX,1)
})

test('east-only handle cannot change vertical scale of any member',()=>{
  const result=resizeTechPackGroup(items,'front',{}, {scaleX:1.2,scaleY:1},'e')
  assert.equal(result.front.scaleY,1)
  assert.equal(result.back.y,0)
  assert(result.back.x>0)
})
