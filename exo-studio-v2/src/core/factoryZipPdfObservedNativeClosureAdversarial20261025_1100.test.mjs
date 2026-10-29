import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, realpathSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { auditObservedNativeDependencyClosure as audit } from './factoryZipPdfObservedNativeClosure20261025_1100.mjs'

function fixture(run) {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), 'exo-observed-native-'))
  const root = join(parent, 'package')
  mkdirSync(root)
  const entry = join(root, 'entry.so')
  writeFileSync(entry, Buffer.from('not a Mach-O binary'))
  try { run({ parent, root, entry }) } finally { rmSync(parent, { recursive: true, force: true }) }
}

test('rejects unapproved options, accessors and proxies without invoking user code', () => fixture(({ root, entry }) => {
  const opts = { packageRoot: root, entryPath: entry }
  assert.throws(() => audit({ ...opts, records: [] }), /UNSAFE_OPTIONS/)
  let calls = 0
  const getter = Object.defineProperty({ packageRoot: root }, 'entryPath', {
    enumerable: true, get() { calls++; return entry }
  })
  assert.throws(() => audit(getter), /UNSAFE_OPTIONS/)
  const proxy = new Proxy(opts, {
    getPrototypeOf() { calls++; return Object.prototype },
    get() { calls++; return entry },
    ownKeys() { calls++; return ['packageRoot', 'entryPath'] }
  })
  assert.throws(() => audit(proxy), /UNSAFE_OPTIONS/)
  assert.equal(calls, 0)
}))

test('rejects lexical traversal, outside entry, and a symbolic-link entry', () => fixture(({ parent, root, entry }) => {
  assert.throws(() => audit({ packageRoot: root, entryPath: join(root, '..', 'entry.so') }), /ENTRY_OUTSIDE_PACKAGE/)
  assert.throws(() => audit({ packageRoot: root, entryPath: root + '/../package/entry.so' }), /UNSAFE_PATH/)
  const link = join(root, 'linked.so')
  symlinkSync(entry, link)
  assert.throws(() => audit({ packageRoot: root, entryPath: link }), /SYMLINK_PATH/)
  assert.throws(() => audit({ packageRoot: root, entryPath: join(parent, 'outside.so') }), /ENTRY_OUTSIDE_PACKAGE/)
}))

test('rejects symbolic-link ancestors and symbolic-link package roots', () => fixture(({ parent, root, entry }) => {
  const sub = join(root, 'native')
  mkdirSync(sub)
  const external = join(parent, 'external')
  mkdirSync(external)
  const externalFile = join(external, 'payload.so')
  writeFileSync(externalFile, 'bad mach-o')
  symlinkSync(external, join(root, 'alias'))
  assert.throws(() => audit({ packageRoot: root, entryPath: join(root, 'alias', 'payload.so') }), /SYMLINK_PATH/)
  const rootAlias = join(parent, 'root-alias')
  symlinkSync(root, rootAlias)
  assert.throws(() => audit({ packageRoot: rootAlias, entryPath: join(rootAlias, 'entry.so') }), /SYMLINK_PATH/)
  assert.equal(existsSync(entry), true)
}))

test('rejects small non Mach-O bytes without executing them', () => fixture(({ root, entry }) => {
  assert.throws(() => audit({ packageRoot: root, entryPath: entry }), /OTOOL_INSPECTION_FAILED|MALFORMED_OTOOL|MALFORMED_LOAD_COMMANDS/)
}))

test('inspects installed PyMuPDF native closure when local installation exists', t => {
  let root
  try {
    root = execFileSync('python3', ['-c', 'import pathlib, pymupdf; print(pathlib.Path(pymupdf.__file__).resolve().parent)'], { encoding: 'utf8', timeout: 3000 }).trim()
  } catch { t.skip('PyMuPDF import unavailable'); return }
  const entry = join(root, '_mupdf.so')
  if (!existsSync(entry)) { t.skip('PyMuPDF _mupdf.so unavailable'); return }
  assert.deepEqual(audit({ packageRoot: root, entryPath: entry }).ok, true)
})
