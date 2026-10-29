import test from 'node:test'
import assert from 'node:assert/strict'
import{nextTechPackZoom,resolvedTechPackZoom,techPackZoomKey}from './techPackCanvasZoom.js'

test('command plus, minus and zero zoom an active techpack sheet',()=>{
  const key=(code,key,more={})=>techPackZoomKey({metaKey:true,code,key,repeat:false,altKey:false,...more})
  assert.equal(key('Equal','+'),'in')
  assert.equal(key('Equal','='),'in')
  assert.equal(key('Minus','-'),'out')
  assert.equal(key('Digit0','0'),'reset')
  assert.equal(key('Equal','+', {metaKey:false}),null)
  assert.equal(key('Equal','+', {target:{closest:()=>true}}),null)
  assert.equal(nextTechPackZoom('1','in'),'1.25')
  assert.equal(nextTechPackZoom('1.25','out'),'1')
  assert.equal(nextTechPackZoom('2.5','in'),'2.5')
  assert.equal(nextTechPackZoom('.5','out'),'0.5')
  assert.equal(nextTechPackZoom('1.5','reset'),'1')
  assert.equal(nextTechPackZoom('fit','in',900,true),'1.25')
  assert.equal(resolvedTechPackZoom('fit',900,true),804/792)
})
