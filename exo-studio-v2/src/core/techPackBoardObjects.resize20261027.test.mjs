import test from 'node:test'
import assert from 'node:assert/strict'
import {boardObjectResize} from './techPackBoardObjects.js'
test('all resize handles anchor the opposite edges',()=>{
 for(const h of ['nw','n','ne','e','se','s','sw','w']){
  const old={x:20,y:30,scaleX:1,scaleY:1},v=boardObjectResize(old,[20,10],[200,100],h)
  assert.equal(v.x+(h.includes('w')?200*v.scaleX:0),h.includes('w')?220:20)
  assert.equal(v.y+(h.includes('n')?100*v.scaleY:0),h.includes('n')?130:30)
 }
})
test('proportional corners preserve ratio and scale limits',()=>{
 for(const h of ['nw','ne','se','sw'])for(const d of [[40,10],[5000,5000],[-5000,-5000]]){
  const v=boardObjectResize({scaleX:2,scaleY:1},d,[200,100],h,true)
  assert.equal(v.scaleX/v.scaleY,2);assert.ok(v.scaleX<=3&&v.scaleY>=.25)
 }
})
