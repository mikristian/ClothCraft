import test from 'node:test'
import assert from 'node:assert/strict'
import {sampleGuideHalfCurve} from './patternGuideHalfCurves.js'

test('left and right interval curves retain their real shared center node',()=>{
  const left=sampleGuideHalfCurve([0,.42],[.25,.42],[0,-.035])
  const right=sampleGuideHalfCurve([.25,.42],[.5,.42],[0,0])
  assert.deepEqual(left.points.at(-1),right.points[0])
  assert.equal(right.points[14][1],.42)
  assert(left.points[14][1]<.42)
  assert.deepEqual(left.points[0],[0,.42])
  assert.deepEqual(right.points.at(-1),[.5,.42])
})
test('rotated paper coordinates preserve material-space bend',()=>{
  const guide=sampleGuideHalfCurve([0,0],[1,0],[0,.12],Math.PI/2)
  assert(Math.abs(guide.control[0]-.38)<1e-8)
  assert(Math.abs(guide.control[1])<1e-8)
  assert.deepEqual(guide.points[0],[0,0])
  assert.deepEqual(guide.points.at(-1),[1,0])
})
test('nonfinite or invalid curve coordinates fail without invented points',()=>{
  assert.equal(sampleGuideHalfCurve([0,0],[1,1],[Infinity,0]),null)
  assert.equal(sampleGuideHalfCurve([0,0],[NaN,1]),null)
})
