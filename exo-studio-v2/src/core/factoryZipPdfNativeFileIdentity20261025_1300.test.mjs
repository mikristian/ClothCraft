import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync, rmSync, truncateSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { auditNativeFileIdentity } from './factoryZipPdfNativeFileIdentity20261025_1300.mjs'

function fixture(fn) {
  const tmp = mkdtempSync(join(realpathSync.native(tmpdir()), 'exo-file-identity-'))
  const root = join(tmp, 'package')
  mkdirSync(root)
  const entry = join(root, 'native.so')
  writeFileSync(entry, 'safe native fixture')
  try { fn({ tmp, root, entry }) } finally { rmSync(tmp, { recursive: true, force: true }) }
}

test('accepts ordinary file with expected digest; result is immutable and nonauthorizing', () => fixture(({root, entry}) => {
  const expectedSha256 = createHash('sha256').update('safe native fixture').digest('hex')
  const result = auditNativeFileIdentity({ packageRoot: root, entryPath: entry, expectedSha256 })
  assert.equal(result.ok, true)
  assert.equal(result.sha256, expectedSha256)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.runtimeExecutionAuthorized, false)
  assert.equal(Object.isFrozen(result), true)
  assert.match(result.dev, /^\d+$/)
  assert.match(result.ino, /^\d+$/)
}))

test('rejects digest mismatch and changed content', () => fixture(({root, entry}) => {
  const prior = auditNativeFileIdentity({packageRoot: root, entryPath: entry}).sha256
  writeFileSync(entry, 'changed fixture')
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: entry, expectedSha256: prior}), /DIGEST_MISMATCH/)
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: entry, expectedSha256: 'not a digest'}), /INVALID_DIGEST/)
}))

test('rejects symlink entry, root, and intermediate path', () => fixture(({tmp, root, entry}) => {
  const link = join(root, 'linked.so')
  symlinkSync(entry, link)
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: link}), /SYMLINK_COMPONENT/)
  const linkedRoot = join(tmp, 'linked-root')
  symlinkSync(root, linkedRoot)
  assert.throws(() => auditNativeFileIdentity({packageRoot: linkedRoot, entryPath: join(linkedRoot, 'native.so')}), /SYMLINK_COMPONENT/)
  const real = join(root, 'nested')
  mkdirSync(real)
  writeFileSync(join(real, 'inner.so'), 'file')
  symlinkSync(real, join(root, 'alias'))
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: join(root, 'alias', 'inner.so')}), /SYMLINK_COMPONENT/)
}))

test('rejects entry hardlink and nonregular entry', () => fixture(({root, entry}) => {
  const copy = join(root, 'hardlink.so')
  linkSync(entry, copy)
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: entry}), /HARDLINK_ENTRY/)
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: root}), /ENTRY_OUTSIDE_PACKAGE/)
  mkdirSync(join(root, 'dir'))
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: join(root, 'dir')}), /INVALID_FILE_TYPE/)
}))

test('rejects path traversal, malformed paths, and outside entry', () => fixture(({tmp, root, entry}) => {
  for (const candidate of [join(tmp, 'other'), root + '/../package/native.so', entry + '/..', root + '//native.so', entry + '\0']) {
    assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: candidate}))
  }
  assert.throws(() => auditNativeFileIdentity({packageRoot: root + '/', entryPath: entry}), /UNSAFE_PATH/)
}))

test('rejects proxy and accessors without invoking traps or getters', () => fixture(({root, entry}) => {
  let invoked = 0
  const evil = new Proxy({ packageRoot: root, entryPath: entry }, { get() { invoked++; throw Error('PROXY_TRAP') }, ownKeys() { invoked++; throw Error('PROXY_TRAP') } })
  assert.throws(() => auditNativeFileIdentity(evil), /UNSAFE_OPTIONS/)
  const getter = { packageRoot: root, get entryPath() { invoked++; throw Error('GETTER_INVOKED') } }
  assert.throws(() => auditNativeFileIdentity(getter), /UNSAFE_OPTIONS/)
  assert.equal(invoked, 0)
  assert.throws(() => auditNativeFileIdentity({ packageRoot: root, entryPath: entry, manufacturingApproved: true }), /UNSAFE_OPTIONS/)
}))

test('rejects oversized file without hashing it', () => fixture(({root, entry}) => {
  truncateSync(entry, 32 * 1024 * 1024 + 1)
  assert.throws(() => auditNativeFileIdentity({packageRoot: root, entryPath: entry}), /FILE_SIZE_LIMIT/)
}))

