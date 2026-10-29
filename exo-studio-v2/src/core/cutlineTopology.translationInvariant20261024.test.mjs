import assert from 'node:assert/strict'
import {test} from 'node:test'
import {inspectCutlinePolygon} from './cutlineTopology.js'

const square = [
  {x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:0,y:1},
]

test('physical cutline area remains correct after large finite translation', () => {
  const translated = square.map(({x,y}) => ({x:x+1e9,y:y-1e9}))
  const before = structuredClone(translated)
  const result = inspectCutlinePolygon(translated)
  assert.equal(result.ok, true, JSON.stringify(result.faults))
  assert.equal(result.areaCm2, 1)
  assert.deepEqual(translated, before, 'QA must not change authored cutline points')
})

test('unrepresentable cutline area fails closed instead of reporting approval', () => {
  const huge = square.map(({x,y}) => ({x:(x+1)*1e200,y:(y+1)*1e200}))
  const result = inspectCutlinePolygon(huge)
  assert.equal(result.ok, false)
  assert.ok(result.faults.some(fault => fault.code === 'CUTLINE_AREA_NONFINITE'))
  assert.ok(Number.isFinite(result.areaCm2))
})

test('ordinary and clockwise physical contours retain correct area', () => {
  for (const contour of [square, [...square].reverse()]) {
    assert.deepEqual(inspectCutlinePolygon(contour), {ok:true,areaCm2:1,faults:[]})
  }
})
