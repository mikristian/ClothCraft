import assert from 'node:assert/strict'
import {
  cutlinePoints, projectFreeSewingPoint, freeSewingRangePoints,
  freeSewingPointAtFraction,
} from '../src/core/freeSewingGeometry.js'

const indices=[0,1,2]
const uv=[[0,0],[.1,0],[.1,.1]]
assert.deepEqual(cutlinePoints(indices,uv),uv)
const projected=projectFreeSewingPoint(indices,uv,[.11,.05])
assert.ok(projected)
assert.ok(Math.abs(projected.fraction-.75)<1e-10)
assert.ok(Math.abs(projected.lengthMetres-.2)<1e-10)
const atThreeQuarters=freeSewingPointAtFraction(indices,uv,.75)
assert.ok(Math.abs(atThreeQuarters[0]-.1)<1e-10)
assert.ok(Math.abs(atThreeQuarters[1]-.05)<1e-10)
const range=freeSewingRangePoints(indices,uv,.2,.8)
assert.equal(range.length,3)
assert.deepEqual(range[1],[.1,0])

for (const [name, badIndices, badPositions] of [
  ['missing middle',indices,[[0,0],null,[.1,.1]]],
  ['missing first',indices,[undefined,[.1,0],[.1,.1]]],
  ['missing last',indices,[[0,0],[.1,0]]],
  ['NaN coordinate',indices,[[0,0],[NaN,0],[.1,.1]]],
  ['infinite coordinate',indices,[[0,0],[Infinity,0],[.1,.1]]],
  ['negative index',[0,-1,2],uv],
  ['fractional index',[0,.5,2],uv],
  ['missing index',[0,undefined,2],uv],
  ['missing position array',indices,undefined],
  ['missing indices',undefined,uv],
]) {
  assert.deepEqual(cutlinePoints(badIndices,badPositions),[],name)
  assert.equal(projectFreeSewingPoint(badIndices,badPositions,[.1,.05]),null,name)
  assert.deepEqual(freeSewingRangePoints(badIndices,badPositions,0,1),[],name)
  assert.equal(freeSewingPointAtFraction(badIndices,badPositions,.5),null,name)
}

console.log('PASS free sewing cutline integrity: valid arclength, invalid data fail closed')
