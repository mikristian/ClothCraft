import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { resolveSelfCollisions } from './selfCollision.js'

function makeParticle(simIndex, invMass, x) {
  return {
    simIndex,
    invMass,
    position: new THREE.Vector3(x, 0, 0),
    pieceId: `piece-${simIndex}`,
    layerIndex: 0,
  }
}

test('self collisions separate movable cloth from pinned cloth for either index order', () => {
  for (const pinIndex of [0, 1]) {
    const pinned = makeParticle(pinIndex, 0, 0)
    const free = makeParticle(1 - pinIndex, 1, 0.002)
    const simulation = { pieces: new Map([['cloth', { particles: [pinned, free] }]]) }
    resolveSelfCollisions(simulation, 0.01)
    assert.equal(pinned.position.x, 0, 'fixed particle must remain fixed')
    assert.ok(free.position.x >= 0.0099, `contact was missed with pin index ${pinIndex}`)
  }
})

test('two pinned particles remain unchanged after collision resolution', () => {
  const a = makeParticle(0, 0, 0)
  const b = makeParticle(1, 0, 0.002)
  resolveSelfCollisions({ pieces: new Map([['cloth', { particles: [a, b] }]]) }, 0.01)
  assert.equal(a.position.x, 0)
  assert.equal(b.position.x, 0.002)
})

test('invalid self-collision distances fail before modifying garment particles', () => {
  const a = makeParticle(0, 1, 0)
  const b = makeParticle(1, 1, 0.002)
  const simulation = { pieces: new Map([['cloth', { particles: [a, b] }]]) }
  for (const distance of [NaN, Infinity, -Infinity, -0.01]) {
    assert.throws(() => resolveSelfCollisions(simulation, distance), RangeError)
    assert.equal(a.position.x, 0)
    assert.equal(b.position.x, 0.002)
  }
})

test('invalid particle data fails before partial collision resolution', () => {
  const a = makeParticle(0, 1, 0)
  const b = makeParticle(1, 1, 0.002)
  const c = makeParticle(2, 1, NaN)
  const simulation = { pieces: new Map([['cloth', { particles: [a, b, c] }]]) }
  assert.throws(() => resolveSelfCollisions(simulation, 0.01), /Invalid self-collision particle state/)
  assert.equal(a.position.x, 0)
  assert.equal(b.position.x, 0.002)
})
