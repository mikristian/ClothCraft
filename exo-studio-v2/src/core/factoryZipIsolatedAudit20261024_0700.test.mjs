import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipInIsolatedProcess20261024_0700 as audit} from './factoryZipIsolatedAudit20261024_0700.mjs'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const fixture = level => zipSync(Object.fromEntries(sizes.map(s => ['patterns/' + s + '.dxf', strToU8('DXF ' + s + ' panel '.repeat(12))])), {level})
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const firstCentral = bytes => view(bytes).getUint32(bytes.length - 6, true)
const put32 = (bytes, at, n) => view(bytes).setUint32(at, n >>> 0, true)
const u32 = (bytes, at) => view(bytes).getUint32(at, true)

test('six-size STORE and DEFLATE pass isolated CRC, preserve caller bytes, never certify', async () => {
  for (const level of [0, 6]) {
    const bytes = fixture(level)
    const original = bytes.slice()
    assert.deepEqual(await audit(bytes), {ok: true, diagnostics: [], manufacturingApproved: false})
    assert.deepEqual(bytes, original)
  }
})
test('forged matching CRC is rejected in child', async () => {
  const bytes = fixture(0)
  const at = firstCentral(bytes)
  const local = u32(bytes, at + 42)
  put32(bytes, at + 16, u32(bytes, at + 16) ^ 0x80000000)
  put32(bytes, local + 14, u32(bytes, local + 14) ^ 0x80000000)
  const before = bytes.slice()
  const result = await audit(bytes)
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics[0].code, 'CRC_MISMATCH')
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(bytes, before)
})
test('forged uncompressed size rejected', async () => {
  const bytes = fixture(6)
  const at = firstCentral(bytes)
  const local = u32(bytes, at + 42)
  put32(bytes, at + 24, 1)
  put32(bytes, local + 22, 1)
  const result = await audit(bytes)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
})
test('oversized archive rejected by static budget before spawn', async () => {
  const result = await audit(new Uint8Array(16 * 1024 * 1024 + 1))
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics[0].code, 'RESOURCE_ARCHIVE_BUDGET')
  assert.equal(result.manufacturingApproved, false)
})
test('deadline aborts child without approval', async () => {
  const result = await audit(fixture(0), {timeoutMs: 1})
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics[0].code, 'ISOLATED_TIMEOUT')
  assert.equal(result.manufacturingApproved, false)
})
test('invalid options fail closed', async () => {
  const result = await audit(fixture(0), {timeoutMs: -1})
  assert.equal(result.ok, false)
  assert.equal(result.diagnostics[0].code, 'ISOLATED_OPTIONS')
})
test('SharedArrayBuffer source mutation after invocation does not change verified snapshot', async () => {
  const original = fixture(0)
  const shared = new Uint8Array(new SharedArrayBuffer(original.byteLength))
  shared.set(original)
  const pending = audit(shared)
  shared.fill(0)
  assert.deepEqual(await pending, {ok: true, diagnostics: [], manufacturingApproved: false})
  const corrupted = await audit(shared)
  assert.equal(corrupted.ok, false)
  assert.equal(corrupted.manufacturingApproved, false)
})
test('invalid input preserves guard diagnostics without spawning', async () => {
  assert.deepEqual(await audit(null), {
    ok: false, diagnostics: [{code: 'INVALID_INPUT', message: 'Expected Uint8Array ZIP bytes'}],
    manufacturingApproved: false
  })
})
