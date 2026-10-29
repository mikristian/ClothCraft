import assert from 'node:assert/strict'
import {test} from 'node:test'
import {placePatternLabel} from './patternLabelPlacement.js'

const valid = () => [[50,50],[1,0],'side seam',1,[[51,51]],[0,0,200,150]]

test('annotation placement refuses nonfinite midpoint without producing NaN SVG coordinates',()=>{
  const args=valid()
  args[0]=[NaN,50]
  assert.throws(()=>placePatternLabel(...args),RangeError)
})

test('annotation placement refuses nonfinite normal without snapping a corrupt guide to an edge',()=>{
  const args=valid()
  args[1]=[Infinity,0]
  assert.throws(()=>placePatternLabel(...args),RangeError)
})

test('annotation placement refuses invalid zoom and overflowing label dimensions',()=>{
  for(const screenUnit of [0,-1,Infinity,1e308]){
    const args=valid()
    args[3]=screenUnit
    assert.throws(()=>placePatternLabel(...args),RangeError,`screenUnit=${screenUnit}`)
  }
})

test('valid label placement remains finite and does not mutate authored obstacles',()=>{
  const args=valid()
  const before=structuredClone(args)
  const placed=placePatternLabel(...args)
  assert.ok([placed.x,placed.y,...Object.values(placed.box)].every(Number.isFinite))
  assert.ok(Number.isInteger(placed.collisions)&&placed.collisions>=0)
  assert.deepEqual(args,before)
})
