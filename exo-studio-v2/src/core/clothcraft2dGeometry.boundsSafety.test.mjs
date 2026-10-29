import test from 'node:test'
import assert from 'node:assert/strict'
import {getBounds} from './clothcraft2dGeometry.js'

test('2D bounds handles production-size point arrays without argument-spread overflow', () => {
  const points=Array.from({length:180000},(_,i)=>[i/100000,(i%11)/1000])
  const bounds=getBounds(points)
  assert.ok(bounds)
  assert.equal(bounds.minX,0)
  assert.equal(bounds.maxX,1.79999)
  assert.equal(bounds.minY,0)
  assert.equal(bounds.maxY,.01)
})

test('2D bounds center stays finite for large but finite same-sign coordinates', () => {
  const bounds=getBounds([[1e308,0],[1e308,1]])
  assert.equal(bounds?.cx,1e308)
  assert.equal(bounds?.cy,.5)
})

test('2D bounds rejects unrepresentable physical dimensions', () => {
  assert.equal(getBounds([[-1e308,0],[1e308,1]]),null)
})

test('2D bounds preserves normal geometry and rejects invalid points', () => {
  assert.deepEqual(getBounds([[1,2],[3,6]]),{
    minX:1,maxX:3,minY:2,maxY:6,cx:2,cy:4,width:2,height:4,
  })
  assert.equal(getBounds([[0,0],[NaN,1]]),null)
  assert.equal(getBounds([]),null)
})
