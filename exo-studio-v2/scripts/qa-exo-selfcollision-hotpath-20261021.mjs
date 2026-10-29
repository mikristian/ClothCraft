// Baseline locked before the 2026-10-21 allocation/broadphase micro-optimization.
// Changes to physical semantics require explicit fixture review, not new hashes.
// Run: node scripts/qa-exo-selfcollision-hotpath-20261021.mjs [--bench]
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {existsSync, readFileSync} from 'node:fs'
import {performance} from 'node:perf_hooks'
import * as THREE from 'three'
import {resolveSelfCollisions} from '../src/core/physics/selfCollision.js'
import {
  initializeRustSelfCollisionKernel,
  selfCollisionPairScalars,
  selfCollisionPairScalarsInto,
} from '../src/core/rustSelfCollisionKernel.js'

const GOLDEN = new Map([
  [128, '4a1e0086bd484b22753ca1c73e39c7e3d975dd07d855f8ff509f4aeb554081d1'],
  [640, '4409b2bad2f5f622a6fd7c81e1b09e96a4cf81c95bbb40601f0ee14bdc41f641'],
  [1400, '29049d880a781e25a9ab9f3efb66181e0c9615f4d93d8635c2633e9ef49d041f'],
])

function fixture(count) {
  const pieces = new Map()
  for (let q = 0; q < 4; q += 1) pieces.set(`piece${q}`, {particles: []})
  const particles = []
  for (let i = 0; i < count; i += 1) {
    const pieceId = `piece${i % 4}`
    const particle = {
      simIndex: i,
      pieceId,
      position: new THREE.Vector3(
        (i % 19) * 0.012 + ((i * 7) % 5) * 0.0005,
        (Math.floor(i / 19) % 19) * 0.012,
        Math.floor(i / 361) * 0.011 + (i % 3) * 0.0002,
      ),
      invMass: i % 17 === 0 ? 0 : 1 + (i % 5) * 0.1,
      layerIndex: i % 4 === 0 ? 1 : 0,
      wrapMode: i % 7 === 0 ? 'left-arm' : '',
      collisionSideZ: 1,
    }
    pieces.get(pieceId).particles.push(particle)
    particles.push(particle)
  }
  return {
    simulation: {
      pieces,
      fusedPiecePairs: new Set(['piece0|piece1']),
      collisionExclusions: new Set(['3:4', '39:40']),
    },
    particles,
    initialPositions: particles.map(particle => particle.position.clone()),
  }
}

function positionHash(particles) {
  const hash = createHash('sha256')
  for (const particle of particles) {
    for (const component of particle.position.toArray()) {
      const bytes = Buffer.allocUnsafe(8)
      bytes.writeDoubleLE(component)
      hash.update(bytes)
    }
  }
  return hash.digest('hex')
}

for (const [count, golden] of GOLDEN) {
  const {simulation, particles, initialPositions} = fixture(count)
  resolveSelfCollisions(simulation, 0.016)
  assert.equal(positionHash(particles), golden, `${count} particle baseline positions changed`)
  for (let i = 0; i < particles.length; i += 1) {
    if (particles[i].invMass <= 0) assert.ok(
      particles[i].position.equals(initialPositions[i]),
      `pinned particle ${i} moved`,
    )
  }
  console.log(`PASS ${count} particles: bit-identical pre-optimization positions; pinned state preserved`)
  if (!process.argv.includes('--bench')) continue

  const samples = []
  for (let repeat = 0; repeat < 26; repeat += 1) {
    for (let i = 0; i < count; i += 1) particles[i].position.copy(initialPositions[i])
    const begin = performance.now()
    resolveSelfCollisions(simulation, 0.016)
    if (repeat > 5) samples.push(performance.now() - begin)
  }
  samples.sort((a, b) => a - b)
  console.log(`BENCH ${count} particles: median ${samples[Math.floor(samples.length / 2)].toFixed(3)} ms; noisy local run, NOT an app FPS claim`)
}

function checkScratchParity(backend) {
  const scratch = new Float64Array(7)
  for (let i = 0; i < 1024; i += 1) {
    const args = [0.016, i % 31 === 0 ? Number.NaN : (i % 17) * 0.00001,
      i % 5 === 0 ? 0 : (i % 7) * 0.3,
      i % 11 === 0 ? 0 : (i % 9) * 0.2, i % 3, (i + 1) % 3]
    const oldResult = selfCollisionPairScalars(...args)
    assert.equal(selfCollisionPairScalarsInto(scratch, ...args), scratch)
    for (let field = 0; field < 7; field += 1) assert.ok(
      Object.is(oldResult[field], scratch[field]),
      `${backend} scratch differs at scalar ${i}:${field}`,
    )
  }
  console.log(`PASS ${backend}: 1024 result-vector comparisons (7 scalars each)`)
}

checkScratchParity('javascript-fallback')
const wasmUrl = new URL('../public/wasm/exo_self_collision_kernel.wasm', import.meta.url)
if (existsSync(wasmUrl)) {
  assert.ok(await initializeRustSelfCollisionKernel({bytes: readFileSync(wasmUrl)}),
    'compiled Rust self-collision WASM did not initialize')
  checkScratchParity('compiled-rust-wasm')
  for (const [count, golden] of GOLDEN) {
    const {simulation, particles} = fixture(count)
    resolveSelfCollisions(simulation, 0.016)
    assert.equal(positionHash(particles), golden, `${count} compiled-WASM collision positions changed`)
  }
  console.log('PASS compiled WASM: all three pre-optimization position hashes')
} else {
  console.log('SKIP compiled WASM: binary not present; no compilation performed')
}
