import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildAccuMarkGuardedFactoryPackage20261023} from './accumarkGuardedFactoryPackage20261023.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {
  auditFactoryZipResourceBudget20261024_0600 as audit,
  auditFactoryZipResourceThenCrc20261024_0600 as composedAudit
} from './factoryZipResourceBudget20261024_0600.mjs'

const utf8 = new TextEncoder()
const decoder = new TextDecoder('utf-8', {fatal: true})
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const u16 = (bytes, at) => view(bytes).getUint16(at, true)
const u32 = (bytes, at) => view(bytes).getUint32(at, true)
const set32 = (bytes, at, value) => view(bytes).setUint32(at, value >>> 0, true)
const zip = (items, level = 6) => zipSync(items, {level})
const sampleSix = () => zip(Object.fromEntries(sizes.map(size => [
  `patterns/foundation-${size}.dxf`, utf8.encode(`0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\nSIZE ${size}\n`.repeat(12))
])))

function centralOffsets(bytes) {
  let eocd = -1
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 22 - 65535); p--) {
    if (u32(bytes, p) === 0x06054b50 && p + 22 + u16(bytes, p + 20) === bytes.length) {
      eocd = p
      break
    }
  }
  assert.ok(eocd >= 0, 'fixture must have EOCD')
  const count = u16(bytes, eocd + 10)
  let cursor = u32(bytes, eocd + 16)
  const entries = []
  for (let i = 0; i < count; i++) {
    assert.equal(u32(bytes, cursor), 0x02014b50)
    const local = u32(bytes, cursor + 42)
    const nameLength = u16(bytes, cursor + 28)
    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    entries.push({central: cursor, local, path})
    cursor += 46 + u16(bytes, cursor + 28) + u16(bytes, cursor + 30) + u16(bytes, cursor + 32)
  }
  assert.equal(cursor, eocd)
  return {eocd, entries}
}

function verifyRejection(bytes, reason) {
  const before = bytes.slice()
  const result = audit(bytes)
  assert.equal(result?.ok, false, `${reason}: ${JSON.stringify(result)}`)
  assert.equal(result.manufacturingApproved, false, reason)
  assert.ok(Array.isArray(result.diagnostics) && result.diagnostics.length, `${reason}: diagnostics required`)
  assert.deepEqual(bytes, before, `${reason}: must not alter archive input`)
}

