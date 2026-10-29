import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync} from 'fflate'
import {auditFactoryZipEnvelope20261024_0154 as audit} from './factoryZipEnvelope20261024_0154.mjs'

const utf8 = new TextEncoder()
const fixture = () => zipSync({
  'first.txt': utf8.encode('A'),
  'other.txt': utf8.encode('B'),
}, {level: 0})
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const u16 = (bytes, pos) => view(bytes).getUint16(pos, true)
const u32 = (bytes, pos) => view(bytes).getUint32(pos, true)
const put16 = (bytes, pos, value) => view(bytes).setUint16(pos, value, true)
const put32 = (bytes, pos, value) => view(bytes).setUint32(pos, value, true)
const endOffset = bytes => {
  for (let pos = bytes.length - 22; pos >= 0; pos--) {
    if (u32(bytes, pos) === 0x06054b50 && pos + 22 + u16(bytes, pos + 20) === bytes.length) return pos
  }
  throw Error('fixture missing end-of-central-directory')
}
const centralEntries = bytes => {
  const end = endOffset(bytes)
  const count = u16(bytes, end + 10)
  let pos = u32(bytes, end + 16)
  const result = []
  for (let i = 0; i < count; i++) {
    assert.equal(u32(bytes, pos), 0x02014b50)
    result.push({pos, name: pos + 46, nameLength: u16(bytes, pos + 28), local: u32(bytes, pos + 42)})
    pos += 46 + u16(bytes, pos + 28) + u16(bytes, pos + 30) + u16(bytes, pos + 32)
  }
  return result
}
const swapName = (bytes, index, name) => {
  const entry = centralEntries(bytes)[index]
  assert.equal(name.length, entry.nameLength, 'mutate fixed-length names only')
  bytes.set(utf8.encode(name), entry.name)
  return bytes
}
const codes = result => result.diagnostics.map(({code}) => code)
const denied = (bytes, label) => {
  const before = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, false, `${label}: unexpectedly accepted ${JSON.stringify(result)}`)
  assert.equal(result.manufacturingApproved, false, `${label}: approval must remain false`)
  assert(Array.isArray(result.diagnostics) && result.diagnostics.length > 0, `${label}: missing diagnostics`)
  for (const diagnostic of result.diagnostics) {
    assert.equal(typeof diagnostic.code, 'string')
    assert.equal(typeof diagnostic.message, 'string')
  }
  assert.deepEqual(bytes, before, `${label}: audit mutated source archive`)
  return codes(result)
}

test('control: ordinary fflate archive parses, while factory approval always remains false', () => {
  const bytes = fixture()
  const previous = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(bytes, previous)
})

test('rejects duplicate names in central directory, including case-only collisions', () => {
  denied(swapName(fixture(), 1, 'first.txt'), 'duplicate central entry')
  denied(swapName(fixture(), 1, 'FIRST.TXT'), 'case-folded central collision')
})

test('rejects traversal and absolute central entry names', () => {
  denied(swapName(fixture(), 0, '../a/.txt'), 'traversal entry')
  denied(swapName(fixture(), 0, '/root.txt'), 'absolute entry')
})

test('rejects central name mismatching the local file header', () => {
  denied(swapName(fixture(), 0, 'wrong.txt'), 'local/central name mismatch')
})

test('rejects contradictory declared entry counts', () => {
  const count = fixture()
  put16(count, endOffset(count) + 10, 1)
  denied(count, 'central entry count differs from directory bytes')
  const unequal = fixture()
  put16(unequal, endOffset(unequal) + 8, 1)
  denied(unequal, 'entries on disk disagree with total')
})

test('rejects ZIP64 markers and encrypted entries', () => {
  const zip64 = fixture()
  put16(zip64, endOffset(zip64) + 10, 0xffff)
  denied(zip64, 'ZIP64 sentinel')
  const centralZip64 = fixture()
  put32(centralZip64, centralEntries(centralZip64)[0].pos + 24, 0xffffffff)
  denied(centralZip64, 'ZIP64 uncompressed-size sentinel')
  const encrypted = fixture()
  const first = centralEntries(encrypted)[0]
  put16(encrypted, first.pos + 8, u16(encrypted, first.pos + 8) | 1)
  put16(encrypted, first.local + 6, u16(encrypted, first.local + 6) | 1)
  denied(encrypted, 'encrypted entry flag')
})

test('rejects truncated archive and central-directory records', () => {
  const original = fixture()
  denied(original.slice(0, -1), 'truncated end record')
  const central = fixture()
  const first = centralEntries(central)[0]
  put16(central, first.pos + 28, 0xfffe)
  denied(central, 'oversized central name length')
  const offset = fixture()
  put32(offset, endOffset(offset) + 16, 0xffffffff)
  denied(offset, 'central directory offset outside archive')
})

test('rejects inconsistent central/local file sizes and invalid local offsets', () => {
  const changed = fixture()
  const first = centralEntries(changed)[0]
  put32(changed, first.pos + 20, u32(changed, first.pos + 20) + 100)
  denied(changed, 'declared compressed length mismatch')
  const missingLocal = fixture()
  put32(missingLocal, centralEntries(missingLocal)[0].pos + 42, 0x7fffffff)
  denied(missingLocal, 'local header offset out of range')
})
