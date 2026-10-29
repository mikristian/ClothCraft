import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const original = fileURLToPath(new URL('./factoryZipMarkerIsolated20261024_1302.mjs', import.meta.url))
const parentName = 'factoryZipMarkerIsolated20261024_1302.mjs'
const workerName = 'factoryZipMarkerIsolatedWorker20261024_1302.mjs'

async function fixture(t, childSource, timeoutMs = 12000) {
  const dir = mkdtempSync(join(tmpdir(), 'exo-marker-isolation-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const originalSource = readFileSync(original, 'utf8')
  assert.match(originalSource, /timeoutMs: 12000/)
  writeFileSync(join(dir, parentName), originalSource.replace('timeoutMs: 12000', `timeoutMs: ${timeoutMs}`))
  writeFileSync(join(dir, workerName), childSource)
  return import(pathToFileURL(join(dir, parentName)).href)
}

function expectFailure(result, code) {
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
  assert.equal(result.diagnostics.length, 1)
  assert.equal(result.diagnostics[0].code, code)
}

const files = () => ({ 'sample.bin': Uint8Array.from([2, 3, 5, 7]) })

test('real child SIGKILL deadline reports a bounded timeout diagnostic', { concurrency: false }, async t => {
  // Test-only 350 ms deadline: production source retains its 12,000 ms deadline.
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); setInterval(() => {}, 1000)", 350,
  )
  const start = performance.now()
  const result = await audit(files())
  const elapsed = performance.now() - start
  expectFailure(result, 'ISOLATED_TIMEOUT')
  assert.ok(elapsed >= 250, `deadline was not exercised: ${elapsed}ms`)
  assert.ok(elapsed < 5000, `child failed to terminate promptly: ${elapsed}ms`)
})

test('well-formed process exit with malformed stdout fails protocol closed', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('{not json'))",
  )
  expectFailure(await audit(files()), 'ISOLATED_PROTOCOL_ERROR')
})

test('abnormal child exit fails closed regardless of stdout contents', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => { process.stdout.write('\\\"ok\\\"'); process.exitCode = 17 })",
  )
  expectFailure(await audit(files()), 'ISOLATED_CHILD_FAILED')
})

test('valid success-shaped stdout with exit code 17 fails closed', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:false,physicalRegistrationVerified:false})); process.exitCode = 17 })",
  )
  expectFailure(await audit(files()), 'ISOLATED_CHILD_FAILED')
})

test('stdout beyond 128 KiB kills child and reports output limit', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('X'.repeat(140000)))",
  )
  expectFailure(await audit(files()), 'ISOLATED_OUTPUT_LIMIT')
})

test('stderr beyond 128 KiB kills child and reports output limit', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => process.stderr.write('E'.repeat(140000)))",
  )
  expectFailure(await audit(files()), 'ISOLATED_OUTPUT_LIMIT')
})

test('child cannot grant manufacturing approval; caller inputs stay unchanged', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:true,physicalRegistrationVerified:true})))",
  )
  const source = files()
  const project = { name: 'fixture', sizes: ['M'], notes: { release: false } }
  const beforeFiles = Uint8Array.from(source['sample.bin'])
  const beforeProject = structuredClone(project)
  expectFailure(await audit(source, project), 'ISOLATED_PROTOCOL_ERROR')
  assert.deepEqual(source['sample.bin'], beforeFiles)
  assert.deepEqual(project, beforeProject)
})

test('valid child response still cannot convey manufacturing or physical approval', { concurrency: false }, async t => {
  const { auditFactoryZipMarkerIsolated20261024_1302: audit } = await fixture(
    t, "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:false,physicalRegistrationVerified:false})))",
  )
  const result = await audit(files())
  assert.deepEqual(result, { ok: true, diagnostics: [], manufacturingApproved: false, physicalRegistrationVerified: false })
})
