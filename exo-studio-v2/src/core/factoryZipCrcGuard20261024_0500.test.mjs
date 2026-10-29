import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipCrcGuard20261024_0500 as audit} from './factoryZipCrcGuard20261024_0500.mjs'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const fixture = level => zipSync(Object.fromEntries(sizes.map(size => [`patterns/${size}.dxf`, strToU8(`DXF ${size}: ` + 'panels '.repeat(150))])), {level})
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const u16 = (bytes, offset) => view(bytes).getUint16(offset, true)
const u32 = (bytes, offset) => view(bytes).getUint32(offset, true)
const put32 = (bytes, offset, value) => view(bytes).setUint32(offset, value >>> 0, true)
const first = bytes => {
  const eocd = bytes.length - 22
  const central = u32(bytes, eocd + 16)
  const local = u32(bytes, central + 42)
  return {central, local, data: local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28)}
}
const reject = (bytes, code) => {
  const copy = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.diagnostics[0].code, code)
  assert.deepEqual(bytes, copy)
}

test('valid six-size STORE and DEFLATE ZIPs pass byte integrity without manufacturing approval', () => {
  for (const level of [0, 6]) {
    assert.deepEqual(audit(fixture(level)), {ok: true, diagnostics: [], manufacturingApproved: false})
  }
})

test('corrupted stored and deflated payloads fail', () => {
  for (const level of [0, 6]) {
    const bytes = fixture(level)
    bytes[first(bytes).data] ^= 0x40
    const result = audit(bytes)
    assert.equal(result.ok, false, JSON.stringify(result))
    assert.equal(result.manufacturingApproved, false)
  }
})

test('matching forged central and local CRC values fail independent CRC', () => {
  for (const level of [0, 6]) {
    const bytes = fixture(level)
    const {central, local} = first(bytes)
    const value = u32(bytes, central + 16) ^ 0x80000000
    put32(bytes, central + 16, value)
    put32(bytes, local + 14, value)
    reject(bytes, 'CRC_MISMATCH')
  }
})

test('matching forged smaller DEFLATE sizes plus prefix CRC are refused', () => {
  const bytes = fixture(6)
  const {central, local} = first(bytes)
  put32(bytes, central + 24, 1)
  put32(bytes, local + 22, 1)
  // CRC of the first uncompressed byte D; a preallocated one-byte inflate
  // silently truncates the stream and could accept this pair of forged headers.
  put32(bytes, central + 16, 0xa3b36a04)
  put32(bytes, local + 14, 0xa3b36a04)
  reject(bytes, 'CRC_SIZE_MISMATCH')
})

test('refuses extra bytes trailing a completed DEFLATE stream', () => {
  const content = strToU8('payload '.repeat(64))
  const bytes = zipSync({'patterns/S.dxf': content}, {level: 6})
  const {central, local, data} = first(bytes)
  const size = u32(bytes, central + 20)
  const insert = data + size
  const altered = new Uint8Array(bytes.length + 2)
  altered.set(bytes.subarray(0, insert))
  altered.set([0xff, 0xff], insert)
  altered.set(bytes.subarray(insert), insert + 2)
  put32(altered, central + 2 + 20, size + 2)
  put32(altered, local + 18, size + 2)
  put32(altered, altered.length - 6, central + 2)
  reject(altered, 'CRC_DEFLATE_TRAILING')
})

test('refuses uncompressed archive budgets even with valid ZIP metadata', () => {
  const bytes = zipSync({'oversize.dxf': new Uint8Array(8 * 1024 * 1024 + 1)}, {level: 6})
  reject(bytes, 'CRC_SIZE_BUDGET')
})

test('rejects malformed input through fixed imported metadata audit', () => {
  reject(new Uint8Array(0), 'ARCHIVE_BOUNDS')
})
