import assert from 'node:assert/strict'
import {test} from 'node:test'
import {placePatternLabel} from './patternLabelPlacement.js'

const valid=()=>[[50,50],[1,0],'side seam',1,[[51,51]],[0,0,200,150]]

test('sparse midpoint components fail closed before emitting SVG label coordinates',()=>{
  for(const midpoint of [[,50],[50,,]]){
    const args=valid()
    args[0]=midpoint
    assert.throws(()=>placePatternLabel(...args),RangeError)
  }
})

test('sparse normal components fail closed instead of generating NaN candidates',()=>{
  for(const normal of [[,0],[1,,]]){
    const args=valid()
    args[1]=normal
    assert.throws(()=>placePatternLabel(...args),RangeError)
  }
})

test('sparse view bounds fail closed rather than accepting incomplete layout frames',()=>{
  for(let index=0;index<4;index++){
    const args=valid()
    delete args[5][index]
    assert.throws(()=>placePatternLabel(...args),RangeError)
  }
})

test('ordinary labels remain finite and input coordinates are unchanged',()=>{
  const args=valid()
  const before=structuredClone(args)
  const label=placePatternLabel(...args)
  assert.ok([label.x,label.y,...Object.values(label.box)].every(Number.isFinite))
  assert.deepEqual(args,before)
})
