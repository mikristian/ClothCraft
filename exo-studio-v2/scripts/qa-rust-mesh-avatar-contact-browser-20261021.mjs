import assert from 'node:assert/strict'
import { chromium } from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const source = process.env.EXO_SOURCE_URL || 'http://127.0.0.1:5297/'
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  const page = await browser.newPage()
  await page.goto(source, { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const mesh = await import('/src/core/meshAvatarContact.js')
    const bridge = await import('/src/core/rustMeshAvatarContactKernel.js')
    const loaded = await bridge.initializeRustMeshAvatarContactKernel()
    const scene = new THREE.Group()
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8)))
    const collider = mesh.createAvatarMeshCollider(scene)
    const position = new THREE.Vector3(.199, 0, 0)
    const particle = { position, previous: position.clone(), invMass: 1 }
    const sampled = mesh.sampleMeshContact(collider, position)
    const report = mesh.correctMeshAvatarContacts({ pieces: new Map([['front', { particles: [particle] }]]) }, collider)
    const output = { loaded, status: bridge.rustMeshAvatarContactStatus(), triangles: collider.triangles, sampled: sampled && { distance: sampled.distance, intrusion: sampled.intrusion }, report, positionChanged: position.x !== .199, previousSynced: particle.previous.equals(position) }
    collider.dispose()
    return output
  })
  assert.equal(result.loaded, true)
  assert.equal(result.status.backend, 'rust-wasm')
  assert.ok(result.triangles > 0)
  assert.ok(result.sampled.distance >= 0)
  assert.ok(result.report.checked === 1 && result.report.moved === 1)
  assert.equal(result.report.collisionCertified, false)
  assert.equal(result.positionChanged, true)
  assert.equal(result.previousSynced, true)
  console.log(JSON.stringify({ pass: true, source, ...result }))
} finally { await browser.close() }
