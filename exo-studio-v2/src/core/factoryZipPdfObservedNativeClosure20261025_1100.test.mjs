import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, symlinkSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auditObservedNativeDependencyClosure as observe } from './factoryZipPdfObservedNativeClosure20261025_1100.mjs'

const root = '/Users/mikylecouto/Library/Python/3.9/lib/python/site-packages/pymupdf'
const names = ['_mupdf.so', '_extra.so', 'libmupdfcpp.so', 'libmupdf.dylib']

test('actual four PyMuPDF binaries: observed LC_ID and LC_LOAD_DYLIB agree with -L', { skip: !names.every(n => existsSync(join(root, n))) }, () => {
  assert.deepEqual(names.map(n => observe({ packageRoot: root, entryPath: join(root, n) }).inspectedNodes), [3, 3, 2, 1])
})

test('only own primitive source root and entry are accepted', () => {
  assert.throws(() => observe({ packageRoot: '/tmp', entryPath: '/tmp/../etc/passwd' }), /UNSAFE_PATH/)
  assert.throws(() => observe({ packageRoot: '/tmp', entryPath: '/etc/passwd' }), /ENTRY_OUTSIDE_PACKAGE/)
  assert.throws(() => observe({ packageRoot: '/tmp', entryPath: '/tmp/a', output: 'forged' }), /UNSAFE_OPTIONS/)
  let invoked = 0
  const trap = new Proxy({ packageRoot: '/tmp', entryPath: '/tmp/a' }, { get() { invoked++; return '/tmp' } })
  assert.throws(() => observe(trap), /UNSAFE_OPTIONS/)
  const getter = Object.defineProperty({ packageRoot: '/tmp' }, 'entryPath', { get() { invoked++ } })
  assert.throws(() => observe(getter), /UNSAFE_OPTIONS/)
  assert.equal(invoked, 0)
})

test('symlink entry and ancestor rejected before external tool invocation', () => {
  const temp = realpathSync.native(mkdtempSync(join(tmpdir(), 'observed-native-')))
  try {
    symlinkSync('/usr/bin/otool', join(temp, 'otool-link'))
    assert.throws(() => observe({ packageRoot: temp, entryPath: join(temp, 'otool-link') }), /SYMLINK_PATH/)
    symlinkSync(temp, join(temp, 'sub-link'))
    assert.throws(() => observe({ packageRoot: temp, entryPath: join(temp, 'sub-link', 'otool-link') }), /SYMLINK_PATH/)
  } finally { rmSync(temp, { recursive: true, force: true }) }
})

test('non Mach-O input fails closed', () => {
  const temp = realpathSync.native(mkdtempSync(join(tmpdir(), 'observed-native-')))
  try {
    assert.throws(() => observe({ packageRoot: temp, entryPath: join(temp, 'absent') }), /ENOENT/)
  } finally { rmSync(temp, { recursive: true, force: true }) }
})
