import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {auditFactoryZipEnvelope20261024_0154} from './factoryZipEnvelope20261024_0154.mjs'
import {auditFactoryZipMetadataGuard20261024_0400 as auditStrict} from './factoryZipMetadataGuard20261024_0400.mjs'

// Independent raw-byte mutations; no fixture uses the candidate metadata guard.
const encoder = new TextEncoder()
const u16 = (b, p) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint16(p, true)
const u32 = (b, p) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(p, true)
const set16 = (b, p, v) => new DataView(b.buffer, b.byteOffset, b.byteLength).setUint16(p, v, true)
const set32 = (b, p, v) => new DataView(b.buffer, b.byteOffset, b.byteLength).setUint32(p, v, true)
const entries = b => {
  let end = b.length - 22
  while (end >= 0 && (u32(b, end) !== 0x06054b50 || end + 22 + u16(b, end + 20) !== b.length)) end--
  assert(end >= 0)
  let p = u32(b, end + 16)
  const result = []
  for (let i = 0; i < u16(b, end + 10); i++) {
    assert.equal(u32(b, p), 0x02014b50)
    result.push(p)
    p += 46 + u16(b, p + 28) + u16(b, p + 30) + u16(b, p + 32)
  }
  return result
}
const fixture = () => zipSync({'regular.txt': encoder.encode('ok')}, {level: 0})
const unixMode = (mode, platform = 3) => {
  const b = fixture()
  for (const p of entries(b)) {
    set16(b, p + 4, (platform << 8) | 20)
    set32(b, p + 38, (mode << 16) >>> 0)
  }
  return b
}
const rejected = (audit, bytes, context) => {
  const original = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, false, `${context}: accepted ${JSON.stringify(result)}`)
  assert.equal(result.manufacturingApproved, false, context)
  assert.deepEqual(bytes, original, `${context}: input mutated`)
  assert(result.diagnostics?.some(d => typeof d.code === 'string'), `${context}: missing diagnostic`)
}

test('metadata baseline: real six-size factory ZIP has six DXF patterns and passes envelope validation', () => {
  const built = buildGuardedFactoryManifestZip20261024_0053(createTeeTemplate())
  assert.equal(built.ok, true, JSON.stringify(built.diagnostics))
  assert.equal(built.manufacturingApproved, false)
  assert.equal(auditFactoryZipEnvelope20261024_0154(built.bytes).ok, true)
  assert.equal(entries(built.bytes).length > 6, true)
})

test('metadata evidence: old envelope accepts Unix symlink and nonregular modes', () => {
  for (const mode of [0o120777, 0o020666, 0o060600, 0o010600, 0o040755]) {
    const b = unixMode(mode)
    assert.equal(auditFactoryZipEnvelope20261024_0154(b).ok, true, `mode ${mode.toString(8)}`)
  }
})

test('metadata evidence: old envelope accepts malformed host attributes', () => {
  const b = unixMode(0o100644, 255)
  assert.equal(auditFactoryZipEnvelope20261024_0154(b).ok, true)
})

test('metadata evidence: old envelope accepts equivalent Unicode paths', () => {
  const b = zipSync({'café.txt': encoder.encode('1'), 'cafe\u0301.txt': encoder.encode('2')}, {level: 0})
  assert.equal(entries(b).length, 2)
  assert.equal(auditFactoryZipEnvelope20261024_0154(b).ok, true)
})

// Candidate strict guard is independently exercised once its implementation exists.
test('strict metadata guard rejects Unicode collisions and dangerous Unix attributes', () => {
  rejected(auditStrict, zipSync({'café.txt': encoder.encode('1'), 'cafe\u0301.txt': encoder.encode('2')}, {level: 0}), 'NFC duplicate')
  for (const mode of [0o120777, 0o020666, 0o060600, 0o010600, 0o040755]) rejected(auditStrict, unixMode(mode), `Unix mode ${mode.toString(8)}`)
  const built = buildGuardedFactoryManifestZip20261024_0053(createTeeTemplate())
  assert.equal(auditStrict(built.bytes).ok, true, 'real six-size package must pass strict metadata guard')
})

test('strict metadata guard rejects unsupported ZIP host systems', () => {
  rejected(auditStrict, unixMode(0o100644, 255), 'unknown ZIP host')
})

test('strict metadata guard rejects DOS volume label attribute on a regular file', () => {
  const b = fixture()
  const p = entries(b)[0]
  set32(b, p + 38, 0x08)
  rejected(auditStrict, b, 'DOS volume label entry')
})
