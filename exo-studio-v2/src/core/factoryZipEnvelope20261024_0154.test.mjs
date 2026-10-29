import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipEnvelope20261024_0154 as audit} from './factoryZipEnvelope20261024_0154.mjs'

const fixture = () => zipSync(Object.fromEntries(
  ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => [`foundation-tee/${size}.dxf`, strToU8(`DXF ${size}`)])
), {level: 0})
const copy = bytes => new Uint8Array(bytes)
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const directory = bytes => {
  const v = view(bytes)
  return v.getUint32(bytes.length - 6, true)
}
const rejected = (bytes, code) => {
  const result = audit(bytes)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.diagnostics[0].code, code)
}

test('accepts six-size Foundation Tee fflate zipSync envelope', () => {
  assert.deepEqual(audit(fixture()), {ok: true, diagnostics: [], manufacturingApproved: false})
})
test('rejects malformed EOCD and central directory offsets', () => {
  const badEnd = copy(fixture())
  badEnd[badEnd.length - 22] = 0
  rejected(badEnd, 'EOCD_INVALID')
  const badOffset = copy(fixture())
  const v = view(badOffset)
  v.setUint32(badOffset.length - 6, 0xffffff00, true)
  rejected(badOffset, 'CENTRAL_BOUNDS')
})
test('rejects central entry count mismatch and ZIP64', () => {
  const count = copy(fixture())
  view(count).setUint16(count.length - 12, 7, true)
  rejected(count, 'MULTIDISK_UNSUPPORTED')
  const zip64 = copy(fixture())
  view(zip64).setUint32(zip64.length - 6, 0xffffffff, true)
  rejected(zip64, 'ZIP64_UNSUPPORTED')
})
test('rejects local filename mismatch and compressed size beyond region', () => {
  const filename = copy(fixture())
  filename[30] ^= 1
  rejected(filename, 'LOCAL_FILENAME_MISMATCH')
  const size = copy(fixture())
  view(size).setUint32(directory(size) + 20, 0xfffffffe, true)
  rejected(size, 'SIZE_MISMATCH')
})
test('rejects unsafe paths and case-insensitive duplicates', () => {
  const traversal = zipSync({'../x.dxf': strToU8('a')}, {level: 0})
  rejected(traversal, 'PATH_UNSAFE')
  const dup = zipSync({'S.dxf': strToU8('a'), 's.dxf': strToU8('b')}, {level: 0})
  rejected(dup, 'PATH_DUPLICATE')
  const absolute = zipSync({'/x.dxf': strToU8('a')}, {level: 0})
  rejected(absolute, 'PATH_UNSAFE')
})
test('rejects truncated entries, unsupported flags, and overlapping local spans', () => {
  const truncation = copy(fixture()).subarray(0, fixture().length - 1)
  rejected(truncation, 'EOCD_INVALID')
  const encrypted = copy(fixture())
  view(encrypted).setUint16(directory(encrypted) + 8, 1, true)
  rejected(encrypted, 'FLAGS_UNSUPPORTED')
  const overlap = copy(fixture())
  const v = view(overlap)
  const first = directory(overlap)
  const next = first + 46 + v.getUint16(first + 28, true) + v.getUint16(first + 30, true) + v.getUint16(first + 32, true)
  v.setUint32(next + 42, 0, true)
  rejected(overlap, 'LOCAL_HEADER_MISMATCH')
})
