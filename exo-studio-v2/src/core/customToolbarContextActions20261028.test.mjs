import test from 'node:test'
import assert from 'node:assert/strict'
import {applyCustomToolbarPlacement20261028 as place} from './customToolbarContextActions20261028.js'

const bars=[{id:'custom-a',dock:'floating',visible:true,tools:['select','sew']},
 {id:'custom-b',dock:'right',visible:true,tools:['point']}]
test('every custom toolbar docks independently to every side without losing tools',()=>{
 for(const dock of ['left','right','top','bottom','floating']){
  const next=place(bars,'custom-a',dock)
  assert.equal(next[0].dock,dock)
  assert.equal(next[0].visible,true)
  assert.deepEqual(next[0].tools,bars[0].tools)
  assert.deepEqual(next[1],bars[1])
  assert.equal(bars[0].dock,'floating')
 }
})
test('right-click removal hides a toolbar but preserves configuration for restoration',()=>{
 const hidden=place(bars,'custom-a','hide')
 assert.equal(hidden[0].visible,false)
 assert.deepEqual(hidden[0].tools,bars[0].tools)
 const restored=place(hidden,'custom-a','bottom')
 assert.equal(restored[0].visible,true)
 assert.equal(restored[0].dock,'bottom')
})
test('invalid targets and unknown ids never mutate customization',()=>{
 assert.equal(place(bars,'custom-a','header'),bars)
 assert.deepEqual(place(bars,'unknown','left'),bars)
})
