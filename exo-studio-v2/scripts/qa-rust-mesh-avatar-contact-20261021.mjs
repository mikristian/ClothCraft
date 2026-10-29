import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { createAvatarMeshCollider, sampleMeshContact, correctMeshAvatarContacts } from '../src/core/meshAvatarContact.js'
import { meshContactIntrusion, meshContactDirectionScale, meshContactCorrection, initializeRustMeshAvatarContactKernel, rustMeshAvatarContactStatus } from '../src/core/rustMeshAvatarContactKernel.js'

let seed = 718231
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32
const edge = [-Infinity, -1, -0, 0, 1e-12, 1e-8, 1e-7, .003, 1, Infinity, NaN]
const cases = []
for (const distance of edge) for (const clearance of edge) for (const inside of [false, true]) cases.push({ distance, clearance, inside, limit: clearance })
for (let i = 0; i < 4000; i++) cases.push({ distance: random() * .07, clearance: random() * .01, inside: random() < .5, limit: random() * .006 })
const expected = cases.map(({ distance, clearance, inside, limit }) => [meshContactIntrusion(distance, clearance, inside), meshContactDirectionScale(distance, inside), meshContactCorrection(limit, clearance - distance)])
const scene = new THREE.Group()
scene.add(new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10)))
const collider = createAvatarMeshCollider(scene)
const points = Array.from({ length: 100 }, (_, i) => new THREE.Vector3(.15 + i * .0009, .002, .001))
const sample = () => points.map(point => {
  const c = sampleMeshContact(collider, point)
  return c && [c.inside, c.distance, c.intrusion, ...c.nearest.toArray(), ...c.direction.toArray()]
})
const simulate = () => {
  const particles = points.map(position => ({ position: position.clone(), previous: position.clone(), invMass: 1 }))
  const report = correctMeshAvatarContacts({ pieces: new Map([['body', { particles }]]) }, collider)
  return { report, positions: particles.map(p => p.position.toArray()), previous: particles.map(p => p.previous.toArray()) }
}
const originalSamples = sample()
const originalSimulation = simulate()
assert.equal(rustMeshAvatarContactStatus().backend, 'javascript-fallback')
assert.equal(await initializeRustMeshAvatarContactKernel({ bytes: new Uint8Array([0]) }), false)
assert.equal(await initializeRustMeshAvatarContactKernel({ bytes: readFileSync('public/wasm/exo_mesh_avatar_contact_kernel.wasm') }), true)
assert.equal(rustMeshAvatarContactStatus().backend, 'rust-wasm')
const equalNumber = (actual, target) => assert.ok(Object.is(actual, target) || (Number.isNaN(actual) && Number.isNaN(target)), `${actual} versus ${target}`)
cases.forEach(({ distance, clearance, inside, limit }, i) => {
  equalNumber(meshContactIntrusion(distance, clearance, inside), expected[i][0])
  equalNumber(meshContactDirectionScale(distance, inside), expected[i][1])
  equalNumber(meshContactCorrection(limit, clearance - distance), expected[i][2])
})
assert.deepEqual(sample(), originalSamples)
assert.deepEqual(simulate(), originalSimulation)
collider.dispose()
console.log(JSON.stringify({ pass: true, numericCases: cases.length, geometrySamples: points.length, exact: true, backend: rustMeshAvatarContactStatus().backend }))
