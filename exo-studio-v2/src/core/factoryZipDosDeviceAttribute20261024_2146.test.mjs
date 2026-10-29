import test from 'node:test'
import assert from 'node:assert/strict'
import { zipSync, strToU8 } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { auditFactoryZipMetadataGuard20261024_0400 as auditMetadata } from './factoryZipMetadataGuard20261024_0400.mjs'
import { buildAccuMarkGuardedFactoryPackage20261023 as build } from './accumarkGuardedFactoryPackage20261023.js'
import { requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip } from './accumarkGuardedFactoryPostZipGate20261024.mjs'

function changeFirstCentralAttributes(archive, attrs, host = 0) {
  const bytes = Uint8Array.from(archive)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = bytes.byteLength - 22
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--
  assert.ok(eocd >= 0)
  const central = view.getUint32(eocd + 16, true)
  assert.equal(view.getUint32(central, true), 0x02014b50)
  bytes[central + 5] = host
  view.setUint32(central + 38, attrs, true)
  return bytes
}

test('metadata guard refuses DOS device attributes, regardless of creator platform', () => {
  const valid = zipSync({ 'patterns/M.dxf': strToU8('DXF fixture') }, { level: 0 })
  assert.equal(auditMetadata(valid).ok, true)
  for (const [attrs, host] of [[0x40, 0], [0x20 | 0x40, 0], [0x81a40040, 3]]) {
    const result = auditMetadata(changeFirstCentralAttributes(valid, attrs, host))
    assert.equal(result.ok, false, `accepted DOS device attribute 0x${attrs.toString(16)}`)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(result.diagnostics[0]?.code, 'DOS_DEVICE_ATTRIBUTE')
  }
})

test('production post-ZIP gate rejects device metadata even with identical payload, CRC and source geometry', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  const result = build(project, { zip: true })
  assert.equal(result.ok, true, result.reason)
  assert.equal(verifyPostZip(result.zip, result.files, project).ok, true)
  const forged = changeFirstCentralAttributes(result.zip, 0x40)
  assert.throws(() => verifyPostZip(forged, result.files, project), /DOS_DEVICE_ATTRIBUTE/)
  assert.deepEqual(project, original)
})
