import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inventoryPythonPackage } from './factoryZipPdfDependencyInventory20261025_0755.mjs'
import { parsePinnedPythonPackageManifest, comparePinnedPythonPackageManifest } from './factoryZipPdfPinnedDependencyManifest20261025_0854.mjs'

const pin = bytes => createHash('sha256').update(bytes).digest('hex')
const parse = bytes => parsePinnedPythonPackageManifest({ manifestBytes: bytes, pinnedSha256: pin(bytes) })

test('canonical manifest compares against a tiny directory and rejects changed content', async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), 'pinned-inventory-'))
  try {
    await mkdir(join(dir, 'package'))
    await writeFile(join(dir, 'package', '__init__.py'), 'a\n')
    await writeFile(join(dir, 'package', 'native.so'), Buffer.from([0, 1]))
    const inventory = await inventoryPythonPackage({ directory: dir })
    const bytes = Buffer.from(JSON.stringify(inventory.files))
    assert.deepEqual({ ...parse(bytes) }, inventory.files)
    const args = { directory: dir, manifestBytes: bytes, pinnedSha256: pin(bytes) }
    assert.equal((await comparePinnedPythonPackageManifest(args)).reason, 'MATCH')
    await writeFile(join(dir, 'package', 'native.so'), Buffer.from([0, 2]))
    assert.equal((await comparePinnedPythonPackageManifest(args)).reason, 'HASH_MISMATCH')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('reject duplicate paths, reorder, whitespace, escapes, malformed UTF-8 and digest mismatch', () => {
  const a = 'a'.repeat(64)
  const b = 'b'.repeat(64)
  for (const s of [
    `{"a":"${a}","a":"${b}"}`,
    `{"b":"${b}","a":"${a}"}`,
    `{ "a":"${a}"}`,
    `{"a": "${a}"}`,
    `{"a\\u0020":"${a}"}`,
    `{"../bad":"${a}"}`,
    `{"__proto__":"${a}","a":"${b}"}`,
    `{"a":"${a.toUpperCase()}"}`,
  ]) assert.throws(() => parse(Buffer.from(s)), /NONCANONICAL_MANIFEST/)
  assert.throws(() => parse(Buffer.from([0x7b, 0xff, 0x7d])), /INVALID_UTF8/)
  const bytes = Buffer.from('{}')
  assert.throws(() => parsePinnedPythonPackageManifest({ manifestBytes: bytes, pinnedSha256: '0'.repeat(64) }), /PIN_MISMATCH/)
  assert.throws(() => parsePinnedPythonPackageManifest({ manifestBytes: Buffer.alloc(128 * 1024 + 1), pinnedSha256: 'a'.repeat(64) }), /MANIFEST_SIZE_LIMIT/)
})

test('reject proxy, accessors and unknown fields before invoking traps', () => {
  let traps = 0
  const proxy = new Proxy(Buffer.from('{}'), { getPrototypeOf() { traps++; return Buffer.prototype }, get() { traps++; return 2 } })
  assert.throws(() => parsePinnedPythonPackageManifest({ manifestBytes: proxy, pinnedSha256: 'a'.repeat(64) }), /UNSAFE_MANIFEST_BYTES/)
  const optionsProxy = new Proxy({}, { ownKeys() { traps++; return [] }, getPrototypeOf() { traps++; return Object.prototype } })
  assert.throws(() => parsePinnedPythonPackageManifest(optionsProxy), /UNSAFE_OPTIONS/)
  assert.throws(() => parsePinnedPythonPackageManifest({ get manifestBytes() { traps++; return Buffer.from('{}') } }), /UNSAFE_OPTIONS/)
  assert.throws(() => parsePinnedPythonPackageManifest({ manifestBytes: Buffer.from('{}'), pinnedSha256: pin(Buffer.from('{}')), extra: true }), /UNSAFE_OPTIONS/)
  assert.equal(traps, 0)
})

test('reject shared-backed Buffer and Uint8Array before checking a matching pin', () => {
  const backing = new SharedArrayBuffer(2)
  new Uint8Array(backing).set(Buffer.from('{}'))
  const matchingPin = pin(Buffer.from('{}'))
  for (const manifestBytes of [Buffer.from(backing), new Uint8Array(backing)]) {
    assert.throws(() => parsePinnedPythonPackageManifest({ manifestBytes, pinnedSha256: matchingPin }), /UNSAFE_SHARED_MANIFEST_BYTES/)
  }
  assert.deepEqual({ ...parse(Buffer.from('{}')) }, {})
})
