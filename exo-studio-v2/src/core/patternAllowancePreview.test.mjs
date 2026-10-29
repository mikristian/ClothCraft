import test from 'node:test'
import assert from 'node:assert/strict'
import {seamAllowancePreviewPoints} from './patternAllowancePreview.js'

const near=(actual,expected,epsilon=1e-9)=>
  assert.ok(Math.abs(actual-expected)<=epsilon,`expected ${actual} ≈ ${expected}`)
const pointNear=(actual,expected)=>{
  near(actual[0],expected[0])
  near(actual[1],expected[1])
}

test('straight and bent seam allowances preserve millimetre offsets and join at miter',()=>{
  const width=.01 // 10 mm in saved garment material metres
  const straight=seamAllowancePreviewPoints([[0,0],[.2,0],[.4,0]],width)
  straight.forEach((point,index)=>pointNear(point,[[0,-width],[.2,-width],[.4,-width]][index]))
  const corner=seamAllowancePreviewPoints([[0,0],[.2,0],[.2,.2]],width)
  assert.equal(corner.length,3)
  pointNear(corner[0],[0,-.01])
  pointNear(corner[1],[.21,-.01]) // true right-hand offset-line intersection
  pointNear(corner[2],[.21,.2])
})

test('high curvature caps miter spikes with a finite local bevel',()=>{
  const path=[[0,0],[.2,0],[.001,.002]]
  const offset=seamAllowancePreviewPoints(path,.01,{miterLimit:4})
  assert.equal(offset.length,4)
  offset.forEach(point=>point.forEach(value=>assert.ok(Number.isFinite(value))))
  // Both replacement points are exactly 10mm from the source vertex.
  near(Math.hypot(offset[1][0]-.2,offset[1][1]),.01)
  near(Math.hypot(offset[2][0]-.2,offset[2][1]),.01)
})

test('duplicate tessellation points do not generate NaNs or change endpoints',()=>{
  const path=[[0,0],[0,0],[.3,0],[.3,0],[.3,.2]]
  const actual=seamAllowancePreviewPoints(path,.015)
  const expected=seamAllowancePreviewPoints([[0,0],[.3,0],[.3,.2]],.015)
  assert.deepEqual(actual,expected)
  assert.deepEqual(seamAllowancePreviewPoints([[0,0],[NaN,1],[.2,0]],.01),[])
  assert.deepEqual(seamAllowancePreviewPoints([[0,0]],.01),[])
  assert.deepEqual(seamAllowancePreviewPoints([[0,0],[.2,0]],-1),[])
})

test('preview computation preserves caller geometry and authored width',()=>{
  const path=[[0,0],[.1,0],[.1,.1]]
  const snapshot=structuredClone(path)
  const result=seamAllowancePreviewPoints(path,.012)
  assert.deepEqual(path,snapshot)
  assert.equal(result.length,3)
  pointNear(result[1],[.112,-.012])
})
