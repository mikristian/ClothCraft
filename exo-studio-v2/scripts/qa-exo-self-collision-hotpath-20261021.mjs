// Frozen micro-fixture regression for the production browser self-collision
// broadphase. Digests below were captured BEFORE the 2026-10-21 caching and
// rejected-pair allocation optimization. These checks preserve exact particle
// displacement output; they do NOT certify cloth/cloth triangle CCD or fit.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import test from 'node:test'
import * as THREE from 'three'
import {resolveSelfCollisions} from '../src/core/physics/selfCollision.js'

const BASELINE_SHA256 = Object.freeze({
  128: '4a1e0086bd484b22753ca1c73e39c7e3d975dd07d855f8ff509f4aeb554081d1',
  640: '4409b2bad2f5f622a6fd7c81e1b09e96a4cf81c95bbb40601f0ee14bdc41f641',
  1400: '29049d880a781e25a9ab9f3efb66181e0c9615f4d93d8635c2633e9ef49d041f',
})

function fixture(count) {
  const pieces = new Map()
  for (let i = 0; i < 4; i += 1) pieces.set(`piece${i}`, {particles: []})
  const particles = []
  for (let i = 0; i < count; i += 1) {
    const pieceId = `piece${i % 4}`
    const position = new THREE.Vector3(
      (i % 19) * 0.012 + ((i * 7) % 5) * 0.0005,
      (Math.floor(i / 19) % 19) * 0.012,
      Math.floor(i / 361) * 0.011 + (i % 3) * 0.0002,
    )
    const particle = {
      simIndex: i, pieceId, position,
      invMass: i % 17 === 0 ? 0 : 1 + (i % 5) * 0.1,
      layerIndex: i % 4 === 0 ? 1 : 0,
      wrapMode: i % 7 === 0 ? 'left-arm' : '', collisionSideZ: 1,
    }
    pieces.get(pieceId).particles.push(particle)
    particles.push(particle)
  }
  return {
    particles,
    original: particles.map((p) => p.position.clone()),
    simulation: {
      pieces,
      fusedPiecePairs: new Set(['piece0|piece1']),
      collisionExclusions: new Set(['3:4', '39:40']),
    },
  }
}

function outputDigest(particles) {
  const sha = createHash('sha256')
  for (const particle of particles) {
    for (const axis of particle.position.toArray()) {
      const bytes = Buffer.allocUnsafe(8)
      bytes.writeDoubleLE(axis)
      sha.update(bytes)
    }
  }
  return sha.digest('hex')
}

for (const count of [128, 640, 1400]) {
  test(`self-collision optimized path keeps ${count} particle outputs byte-for-byte`, () => {
    const f = fixture(count)
    resolveSelfCollisions(f.simulation, 0.016)
    assert.equal(outputDigest(f.particles), BASELINE_SHA256[count])
    f.particles.forEach((p, i) => {
      assert.ok(Number.isFinite(p.position.x) && Number.isFinite(p.position.y) && Number.isFinite(p.position.z))
      if (p.invMass <= 0) assert.deepEqual(p.position.toArray(), f.original[i].toArray())
    })
    // Deterministic replay from original positions; no persistent grid state.
    f.particles.forEach((p, i) => p.position.copy(f.original[i]))
    resolveSelfCollisions(f.simulation, 0.016)
    assert.equal(outputDigest(f.particles), BASELINE_SHA256[count])
  })
}

test('minimum contact threshold is a true no-op', () => {
  const f = fixture(128)
  const before = outputDigest(f.particles)
  resolveSelfCollisions(f.simulation, 1e-6)
  assert.equal(outputDigest(f.particles), before)
})

test('legacy fused-piece exclusions preserve non-string sort/join semantics', () => {
  for (const [a,b,key] of [[null,'z','|z'],[undefined,'z','z|']]) {
    const first = {simIndex:0,pieceId:a,position:new THREE.Vector3(0,0,0),invMass:1}
    const second = {simIndex:1,pieceId:b,position:new THREE.Vector3(0.005,0,0),invMass:1}
    const simulation = {
      pieces:new Map([['A',{particles:[first]}],['B',{particles:[second]}]]),
      fusedPiecePairs:new Set([key]),
      collisionExclusions:new Set(),
    }
    resolveSelfCollisions(simulation, 0.02)
    assert.deepEqual(first.position.toArray(),[0,0,0])
    assert.deepEqual(second.position.toArray(),[0.005,0,0])
  }
})

// Informational only: machine load/JIT tiering varies; a timed microbenchmark
// is never proof of production FPS or of simulated garment quality.
if (process.argv.includes('--benchmark')) {
  for (const count of [128, 640, 1400]) {
    const f = fixture(count)
    const samples = []
    for (let i = 0; i < 26; i += 1) {
      f.particles.forEach((p, index) => p.position.copy(f.original[index]))
      const start = performance.now()
      resolveSelfCollisions(f.simulation, 0.016)
      if (i > 5) samples.push(performance.now() - start)
    }
    samples.sort((a, b) => a - b)
    console.log(JSON.stringify({count, medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * 0.95)]}))
  }
}
