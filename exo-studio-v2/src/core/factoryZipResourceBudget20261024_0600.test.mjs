import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipResourceBudget20261024_0600 as audit, auditFactoryZipResourceThenCrc20261024_0600 as auditWithCrc} from './factoryZipResourceBudget20261024_0600.mjs'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const fixture = level => zipSync(Object.fromEntries(sizes.map(size => [`patterns/${size}.dxf`, strToU8(`DXF ${size}: ` + 'panel '.repeat(12))])), {level})
const dv = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const central = bytes => dv(bytes).getUint32(bytes.length - 6, true)
const u16 = (bytes, at) => dv(bytes).getUint16(at, true)
const u32 = (bytes, at) => dv(bytes).getUint32(at, true)
const put16 = (bytes, at, value) => dv(bytes).setUint16(at, value, true)
const put32 = (bytes, at, value) => dv(bytes).setUint32(at, value >>> 0, true)
function declared(bytes, compressed, uncompressed) {
  const at = central(bytes)
  const local = u32(bytes, at + 42)
  put32(bytes, at + 20, compressed)
  put32(bytes, at + 24, uncompressed)
  put32(bytes, local + 18, compressed)
  put32(bytes, local + 22, uncompressed)
  return bytes
}
function rejected(bytes, code) {
  const before = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.diagnostics[0].code, code)
  assert.deepEqual(bytes, before)
}

test('six-size STORE and DEFLATE pass static preflight and fixed CRC composition', () => {
  for (const level of [0, 6]) {
    const bytes = fixture(level)
    const before = bytes.slice()
    assert.deepEqual(audit(bytes), {ok: true, diagnostics: [], manufacturingApproved: false})
    assert.deepEqual(auditWithCrc(bytes), {ok: true, diagnostics: [], manufacturingApproved: false})
    assert.deepEqual(bytes, before)
  }
})

test('rejects highly compressible valid DEFLATE, before calling CRC', () => {
  const bytes = zipSync({'patterns/XS.dxf': new Uint8Array(20000)}, {level: 6})
  assert.ok(audit(bytes).diagnostics.some(item => item.code === 'RESOURCE_EXPANSION_RATIO'))
  assert.equal(auditWithCrc(bytes).diagnostics[0].code, 'RESOURCE_EXPANSION_RATIO')
})

test('rejects 81 entries before content verification', () => {
  const bytes = zipSync(Object.fromEntries(Array.from({length: 81}, (_, i) => [`patterns/${i}.dxf`, strToU8('x')])), {level: 0})
  rejected(bytes, 'RESOURCE_ENTRY_BUDGET')
})

test('rejects single entry >4 MiB and aggregate >16 MiB', () => {
  const entry = zipSync({'oversize.dxf': new Uint8Array(4 * 1024 * 1024 + 1)}, {level: 6})
  rejected(entry, 'RESOURCE_ENTRY_SIZE_BUDGET')
  // Each entry stays under 100x and 4 MiB; total declarations exceed 16 MiB.
  const total = zipSync(Object.fromEntries(Array.from({length: 5}, (_, i) => [`p${i}.dxf`, new Uint8Array(4 * 1024 * 1024).map((_, index) => (index * 13 + (index >>> 7)) & 0xff)])), {level: 6})
  rejected(total, 'RESOURCE_TOTAL_BUDGET')
})

test('rejects archive >16 MiB before scanning directory', () => {
  const bytes = new Uint8Array(16 * 1024 * 1024 + 1)
  rejected(bytes, 'RESOURCE_ARCHIVE_BUDGET')
})

test('zero-length STORE and DEFLATE entries are accepted', () => {
  for (const level of [0, 6]) {
    const bytes = zipSync({'empty.dxf': new Uint8Array(0)}, {level})
    assert.equal(audit(bytes).ok, true, JSON.stringify(audit(bytes)))
  }
})

test('rejects zero compressed declaration with positive output, malformed offsets and methods', () => {
  const bytes = fixture(6)
  const compressed = u32(bytes, central(bytes) + 20)
  rejected(declared(bytes.slice(), 0, 50), 'LOCAL_GAP')
  rejected(declared(bytes.slice(), compressed, 5 * 1024 * 1024), 'RESOURCE_ENTRY_SIZE_BUDGET')
  const badOffset = bytes.slice()
  put32(badOffset, badOffset.length - 6, 0xfffffff0)
  rejected(badOffset, 'CENTRAL_BOUNDS')
  const badMethod = bytes.slice()
  const at = central(badMethod)
  put16(badMethod, at + 10, 99)
  put16(badMethod, u32(badMethod, at + 42) + 8, 99)
  rejected(badMethod, 'METHOD_UNSUPPORTED')
  rejected(new Uint8Array(0), 'ARCHIVE_BOUNDS')
})

test('forged CRC passes static preflight but is rejected by composed integrity check', () => {
  const bytes = fixture(0)
  const at = central(bytes)
  const local = u32(bytes, at + 42)
  put32(bytes, at + 16, u32(bytes, at + 16) ^ 1)
  put32(bytes, local + 14, u32(bytes, local + 14) ^ 1)
  assert.equal(audit(bytes).ok, true)
  assert.equal(auditWithCrc(bytes).diagnostics[0].code, 'CRC_MISMATCH')
})
