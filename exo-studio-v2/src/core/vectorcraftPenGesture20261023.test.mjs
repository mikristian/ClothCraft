import test from 'node:test'
import assert from 'node:assert/strict'
import {penTangent, penCubicPath} from './vectorcraftPenGesture20261023.js'
test('click makes a corner; drag makes a tangent; option breaks it', () => {
  assert.deepEqual(penTangent([0,0],[.001,0]),[0,0])
  assert.deepEqual(penTangent([0,0],[1,2]),[1,2])
  assert.deepEqual(penTangent([0,0],[1,2],{alt:true}),[0,0])
})
test('shift constrains handle angle and preview preserves cubic geometry', () => {
  const t=penTangent([0,0],[2,1],{shift:true})
  assert.ok(Math.abs(t[0]-t[1])<1e-9)
  assert.match(penCubicPath([[0,0],[2,2]],[[1,0],[0,1]],[3,3]),/C 1 0 2 1 2 2 C 2 3 3 3 3 3/)
})
