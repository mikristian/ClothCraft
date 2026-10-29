import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { auditFactoryZipMarkerIsolated20261024_1302 as audit } from './factoryZipMarkerIsolated20261024_1302.mjs'

test('valid factory map passes development-only audit without mutation', async () => {
  const map = buildFactoryPackageFiles(createTeeTemplate())
  const original = structuredClone(map)
  const result = await audit(map)
  assert.deepEqual(result, { ok: true, diagnostics: [], manufacturingApproved: false, physicalRegistrationVerified: false })
  assert.deepEqual(map, original)
})
test('reject accessor map without reading getter', async () => {
  let calls = 0
  const files = Object.create(null)
  Object.defineProperty(files, 'manifest.json', { enumerable: true, get() { calls++; throw Error('getter executed') } })
  const result = await audit(files)
  assert.equal(calls, 0)
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
})
test('reject accessor expected project without reading getter', async () => {
  const map = buildFactoryPackageFiles(createTeeTemplate())
  const project = createTeeTemplate()
  let calls = 0
  Object.defineProperty(project, 'pieces', { enumerable: true, get() { calls++; throw Error('getter executed') } })
  const result = await audit(map, project)
  assert.equal(calls, 0)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
})
test('reject oversized entry, excess entries and shared array memory before spawn', async () => {
  const big = { 'large.bin': new Uint8Array(8 * 1024 * 1024 + 1) }
  assert.equal((await audit(big)).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
  const many = Object.fromEntries(Array.from({ length: 513 }, (_, i) => [String(i), new Uint8Array(0)]))
  assert.equal((await audit(many)).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
  const shared = { 'shared.bin': new Uint8Array(new SharedArrayBuffer(8)) }
  assert.equal((await audit(shared)).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
})
test('forged source bytes produce fail-closed child result', async () => {
  const map = buildFactoryPackageFiles(createTeeTemplate())
  map['garment-source.json'] = new TextEncoder().encode('{}')
  const result = await audit(map)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
})
