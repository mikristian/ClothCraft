import {test} from 'node:test'
import assert from 'node:assert/strict'
import {shapeBuilderWorldToMaterial} from './shapeBuilderCoordinateAdapter.js'

test('sparse stroke point slots cannot become native cutting coordinates',()=>{
  const points=Array(2)
  assert.equal(shapeBuilderWorldToMaterial(points,[0,0]),null)
})

test('sparse stroke coordinate slots cannot become native cutting coordinates',()=>{
  assert.equal(shapeBuilderWorldToMaterial([[0,0],Array(2)],[0,0]),null)
  assert.equal(shapeBuilderWorldToMaterial([[0,0],[,1]],[0,0]),null)
})

test('sparse layout coordinate slots cannot become native cutting coordinates',()=>{
  assert.equal(shapeBuilderWorldToMaterial([[0,0],[1,1]],Array(2)),null)
})

test('finite inputs whose world-to-material subtraction overflows fail closed',()=>{
  assert.equal(shapeBuilderWorldToMaterial([[1e308,0],[-1e308,0]],[-1e308,0]),null)
})

test('nonfinite rotated outputs and overflowed angle conversions fail closed',()=>{
  assert.equal(shapeBuilderWorldToMaterial([[1.5e308,1.5e308],[-1.5e308,-1.5e308]],[0,0],45),null)
  assert.equal(shapeBuilderWorldToMaterial([[0,0],[1,1]],[0,0],1e308),null)
})

test('ordinary inverse transform remains finite without changing source geometry',()=>{
  const points=[[2,3],[1.4,3]],layout=[2,3]
  const before=structuredClone({points,layout})
  const output=shapeBuilderWorldToMaterial(points,layout,90)
  assert.equal(output.length,2)
  assert.ok(output.every(p=>p.length===2&&p.every(Number.isFinite)))
  assert.ok(Math.abs(output[1][1]-.6)<1e-12)
  assert.deepEqual({points,layout},before)
})