test('accepts valid bounded compressed six-size ZIP without manufacturing approval', () => {
  const bytes = sampleSix()
  const {entries} = centralOffsets(bytes)
  assert.equal(entries.length, 6)
  assert.ok(entries.every(({central}) => u16(bytes, central + 10) === 8), 'must exercise DEFLATE')
  const before = bytes.slice()
  const result = audit(bytes)
  assert.equal(result?.ok, true, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(bytes, before)
})

test('matches generated six-size Foundation Tee ZIP central inventory to independent factory file list', () => {
  const project = createTeeTemplate()
  const expected = buildAccuMarkGuardedFactoryPackage20261023(project, {zip: false})
  assert.equal(expected.ok, true, expected.reason)
  assert.equal(expected.manufacturingApproved, false)
  const expectedPaths = Object.keys(expected.files).sort()
  const built = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(built.ok, true, JSON.stringify(built.diagnostics ?? built.reason))
  assert.equal(built.manufacturingApproved, false)
  const entries = centralOffsets(built.bytes).entries
  const actualPaths = entries.map(({path}) => path).sort()
  assert.ok(entries.length <= 80, `factory archive exceeds 80-entry resource budget: ${entries.length}`)
  assert.equal(new Set(actualPaths).size, entries.length, 'duplicate central-directory file paths')
  assert.deepEqual(actualPaths, expectedPaths, 'missing or extra central-directory file paths')
  const altered = built.bytes.slice()
  const firstNameByte = entries[0].central + 46
  altered[firstNameByte] = altered[firstNameByte] === 0x78 ? 0x79 : 0x78
  const alteredPaths = centralOffsets(altered).entries.map(({path}) => path).sort()
  assert.notDeepEqual(alteredPaths, expectedPaths, 'tampered central-directory path must fail independent inventory comparison')
  assert.ok(entries.every(({central}) => u16(built.bytes, central + 10) === 0), 'production writer currently stores entries')
  const before = built.bytes.slice()
  const result = composedAudit(built.bytes)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(built.bytes, before)
})

test('rejects matching local+central false uncompressed sizes', () => {
  const bytes = sampleSix()
  const {entries} = centralOffsets(bytes)
  const {central, local} = entries[0]
  set32(bytes, central + 24, 1)
  set32(bytes, local + 22, 1)
  // Both declared sizes agree. Static inspection cannot determine actual decoded size.
  assert.equal(audit(bytes).ok, true)
  const before = bytes.slice()
  const checked = composedAudit(bytes)
  assert.equal(checked.ok, false, JSON.stringify(checked))
  assert.equal(checked.manufacturingApproved, false)
  assert.ok(checked.diagnostics.some(d => d.code === 'CRC_SIZE_MISMATCH'))
  assert.deepEqual(bytes, before)
})

test('rejects forged declared uncompressed size beyond any bounded per-entry cap', () => {
  const bytes = sampleSix()
  const {entries} = centralOffsets(bytes)
  const {central, local} = entries[0]
  set32(bytes, central + 24, 0x7fffffff)
  set32(bytes, local + 22, 0x7fffffff)
  verifyRejection(bytes, 'oversized declared output')
})

test('rejects compact high-ratio DEFLATE entry despite a small ZIP archive', () => {
  const bytes = zip({'patterns/high-ratio.dxf': new Uint8Array(2 * 1024 * 1024).fill(0x20)})
  assert.ok(bytes.length < 16384, `fixture unexpectedly large: ${bytes.length}`)
  const {entries} = centralOffsets(bytes)
  assert.equal(u16(bytes, entries[0].central + 10), 8)
  assert.ok(u32(bytes, entries[0].central + 24) / u32(bytes, entries[0].central + 20) > 100)
  verifyRejection(bytes, 'high-ratio compressed payload')
})

test('rejects excessive number of tiny entries', () => {
  const items = Object.fromEntries(Array.from({length: 81}, (_, i) => [
    `patterns/s${String(i).padStart(4, '0')}.dxf`, utf8.encode('x')
  ]))
  const bytes = zip(items)
  assert.equal(centralOffsets(bytes).entries.length, 81)
  assert.equal(audit(bytes).diagnostics[0]?.code, 'RESOURCE_ENTRY_BUDGET')
  verifyRejection(bytes, 'too many ZIP entries')
})

test('supports nonzero Uint8Array byteOffset with no backing-buffer changes', () => {
  const bytes = sampleSix()
  const backing = new Uint8Array(bytes.length + 23).fill(0xa5)
  backing.set(bytes, 13)
  const input = backing.subarray(13, 13 + bytes.length)
  assert.ok(input.byteOffset > 0)
  const before = backing.slice()
  const result = audit(input)
  assert.equal(result?.ok, true, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(backing, before)
  const {entries} = centralOffsets(input)
  set32(input, entries[0].central + 24, 0x7fffffff)
  set32(input, entries[0].local + 22, 0x7fffffff)
  verifyRejection(input, 'nonzero offset forged sizes')
})

test('fails closed on invalid inputs and truncated ZIP bytes', () => {
  for (const input of [undefined, null, {}, [], new Uint8Array(), new Uint8Array([80, 75, 3, 4]), sampleSix().subarray(0, 17)]) {
    const result = audit(input)
    assert.equal(result?.ok, false, `must reject ${String(input)}`)
    assert.equal(result.manufacturingApproved, false)
    assert.ok(result.diagnostics?.length)
  }
})
