import assert from 'node:assert/strict'
import {recognizeFabricPinch,nextFabricHandState} from '../src/core/cameraFabricHandGesture.js'

const hand=Array.from({length:21},()=>({x:.5,y:.5}))
hand[0]={x:.5,y:.8};hand[9]={x:.5,y:.5};hand[5]={x:.43,y:.53};hand[17]={x:.66,y:.53}
hand[4]={x:.48,y:.38};hand[8]={x:.52,y:.39}
const first=recognizeFabricPinch(hand,false)
assert.equal(first.pinched,true)
assert.ok(Math.abs(first.x-.48)<1e-9)
assert.equal(first.tracking,undefined)
hand[4]={x:.40,y:.38};hand[8]={x:.57,y:.39}
assert.equal(recognizeFabricPinch(hand,true).pinched,false)
hand[4]={x:.43,y:.38};hand[8]={x:.56,y:.39}
assert.equal(recognizeFabricPinch(hand,false).pinched,false)
assert.equal(recognizeFabricPinch(hand,true).pinched,true,'hysteresis avoids grab flicker')
assert.equal(recognizeFabricPinch([],true),null)
assert.equal(nextFabricHandState({pinched:true,x:.5,y:.5},null).pinched,false)
console.log('PASS camera pinch normalization, tracking release and hysteresis')
