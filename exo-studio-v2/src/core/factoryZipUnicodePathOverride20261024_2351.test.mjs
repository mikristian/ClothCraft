import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {auditFactoryZipMetadataGuard20261024_0400 as auditMetadata} from './factoryZipMetadataGuard20261024_0400.mjs'
import {auditFactoryZipResourceThenCrc20261024_0600 as auditResource} from './factoryZipResourceBudget20261024_0600.mjs'
import {buildAccuMarkGuardedFactoryPackage20261023 as build} from './accumarkGuardedFactoryPackage20261023.js'
import {requireAccuMarkGuardedFactoryPostZipParity20261024 as verifyPostZip} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const u16 = (bytes, at) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(at, true)
const u32 = (bytes, at) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true)
const set16 = (bytes, at, value) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(at, value, true)

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function unicodePathExtra(headerName, alias = '../../outside.dxf') {
  const encoded = strToU8(alias)
  const bytes = new Uint8Array(5 + encoded.length)
  bytes[0] = 1 // Info-ZIP Unicode Path version
  new DataView(bytes.buffer).setUint32(1, crc32(strToU8(headerName)), true)
  bytes.set(encoded, 5)
  return bytes
}

function firstExtraLocations(bytes) {
  let eocd = bytes.length - 22
  while (eocd >= 0 && (u32(bytes, eocd) !== 0x06054b50 || eocd + 22 + u16(bytes, eocd + 20) !== bytes.length)) eocd--
  assert.ok(eocd >= 0)
  const central = u32(bytes, eocd + 16)
  const local = u32(bytes, central + 42)
  const centralExtra = central + 46 + u16(bytes, central + 28)
  const localExtra = local + 30 + u16(bytes, local + 26)
  assert.ok(u16(bytes, central + 30) >= 4)
  assert.ok(u16(bytes, local + 28) >= 4)
  return {centralExtra, localExtra}
}

test('CRC-bound Unicode Path alias is refused even when filename, payload and CRC otherwise validate', () => {
  const name = 'patterns/M.dxf'
  const zip = zipSync({[name]: [strToU8('fixture'), {extra: {0x7075: unicodePathExtra(name)}}]}, {level: 0})
  const original = zip.slice()
  const verdict = auditMetadata(zip)
  assert.equal(verdict.ok, false)
  assert.equal(verdict.diagnostics[0].code, 'ZIP_UNICODE_PATH_OVERRIDE')
  assert.equal(verdict.manufacturingApproved, false)
  assert.equal(auditResource(zip).diagnostics[0].code, 'ZIP_UNICODE_PATH_OVERRIDE')
  assert.deepEqual(zip, original)
})

test('Unicode Path alias is refused in either header independently; all extensions fail closed', () => {
  const name = 'patterns/M.dxf'
  const base = zipSync({[name]: [strToU8('fixture'), {extra: {0x7075: unicodePathExtra(name)}}]}, {level: 0})
  const {centralExtra, localExtra} = firstExtraLocations(base)
  for (const neutralized of [localExtra, centralExtra]) {
    const bytes = base.slice()
    set16(bytes, neutralized, 0x5455) // keep lengths/offsets; neutralize only one alias
    assert.equal(auditMetadata(bytes).diagnostics[0].code, 'ZIP_UNICODE_PATH_OVERRIDE')
  }
  const benign = base.slice()
  set16(benign, centralExtra, 0x5455)
  set16(benign, localExtra, 0x5455)
  assert.equal(auditMetadata(benign).diagnostics[0].code, 'ZIP_EXTRA_FIELD_UNSUPPORTED')
  assert.equal(auditResource(benign).diagnostics[0].code, 'ZIP_EXTRA_FIELD_UNSUPPORTED')
  for (const neutralized of [localExtra, centralExtra]) {
    const bytes = benign.slice()
    set16(bytes, neutralized, 0x7075)
    assert.equal(auditMetadata(bytes).diagnostics[0].code, 'ZIP_UNICODE_PATH_OVERRIDE')
  }
})

test('factory metadata rejects other extractor-dependent and unknown ZIP extra fields', () => {
  for (const id of [0x6375, 0x000a, 0x0008, 0x5455, 0x1234]) {
    const zip = zipSync({'patterns/M.dxf': [strToU8('fixture'), {extra: {[id]: new Uint8Array([1, 2, 3, 4])}}]}, {level: 0})
    const result = auditMetadata(zip)
    assert.equal(result.ok, false, `accepted extra field 0x${id.toString(16)}`)
    assert.equal(result.diagnostics[0].code, 'ZIP_EXTRA_FIELD_UNSUPPORTED')
    assert.equal(result.manufacturingApproved, false)
  }
})

test('real 73-file factory archive refuses alternate extractor path while preserving authored garment', () => {
  const project = createTeeTemplate()
  const snapshot = structuredClone(project)
  const result = build(project, {zip: true})
  assert.equal(result.ok, true, result.reason)
  assert.equal(Object.keys(result.files).length, 73)
  assert.equal(verifyPostZip(result.zip, result.files, project).ok, true)
  const first = Object.keys(result.files)[0]
  const entries = Object.fromEntries(Object.entries(result.files).map(([name, bytes]) =>
    [name, name === first ? [bytes, {extra: {0x7075: unicodePathExtra(name)}}] : bytes]))
  const alternate = zipSync(entries, {level: 0})
  assert.throws(() => verifyPostZip(alternate, result.files, project), /ZIP_UNICODE_PATH_OVERRIDE/)
  assert.deepEqual(project, snapshot)
})
