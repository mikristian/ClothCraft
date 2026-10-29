import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, symlink, link, mkdir, rm, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { realpath } from 'node:fs/promises'
import { initializeLocalPolicyFloor as init, readLocalPolicyFloor as read, advanceLocalPolicyFloor as advance } from './factoryZipPdfLocalFloorCheckpoint20261025_2100.mjs'

async function fixture(fn) {
  const dir = await mkdtemp(join(await realpath(tmpdir()), 'exo-local-floor-'))
  try { await fn(join(dir, 'checkpoint'), dir) } finally { await rm(dir, { recursive: true, force: true }) }
}

test('explicit initialization, persistence, restart-like read, advancement, downgrade rejection', async () => fixture(async path => {
  await assert.rejects(read({ path }), { code: 'ENOENT' })
  await assert.rejects(init({ path, version: 10, trustedInitialization: false }), /TRUSTED_INITIALIZATION_REQUIRED/)
  const initial = await init({ path, version: 10, trustedInitialization: true })
  assert.equal(initial.minimumTrustedVersion, 10)
  assert.equal(initial.rollbackFloorIndependentlyTrusted, false)
  assert.equal(initial.manufacturingApproved, false)
  assert.equal(initial.runtimeExecutionAuthorized, false)
  await assert.rejects(init({ path, version: 8, trustedInitialization: true }), /CHECKPOINT_ALREADY_EXISTS/)
  assert.equal((await read({ path })).minimumTrustedVersion, 10)
  await advance({ path, version: 11 })
  assert.equal((await read({ path })).minimumTrustedVersion, 11)
  await assert.rejects(advance({ path, version: 10 }), /CHECKPOINT_DOWNGRADE/)
  assert.equal((await read({ path })).minimumTrustedVersion, 11)
  await advance({ path, version: 11 })
}))

test('bounded contention serializes updates and retains highest floor', async () => fixture(async path => {
  await init({ path, version: 10, trustedInitialization: true })
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => advance({ path, version: 11 })))
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 8)
  assert.equal((await read({ path })).minimumTrustedVersion, 11)
}))

test('corruption, missing file, invalid versions fail closed', async () => fixture(async path => {
  await assert.rejects(init({ path, version: 0, trustedInitialization: true }), /INVALID_VERSION/)
  await assert.rejects(init({ path, version: Number.MAX_SAFE_INTEGER + 1, trustedInitialization: true }), /INVALID_VERSION/)
  await init({ path, version: 10, trustedInitialization: true })
  await writeFile(path, '{"schema":1,"version":0}\n', { mode: 0o600 })
  await assert.rejects(read({ path }), /CORRUPT_CHECKPOINT/)
  await assert.rejects(advance({ path, version: 11 }), /CORRUPT_CHECKPOINT/)
  await writeFile(path, '{"schema":1,"version":10,"extra":true}\n', { mode: 0o600 })
  await assert.rejects(read({ path }), /CORRUPT_CHECKPOINT/)
}))

test('symlink and hardlink checkpoint rejected; lock residual blocks rather than being stolen', async () => fixture(async (path, dir) => {
  const other = join(dir, 'other')
  await writeFile(other, '{"schema":1,"version":10}\n', { mode: 0o600 })
  await symlink(other, path)
  await assert.rejects(read({ path }), /UNSAFE_CHECKPOINT_FILE/)
  await assert.rejects(init({ path, version: 11, trustedInitialization: true }), /CHECKPOINT_ALREADY_EXISTS/)
  await rm(path)
  await link(other, path)
  await assert.rejects(read({ path }), /UNSAFE_CHECKPOINT_FILE/)
  await rm(path)
  await mkdir(path + '.lock', { mode: 0o700 })
  await assert.rejects(init({ path, version: 11, trustedInitialization: true }), /CHECKPOINT_LOCK_BUSY/)
  await assert.rejects(read({ path }), /CHECKPOINT_LOCK_BUSY/)
}))

test('reject getter and proxy inputs before filesystem operation', async () => fixture(async path => {
  const getter = Object.defineProperty({ version: 10, trustedInitialization: true }, 'path', { enumerable: true, get() { throw Error('getter invoked') } })
  await assert.rejects(init(getter), /INVALID_OPTIONS/)
  await assert.rejects(read(new Proxy({ path }, {})), /UNSAFE_OPTIONS/)
  await assert.rejects(advance({ path, get version() { throw Error('getter invoked') } }), /INVALID_OPTIONS/)
}))

test('LOCAL DISK REPLAY LIMITATION: saved valid v10 bytes can replace v11 on writable filesystem', async () => fixture(async (path, dir) => {
  await init({ path, version: 10, trustedInitialization: true })
  const capturedV10 = await readFile(path)
  await advance({ path, version: 11 })
  assert.equal((await read({ path })).minimumTrustedVersion, 11)
  // Simulates privileged attacker restoring previously captured checkpoint bytes.
  await writeFile(path, capturedV10, { mode: 0o600 })
  const replayed = await read({ path })
  assert.equal(replayed.minimumTrustedVersion, 10)
  assert.equal(replayed.rollbackFloorIndependentlyTrusted, false)
}))
