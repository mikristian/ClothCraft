import {test} from 'node:test'
import assert from 'node:assert/strict'
import {shapeBuilderWorldToMaterial} from './shapeBuilderCoordinateAdapter.js'

test('translates live board Pen stroke into local native garment metres',()=>{
  const local=shapeBuilderWorldToMaterial([[1.2,2.5],[1.7,2.5]],[1,2])
  assert.ok(local)
  assert.ok(Math.abs(local[0][0]-.2)<1e-12)
  assert.ok(Math.abs(local[1][0]-.7)<1e-12)
  assert.equal(local[0][1],.5)
  assert.equal(local[1][1],.5)
})
test('inverts panel layout rotation instead of cutting the wrong piece',()=>{
  const points=shapeBuilderWorldToMaterial([[2,3],[1.4,3]],[2,3],90)
  assert.ok(points)
  assert.ok(Math.abs(points[1][0])<1e-12)
  assert.ok(Math.abs(points[1][1]-.6)<1e-12)
})
test('refuses stale/invalid shape builder geometry and incomplete paths',()=>{
  assert.equal(shapeBuilderWorldToMaterial([[0,0]],[0,0]),null)
  assert.equal(shapeBuilderWorldToMaterial([[0,0],[Infinity,0]],[0,0]),null)
  assert.equal(shapeBuilderWorldToMaterial([[0,0],[1,1]],null),null)
})
