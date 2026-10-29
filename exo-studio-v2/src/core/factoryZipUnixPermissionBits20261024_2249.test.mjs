import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {auditFactoryZipMetadataGuard20261024_0400 as audit} from './factoryZipMetadataGuard20261024_0400.mjs'
import {buildAccuMarkGuardedFactoryPackage20261023 as build} from './accumarkGuardedFactoryPackage20261023.js'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

function unixModeOnFirstEntry(archive, mode) {
  const bytes = Uint8Array.from(archive)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.byteLength - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  assert.ok(end >= 0)
  const first = view.getUint32(end + 16, true)
  assert.equal(view.getUint32(first, true), 0x02014b50)
  bytes[first + 5] = 3 // ZIP creator platform: Unix
  view.setUint32(first + 38, (mode << 16) >>> 0, true)
  return bytes
}

test('Unix regular data files retain compatible non-executable permissions', () => {
  const zip = zipSync({'patterns/M.dxf': strToU8('fixture')}, {level: 0})
  for (const mode of [0o100600, 0o100644, 0o100664]) {
    const result = audit(unixModeOnFirstEntry(zip, mode))
    assert.equal(result.ok, true, `refused ordinary Unix mode ${mode.toString(8)}`)
    assert.equal(result.manufacturingApproved, false)
  }
})

test('Unix executable, setuid, setgid and sticky modes are rejected before extraction', () => {
  const zip = zipSync({'patterns/M.dxf': strToU8('fixture')}, {level: 0})
  for (const mode of [0o100755, 0o100700, 0o104644, 0o102644, 0o101644, 0o107755]) {
    const result = audit(unixModeOnFirstEntry(zip, mode))
    assert.equal(result.ok, false, `accepted unsafe Unix mode ${mode.toString(8)}`)
    assert.equal(result.diagnostics[0]?.code, 'UNIX_UNSAFE_PERMISSIONS')
    assert.equal(result.manufacturingApproved, false)
  }
})

test('production post-ZIP verification rejects privilege metadata without payload or CRC changes', () => {
  const project = createTeeTemplate()
  const source = structuredClone(project)
  const result = build(project, {zip: true})
  assert.equal(result.ok, true, result.reason)
  assert.equal(verifyPostZip(result.zip, result.files, project).ok, true)
  for (const mode of [0o100755, 0o104644, 0o102644, 0o101644]) {
    const altered = unixModeOnFirstEntry(result.zip, mode)
    assert.throws(() => verifyPostZip(altered, result.files, project), /UNIX_UNSAFE_PERMISSIONS/)
  }
  assert.deepEqual(project, source)
})
