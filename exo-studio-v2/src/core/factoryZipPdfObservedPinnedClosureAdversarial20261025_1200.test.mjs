import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, symlinkSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auditPinnedObservedNativeClosure as audit } from './factoryZipPdfObservedPinnedClosure20261025_1200.mjs'

function fixture(t) {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'pinned-observed-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const entryPath = join(root, 'fake.so')
  const content = Buffer.from('not a Mach-O binary')
  writeFileSync(entryPath, content)
  const hash = data => createHash('sha256').update(data).digest('hex')
  const manifestBytes = Buffer.from(JSON.stringify({ 'fake.so': hash(content) }))
  return { packageRoot: root, entryPath, manifestBytes, pinnedSha256: hash(manifestBytes) }
}

test('unexpected option, especially manufacturingApproved:true, rejects', async t => {
  const options = fixture(t)
  await assert.rejects(audit({ ...options, manufacturingApproved: true }), /UNSAFE_OPTIONS/)
  await assert.rejects(audit({ ...options, arbitrary: false }), /UNSAFE_OPTIONS/)
})

test('accessors and Proxy are rejected without invoking traps', async t => {
  const options = fixture(t)
  let hits = 0
  const accessor = Object.defineProperty({ ...options }, 'manufacturingApproved', {
    enumerable: true, get() { hits++; throw Error('getter executed') }
  })
  await assert.rejects(audit(accessor), /UNSAFE_OPTIONS/)
  const inputAccessor = Object.defineProperty({ ...options }, 'packageRoot', {
    enumerable: true, get() { hits++; throw Error('getter executed') }
  })
  await assert.rejects(audit(inputAccessor), /UNSAFE_OPTIONS/)
  const proxy = new Proxy({ ...options }, {
    get() { hits++; throw Error('proxy trap executed') },
    ownKeys() { hits++; throw Error('proxy trap executed') },
    getPrototypeOf() { hits++; throw Error('proxy trap executed') }
  })
  await assert.rejects(audit(proxy), /UNSAFE_OPTIONS/)
  assert.equal(hits, 0)
})

test('self-consistent forged pin does not make plain bytes into a native binary', async t => {
  const options = fixture(t)
  await assert.rejects(audit(options))
})

test('wrong pinned manifest digest rejects', async t => {
  const options = fixture(t)
  await assert.rejects(audit({ ...options, pinnedSha256: '0'.repeat(64) }), /PIN_MISMATCH/)
})

test('symlinked package root rejects even with matching manifest', async t => {
  const options = fixture(t)
  const alias = join(options.packageRoot, 'alias')
  symlinkSync(options.packageRoot, alias)
  await assert.rejects(audit({ ...options, packageRoot: alias, entryPath: join(alias, 'fake.so') }))
})

test('any successful result must explicitly refuse manufacturing approval', async t => {
  // The tiny forged package must never succeed. Live native success is tested
  // separately only when a pinned complete package fixture is available.
  const options = fixture(t)
  let success
  try { success = await audit(options) } catch { return }
  assert.equal(success.ok, true)
  assert.equal(Object.hasOwn(success, 'manufacturingApproved'), true)
  assert.equal(success.manufacturingApproved, false)
  assert.fail('non-Mach-O fixture unexpectedly accepted')
})
