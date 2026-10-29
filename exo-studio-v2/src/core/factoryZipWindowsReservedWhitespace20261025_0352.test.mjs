import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400 as auditMetadata} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipResourceThenCrc20261024_0600 as auditResource} from './factoryZipResourceBudget20261024_0600.mjs'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const payload = strToU8('DXF fixture')
const archive = name => zipSync({[name]: payload}, {level: 0})

test('rejects Windows device basenames padded with spaces before an extension', () => {
  for (const name of [
    'CON .dxf', 'AUX  .txt', 'patterns/COM1 .dxf',
    'patterns/LPT9  .txt', 'patterns/PRN .dxf',
    'patterns/NUL .dxf', 'patterns/CONIN$ .txt',
    'patterns/CONOUT$  .txt', 'patterns/CLOCK$ .dxf',
  ]) {
    const bytes = archive(name)
    const before = bytes.slice()
    const result = auditMetadata(bytes)
    assert.equal(result.ok, false, `accepted Windows device alias ${name}`)
    assert.equal(result.diagnostics[0]?.code, 'ZIP_WINDOWS_PATH_UNSAFE', name)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(auditResource(bytes).ok, false, name)
    assert.deepEqual(bytes, before, 'metadata verification must not mutate input')
  }
})

test('preserves non-device basenames with spaces before an extension', () => {
  for (const name of [
    'patterns/CONSTRUCTION .dxf', 'patterns/COM10 .dxf',
    'patterns/AUXILIARY .dxf', 'patterns/front panel .dxf',
  ]) assert.equal(auditMetadata(archive(name)).ok, true, `rejected non-device name ${name}`)
})

test('post-ZIP production gate rejects space-padded reserved basename before geometry checks', () => {
  const name = 'patterns/CON .dxf'
  assert.throws(() => verifyPostZip(archive(name), {[name]: payload}, {}), /ZIP_WINDOWS_PATH_UNSAFE/)
})
