import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, writeFileSync, rmSync, realpathSync, copyFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { auditPinnedObservedNativeClosure as audit } from './factoryZipPdfObservedPinnedClosure20261025_1200.mjs'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const fixture = () => {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'pinned-observed-')))
  const name = 'entry.so'
  writeFileSync(join(root, name), 'not a Mach-O')
  const manifestBytes = Buffer.from(JSON.stringify({ [name]: digest('not a Mach-O') }))
  return { root, options: { packageRoot: root, entryPath: join(root, name), manifestBytes, pinnedSha256: digest(manifestBytes) } }
}

test('rejects malformed, proxy and accessor options without invoking accessors', async () => {
  let called = 0
  const value = new Proxy({}, { get() { called++ } })
  await assert.rejects(audit(value), /UNSAFE_OPTIONS/)
  const accessor = Object.defineProperty({}, 'packageRoot', { get() { called++ } })
  await assert.rejects(audit(accessor), /UNSAFE_OPTIONS/)
  await assert.rejects(audit({ packageRoot: '/tmp', unexpected: true }), /UNSAFE_OPTIONS/)
  await assert.rejects(audit(Object.create({ packageRoot: '/tmp' })), /UNSAFE_OPTIONS/)
  assert.equal(called, 0)
})

test('rejects incorrect pin and modified package before attempting native observation', async () => {
  const f = fixture()
  try {
    await assert.rejects(audit({ ...f.options, pinnedSha256: '0'.repeat(64) }), /PIN_MISMATCH/)
    writeFileSync(f.options.entryPath, 'tampered')
    await assert.rejects(audit(f.options), /PINNED_MANIFEST_MISMATCH_BEFORE/)
  } finally { rmSync(f.root, { recursive: true, force: true }) }
})

test('matching ordinary inventory reaches native observer and fails closed for non Mach-O', async () => {
  const f = fixture()
  try { await assert.rejects(audit(f.options), /OTOOL_INSPECTION_FAILED|MALFORMED_LOAD_COMMANDS/) }
  finally { rmSync(f.root, { recursive: true, force: true }) }
})

test('small real Mach-O control with exact pin succeeds and remains development only', {
  skip: !existsSync('/usr/bin/otool') || !existsSync('/usr/bin/true')
}, async () => {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'pinned-observed-valid-')))
  try {
    const entryPath = join(root, 'entry')
    copyFileSync('/usr/bin/true', entryPath)
    const manifestBytes = Buffer.from(JSON.stringify({ entry: digest(readFileSync(entryPath)) }))
    const result = await audit({ packageRoot: root, entryPath, manifestBytes, pinnedSha256: digest(manifestBytes) })
    assert.equal(result.ok, true)
    assert.equal(result.inspectedNodes, 1)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(Object.isFrozen(result), true)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
