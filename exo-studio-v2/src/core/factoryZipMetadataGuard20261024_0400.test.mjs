import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipMetadataGuard20261024_0400 as audit} from './factoryZipMetadataGuard20261024_0400.mjs'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const makeZip = entries => zipSync(Object.fromEntries(entries.map(name => [name, strToU8('DXF test')])), {level: 0})
const sample = () => makeZip(sizes.map(size => `foundation-tee/${size}.dxf`))
const copy = bytes => new Uint8Array(bytes)
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const central = bytes => view(bytes).getUint32(bytes.byteLength - 6, true)
const rejected = (bytes, code) => {
  const result = audit(bytes)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.diagnostics[0].code, code)
}
const withAttributes = (bytes, origin, attrs) => {
  const result = copy(bytes)
  const at = central(result)
  result[at + 5] = origin
  view(result).setUint32(at + 38, attrs, true)
  return result
}

test('accepts a six-size stored production-pattern ZIP envelope without manufacturing approval', () => {
  assert.deepEqual(audit(sample()), {ok: true, diagnostics: [], manufacturingApproved: false})
})

test('accepts Unix regular file metadata', () => {
  assert.equal(audit(withAttributes(sample(), 3, 0x81a40000)).ok, true)
})

test('rejects unknown creator platforms and contradictory DOS-origin Unix modes', () => {
  rejected(withAttributes(sample(), 255, 0), 'ZIP_HOST_UNSUPPORTED')
  rejected(withAttributes(sample(), 0, 0x81a40000), 'UNIX_FILE_TYPE')
})

test('rejects distinct UTF-8 paths that collide after NFC normalization', () => {
  const bytes = makeZip(['caf\u00e9.dxf', 'cafe\u0301.dxf'])
  rejected(bytes, 'UNICODE_PATH_COLLISION')
})

test('rejects casefold collision including sharp s expansion', () => {
  rejected(makeZip(['Straße.dxf', 'STRASSE.dxf']), 'UNICODE_PATH_COLLISION')
  rejected(makeZip(['ς.dxf', 'σ.dxf']), 'UNICODE_PATH_COLLISION')
  rejected(makeZip(['µ.dxf', 'μ.dxf']), 'UNICODE_PATH_COLLISION')
})

test('rejects Unix symlinks and Unix special file modes', () => {
  rejected(withAttributes(sample(), 3, 0xa1ff0000), 'UNIX_FILE_TYPE')
  rejected(withAttributes(sample(), 3, 0x41ed0000), 'UNIX_FILE_TYPE')
  rejected(withAttributes(sample(), 3, 0x21a40000), 'UNIX_FILE_TYPE')
  rejected(withAttributes(sample(), 3, 0), 'UNIX_FILE_TYPE')
  rejected(withAttributes(sample(), 0, 0xa1ff0000), 'UNIX_FILE_TYPE')
})

test('rejects DOS directory metadata on file-named entries', () => {
  rejected(withAttributes(sample(), 0, 0x10), 'DOS_DIRECTORY_ATTRIBUTE')
  rejected(withAttributes(sample(), 3, 0x81a40010), 'DOS_DIRECTORY_ATTRIBUTE')
  rejected(withAttributes(sample(), 0, 0x08), 'DOS_VOLUME_ATTRIBUTE')
})

test('preserves wrapped envelope fail-closed errors for malformed structures', () => {
  const truncated = sample().subarray(0, sample().length - 1)
  rejected(truncated, 'EOCD_INVALID')
  const invalidOffset = copy(sample())
  view(invalidOffset).setUint32(invalidOffset.length - 6, 0xffffff00, true)
  rejected(invalidOffset, 'CENTRAL_BOUNDS')
  rejected(new Uint8Array(0), 'ARCHIVE_BOUNDS')
})
