import test from 'node:test'
import assert from 'node:assert/strict'
import {mirrorHalfPencilDraft} from './mirroredPencilDraft.js'

test('mirrors a curved half panel around its first/last point fold line',()=>{
  const half=[[0,0],[.25,.06],[.3,.7],[0,1]]
  const tangents=[[0,0],[.05,.1],[-.02,.1],[0,0]]
  const output=mirrorHalfPencilDraft(half,tangents)
  assert.deepEqual(output.axis,[[0,0],[0,1]])
  assert.deepEqual(output.points,[[0,0],[.25,.06],[.3,.7],[0,1],[-.3,.7],[-.25,.06]])
  assert.equal(output.points.length,output.tangents.length)
  assert.deepEqual(output.tangents[4],[-.02,-.1])
  assert.ok(Math.abs(output.area)>.1)
})

test('supports diagonal centerlines without changing metric scale',()=>{
  const contour=mirrorHalfPencilDraft([[0,0],[.1,.4],[1,1]])
  assert.ok(contour)
  assert.ok(Math.abs(contour.points[3][0]-.4)<1e-10)
  assert.ok(Math.abs(contour.points[3][1]-.1)<1e-10)
})

test('rejects degenerate folds and nonfinite geometry',()=>{
  assert.equal(mirrorHalfPencilDraft([[0,0],[1,1],[0,0]]),null)
  assert.equal(mirrorHalfPencilDraft([[0,0],[Infinity,2],[0,1]]),null)
  assert.equal(mirrorHalfPencilDraft([[0,0],[0,.5],[0,1]]),null)
})
