import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { auditFactoryZipMarkerHardDeadline20261024_1452 as audit, HARD_DEADLINE_MARKER_LIMITS_1452 as limits } from './factoryZipMarkerHardDeadline20261024_1452.mjs'

test('bounded settings remain the original development limits', () => {
  assert.equal(limits.timeoutMs, 12000)
  assert.equal(limits.maxOutputBytes, 128 * 1024)
  assert.equal(limits.maxTotalBytes, 24 * 1024 * 1024)
  assert.equal(Object.isFrozen(limits), true)
})

test('valid archive is audited without mutation and without production approval', async () => {
  const map = buildFactoryPackageFiles(createTeeTemplate())
  const before = structuredClone(map)
  const result = await audit(map)
  assert.deepEqual(result, { ok: true, diagnostics: [], manufacturingApproved: false, physicalRegistrationVerified: false })
  assert.deepEqual(map, before)
})

test('accessors and invalid input are refused without invoking getters', async () => {
  let getterCalls = 0
  const map = Object.create(null)
  Object.defineProperty(map, 'x', { enumerable: true, get() { getterCalls++; throw Error('unsafe') } })
  assert.equal((await audit(map)).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
  assert.equal(getterCalls, 0)
  assert.equal((await audit({ 'large.bin': new Uint8Array(limits.maxEntryBytes + 1) })).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
  assert.equal((await audit({ 'shared.bin': new Uint8Array(new SharedArrayBuffer(8)) })).diagnostics[0].code, 'ISOLATED_INPUT_REJECTED')
})

test('tampered source data is rejected without approval', async () => {
  const map = buildFactoryPackageFiles(createTeeTemplate())
  map['garment-source.json'] = new TextEncoder().encode('{}')
  const result = await audit(map)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
})
