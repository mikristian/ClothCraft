import test from 'node:test'
import assert from 'node:assert/strict'
import {freeTangentDragDelta} from './freeTangentDrag.js'
test('Free knot incoming/outgoing handle follows real pointer delta in material coordinates',()=>{
 const delta=[.02,-.01]
 assert.deepEqual(freeTangentDragDelta(delta,'out'),[delta[0]/.18,delta[1]/.18])
 assert.deepEqual(freeTangentDragDelta(delta,'in'),[delta[0]/(-.18),delta[1]/(-.18)])
 for(const side of ['in','out']){
  const sign=side==='in'?-1:1
  const derivativeDelta=freeTangentDragDelta(delta,side)
  assert(Math.abs(derivativeDelta[0]*sign*.18-delta[0])<1e-12)
  assert(Math.abs(derivativeDelta[1]*sign*.18-delta[1])<1e-12)
 }
})
test('Invalid free-knot handle drags fail closed',()=>{
 assert.equal(freeTangentDragDelta([NaN,0],'in'),null)
 assert.equal(freeTangentDragDelta([0,Infinity],'out'),null)
 assert.equal(freeTangentDragDelta([.1],'out'),null)
 assert.equal(freeTangentDragDelta([.1,.2],'unknown'),null)
})
