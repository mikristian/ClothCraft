import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inventoryPythonPackage, comparePythonPackageManifest } from './factoryZipPdfDependencyInventory20261025_0755.mjs'

async function fixture(fn) {
  const dir = await mkdtemp(join(await realpath(tmpdir()), 'inventory-dev-'))
  try {
    await mkdir(join(dir, 'pymupdf'))
    await writeFile(join(dir, 'pymupdf', '__init__.py'), 'module = 1\n')
    await writeFile(join(dir, 'pymupdf', '_mupdf.so'), Buffer.from([0, 1, 2, 3]))
    return await fn(dir)
  } finally { await rm(dir, { recursive: true, force: true }) }
}

test('deterministic inventory and caller pinned exact manifest', async () => fixture(async dir => {
  const first = await inventoryPythonPackage({ directory: dir })
  assert.equal(first.fileCount, 2)
  assert.deepEqual(first, await inventoryPythonPackage({ directory: dir }))
  assert.equal((await comparePythonPackageManifest({ directory: dir, manifest: first.files })).ok, true)
  await writeFile(join(dir, 'pymupdf', '_mupdf.so'), Buffer.from([0, 1, 2, 4]))
  assert.equal((await comparePythonPackageManifest({ directory: dir, manifest: first.files })).reason, 'HASH_MISMATCH')
  await writeFile(join(dir, 'pymupdf', '_extra.so'), 'native')
  assert.equal((await comparePythonPackageManifest({ directory: dir, manifest: first.files })).reason, 'FILE_SET_MISMATCH')
}))

test('reject symlinks, unsafe names, and limited budgets', async () => fixture(async dir => {
  await assert.rejects(inventoryPythonPackage({ directory: dir, maxFiles: 1 }), /FILE_LIMIT/)
  await assert.rejects(inventoryPythonPackage({ directory: dir, maxBytes: 1 }), /BYTE_LIMIT/)
  await assert.rejects(inventoryPythonPackage({ directory: dir, maxFileBytes: 1 }), /BYTE_LIMIT/)
  await assert.rejects(inventoryPythonPackage({ directory: `${dir}/../outside` }), /TRAVERSAL_REJECTED/)
  await symlink(join(dir, 'pymupdf', '__init__.py'), join(dir, 'pymupdf', 'link.py'))
  await assert.rejects(inventoryPythonPackage({ directory: dir }), /SYMLINK_REJECTED/)
  await rm(join(dir, 'pymupdf', 'link.py'))
  await writeFile(join(dir, 'pymupdf', 'bad name.py'), '')
  await assert.rejects(inventoryPythonPackage({ directory: dir }), /UNSAFE_FILENAME/)
}))

test('reject proxy and getter options or manifest without invoking their traps', async () => fixture(async dir => {
  let called = 0
  const proxy = new Proxy({ directory: dir }, { getPrototypeOf() { called++; return Object.prototype } })
  await assert.rejects(inventoryPythonPackage(proxy), /UNSAFE_OPTIONS/)
  assert.equal(called, 0)
  await assert.rejects(inventoryPythonPackage({ get directory() { called++; return dir } }), /UNSAFE_OPTIONS/)
  assert.equal(called, 0)
  await assert.rejects(comparePythonPackageManifest({ directory: dir, manifest: new Proxy({}, {}) }), /UNSAFE_OPTIONS/)
  await assert.rejects(comparePythonPackageManifest({ directory: dir, manifest: { '../escape': 'a'.repeat(64) } }), /UNSAFE_MANIFEST|FILE_SET_MISMATCH/)
}))
