import assert from 'node:assert/strict'
import {test} from 'node:test'
import {inspectCutlinePolygon} from './cutlineTopology.js'

const square = [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]

for (const missingIndex of [0,1,3]) {
 test(`sparse cutline vertex ${missingIndex} fails closed without changing input`, () => {
  const points = square.map(point => ({...point}))
  delete points[missingIndex]
  const original = structuredClone(points)
  const result = inspectCutlinePolygon(points)
  assert.equal(result.ok,false)
  assert.equal(result.areaCm2,0)
  assert.ok(result.faults.some(fault => fault.code === 'CUTLINE_NONFINITE'))
  assert.deepEqual(points,original)
 })
}

test('dense valid cutline remains accepted with accurate area', () => {
 const points = structuredClone(square)
 assert.deepEqual(inspectCutlinePolygon(points),{ok:true,areaCm2:1,faults:[]})
 assert.deepEqual(points,square)
})
