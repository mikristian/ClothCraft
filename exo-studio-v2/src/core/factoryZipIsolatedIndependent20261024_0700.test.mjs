import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {auditFactoryZipInIsolatedProcess20261024_0700 as audit} from './factoryZipIsolatedAudit20261024_0700.mjs'

const encoder = new TextEncoder()
const sixSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const makeSix = () => zipSync(Object.fromEntries(sixSizes.map(size => [
  `patterns/foundation-${size}.dxf`, encoder.encode(`SIZE=${size}\nCUT\n`.repeat(40))
])), {level: 6})

function entries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = at => view.getUint16(at, true)
  const u32 = at => view.getUint32(at, true)
  let end = -1
  for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 22 - 65535); pos--) {
    if (u32(pos) === 0x06054b50 && pos + 22 + u16(pos + 20) === bytes.length) {
      end = pos
      break
    }
  }
  assert.ok(end >= 0, 'test fixture must contain ZIP EOCD')
  const list = []
  let cursor = u32(end + 16)
  for (let i = 0; i < u16(end + 10); i++) {
    assert.equal(u32(cursor), 0x02014b50)
    list.push({central: cursor, local: u32(cursor + 42)})
    cursor += 46 + u16(cursor + 28) + u16(cursor + 30) + u16(cursor + 32)
  }
  return list
}

function assertAudit(result, accepted) {
  assert.equal(result?.ok, accepted, JSON.stringify(result))
  assert.equal(result?.manufacturingApproved, false, 'audit never approves manufacturing')
  assert.ok(Array.isArray(result.diagnostics), 'diagnostics array required')
  if (!accepted) assert.ok(result.diagnostics.length > 0, 'rejection must explain failure')
}

test('isolated audit accepts bounded six-size DEFLATE archive without modifying input', async () => {
  const bytes = makeSix()
  assert.equal(entries(bytes).length, 6)
  const snapshot = bytes.slice()
  assertAudit(await audit(bytes), true)
  assert.deepEqual(bytes, snapshot)
})

test('isolated audit accepts the genuine generated Foundation Tee factory ZIP', async () => {
  const built = buildGuardedFactoryManifestZip20261024_0053(createTeeTemplate())
  assert.equal(built.ok, true, JSON.stringify(built.diagnostics ?? built.reason))
  assert.ok(entries(built.bytes).length >= 60 && entries(built.bytes).length <= 80, 'factory archive must remain within 80-entry preflight cap')
  const snapshot = built.bytes.slice()
  assertAudit(await audit(built.bytes), true)
  assert.deepEqual(built.bytes, snapshot)
})

test('isolated audit rejects forged decoded size even if local and central size fields agree', async () => {
  const bytes = makeSix()
  const {central, local} = entries(bytes)[0]
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  view.setUint32(central + 24, 1, true)
  view.setUint32(local + 22, 1, true)
  const snapshot = bytes.slice()
  assertAudit(await audit(bytes), false)
  assert.deepEqual(bytes, snapshot)
})

test('isolated audit fails closed on corrupt compressed data without mutating input', async () => {
  const bytes = makeSix()
  const {local} = entries(bytes)[0]
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const payload = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
  bytes[payload] ^= 0xff
  const snapshot = bytes.slice()
  assertAudit(await audit(bytes), false)
  assert.deepEqual(bytes, snapshot)
})

test('isolated audit rejects malformed and unsupported inputs', async () => {
  for (const input of [undefined, null, {}, [], new Uint8Array(), new Uint8Array([0x50, 0x4b, 3, 4])]) {
    assertAudit(await audit(input), false)
  }
})

test('isolated audit respects Uint8Array offsets and does not alter surrounding backing storage', async () => {
  const bytes = makeSix()
  const backing = new Uint8Array(bytes.length + 27).fill(0x9b)
  backing.set(bytes, 11)
  const sliced = backing.subarray(11, 11 + bytes.length)
  const snapshot = backing.slice()
  assertAudit(await audit(sliced), true)
  assert.deepEqual(backing, snapshot)
})

test('isolated audit rejects invalid deadlines without approving or modifying input', async () => {
  const bytes = makeSix()
  const snapshot = bytes.slice()
  for (const timeoutMs of [0, -1, 30001, 1.5, '10']) {
    const result = await audit(bytes, {timeoutMs})
    assertAudit(result, false)
    assert.equal(result.diagnostics[0]?.code, 'ISOLATED_OPTIONS')
  }
  assert.deepEqual(bytes, snapshot)
})

test('isolated audit enforces a one-millisecond child deadline fail closed', async () => {
  const bytes = makeSix()
  const snapshot = bytes.slice()
  const result = await audit(bytes, {timeoutMs: 1})
  assertAudit(result, false)
  assert.equal(result.diagnostics[0]?.code, 'ISOLATED_TIMEOUT', JSON.stringify(result))
  assert.deepEqual(bytes, snapshot)
})
