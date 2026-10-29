import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { runTrustedPdfVerifier, matchesPinnedDigest } from './factoryZipPdfTrustedLaunch20261025_0557.mjs'

test('rejects caller-supplied launch controls and malformed objects', async () => {
  for (const value of [undefined, null, '', [], { input: '', command: '/bin/sh' },
    { input: '', args: ['-c', 'exit 0'] }, { input: '', allowedCommand: '/bin/sh' },
    { input: '', allowedArgs: [] }, { input: '', sampleRssKb: () => 1 },
    { input: '', timeoutMs: 1 }, { input: '', rssLimitKb: 1 },
    { input: 'x'.repeat(65537) }, Object.create({ input: '{}' }),
    Object.defineProperty({}, 'input', { get() { throw Error('accessor executed') }, enumerable: true }),
    new Proxy({}, { ownKeys() { throw Error('proxy trap') } })]) {
    const result = await runTrustedPdfVerifier(value)
    assert.equal(result.accepted, false)
    assert.equal(result.reason, 'invalid input')
    assert.equal(result.manufacturingApproved, false)
  }
})

test('rejects transparent Proxy before invoking any reflection traps', async () => {
  let traps = 0
  const value = new Proxy({ input: '{}' }, {
    getPrototypeOf(target) { traps++; return Reflect.getPrototypeOf(target) },
    ownKeys(target) { traps++; return Reflect.ownKeys(target) },
    getOwnPropertyDescriptor(target, key) { traps++; return Reflect.getOwnPropertyDescriptor(target, key) },
  })
  const result = await runTrustedPdfVerifier(value)
  assert.equal(traps, 0)
  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'invalid input')
  assert.equal(result.manufacturingApproved, false)
})

test('digest detects safe fixture mutation and symlink', () => {
  const directory = mkdtempSync(join(tmpdir(), 'exo-trusted-launch-'))
  try {
    const file = join(realpathSync(directory), 'verifier.py')
    writeFileSync(file, 'print(1)\n')
    const digest = createHash('sha256').update('print(1)\n').digest('hex')
    assert.equal(matchesPinnedDigest(file, digest), true)
    writeFileSync(file, 'print(2)\n')
    assert.equal(matchesPinnedDigest(file, digest), false)
    const link = join(realpathSync(directory), 'alias.py')
    symlinkSync(file, link)
    assert.equal(matchesPinnedDigest(link, digest), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('real pinned verifier invocation fails closed on malformed request', async () => {
  const result = await runTrustedPdfVerifier({ input: '{}' })
  assert.equal(result.accepted, false)
  assert.equal(result.manufacturingApproved, false)
  assert.ok(typeof result.reason === 'string')
  assert.notEqual(result.reason, 'verifier integrity mismatch')
})
