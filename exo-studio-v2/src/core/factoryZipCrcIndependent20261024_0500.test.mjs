import test from 'node:test'
import assert from 'node:assert/strict'
import { zipSync } from 'fflate'
import { auditFactoryZipCrcGuard20261024_0500 as audit } from './factoryZipCrcGuard20261024_0500.mjs'

const encoder = new TextEncoder()
const content = encoder.encode('bounded factory data: '.repeat(40))
const makeZip = level => zipSync({ 'patterns/foundation.dxf': content }, { level })
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const u16 = (bytes, at) => view(bytes).getUint16(at, true)
const u32 = (bytes, at) => view(bytes).getUint32(at, true)
const set32 = (bytes, at, value) => view(bytes).setUint32(at, value >>> 0, true)
const central = bytes => {
  for (let p = bytes.length - 22; p >= 0; p--) {
    if (u32(bytes, p) === 0x06054b50 && p + 22 + u16(bytes, p + 20) === bytes.length) return u32(bytes, p + 16)
  }
  throw new Error('EOCD missing')
}
const offsets = bytes => {
  const c = central(bytes)
  assert.equal(u32(bytes, c), 0x02014b50)
  const local = u32(bytes, c + 42)
  assert.equal(u32(bytes, local), 0x04034b50)
  return { c, local, data: local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28) }
}
const reject = (bytes, reason) => {
  const snapshot = bytes.slice()
  const result = audit(bytes)
  assert.equal(result.ok, false, `${reason}: ${JSON.stringify(result)}`)
  assert.equal(result.manufacturingApproved, false, reason)
  assert.ok(result.diagnostics?.length, `${reason}: diagnostics missing`)
  assert.deepEqual(bytes, snapshot, `${reason}: input changed`)
}

test('accepts real bounded STORE and DEFLATE ZIP entries without modifying bytes', () => {
  for (const level of [0, 6]) {
    const bytes = makeZip(level)
    assert.equal(u16(bytes, offsets(bytes).c + 10), level === 0 ? 0 : 8)
    const before = bytes.slice()
    const result = audit(bytes)
    assert.equal(result.ok, true, JSON.stringify(result))
    assert.equal(result.manufacturingApproved, false)
    assert.deepEqual(bytes, before)
  }
})

test('rejects payload corruption in STORE and DEFLATE', () => {
  for (const level of [0, 6]) {
    const bytes = makeZip(level)
    bytes[offsets(bytes).data] ^= 0x20
    reject(bytes, `payload tampering level ${level}`)
  }
})

test('rejects CRC forgery in both local and central headers', () => {
  for (const level of [0, 6]) {
    const bytes = makeZip(level)
    const { c, local } = offsets(bytes)
    const forged = u32(bytes, c + 16) ^ 0x01020304
    set32(bytes, c + 16, forged)
    set32(bytes, local + 14, forged)
    reject(bytes, `forged matching CRC level ${level}`)
  }
})

test('rejects DEFLATE uncompressed length forgery in both headers', () => {
  const bytes = makeZip(6)
  const { c, local } = offsets(bytes)
  const forged = u32(bytes, c + 24) + 1
  set32(bytes, c + 24, forged)
  set32(bytes, local + 22, forged)
  reject(bytes, 'forged matching uncompressed lengths')
})

test('handles a Uint8Array with nonzero byteOffset and leaves its backing bytes unchanged', () => {
  const zip = makeZip(6)
  const backing = new Uint8Array(zip.length + 19).fill(0xa5)
  backing.set(zip, 11)
  const slice = backing.subarray(11, 11 + zip.length)
  assert.ok(slice.byteOffset > 0)
  const before = backing.slice()
  assert.equal(audit(slice).ok, true)
  assert.deepEqual(backing, before)
  slice[offsets(slice).data] ^= 0x40
  reject(slice, 'offset slice payload corruption')
})
