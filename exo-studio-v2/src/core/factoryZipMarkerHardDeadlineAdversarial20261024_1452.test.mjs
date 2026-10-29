import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const modulePath = fileURLToPath(new URL('./factoryZipMarkerHardDeadline20261024_1452.mjs', import.meta.url))
const expectedExport = 'auditFactoryZipMarkerHardDeadline20261024_1452'
const sourceFiles = () => ({ 'sample.bin': Uint8Array.of(2, 3, 5, 7) })
const cleanResult = { ok: true, diagnostics: [], manufacturingApproved: false, physicalRegistrationVerified: false }

async function harness(t, childSource, { deadlineMs = 2500, stdoutLimit = 8192 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'exo-hard-deadline-adversarial-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  let source = readFileSync(modulePath, 'utf8')
  assert.match(source, new RegExp('export\\s+(?:async\\s+)?function\\s+' + expectedExport + '\\b'), 'expected new public API')
  const deadlineMatch = source.match(/timeoutMs:\s*(\d+)/)
  assert.ok(deadlineMatch, 'wrapper declares a timeout constant')
  source = source.replace(deadlineMatch[0], 'timeoutMs: ' + deadlineMs)
  const limitMatch = source.match(/maxOutputBytes:\s*(\d+)(?:\s*\*\s*(\d+))?/)
  assert.ok(limitMatch, 'wrapper declares a maximum output constant')
  source = source.replace(limitMatch[0], 'maxOutputBytes: ' + stdoutLimit)
  const workerMatch = source.match(/new URL\(['"]\.\/(.*?)['"],\s*import\.meta\.url\)/)
  assert.ok(workerMatch, 'worker path is module-relative')
  const basename = modulePath.split('/').at(-1)
  writeFileSync(join(dir, basename), source)
  writeFileSync(join(dir, workerMatch[1]), childSource)
  const imported = await import(pathToFileURL(join(dir, basename)).href)
  assert.equal(typeof imported[expectedExport], 'function')
  return imported[expectedExport]
}

function diagnostic(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
  assert.deepEqual(result.diagnostics.map(d => d.code), [code])
}

test('deadline resolves despite a grandchild holding stdout open after child exits', { concurrency: false }, async t => {
  // The grandchild has no stdout activity and exits by itself; no background residue.
  const worker = `
    const { spawn } = await import('node:child_process')
    const grandchild = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 1100)'],
      { stdio: ['ignore', 'inherit', 'ignore'] })
    grandchild.unref()
    process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:false,physicalRegistrationVerified:false}))
  `
  const audit = await harness(t, worker, { deadlineMs: 500 })
  const start = performance.now()
  const result = await audit(sourceFiles())
  const elapsed = performance.now() - start
  diagnostic(result, 'ISOLATED_TIMEOUT')
  assert.ok(elapsed < 1050, `inherited stdout held result for ${elapsed.toFixed(1)}ms`)
})

test('deadline resolves when child keeps pipes open silently', { concurrency: false }, async t => {
  const audit = await harness(t, "process.stdin.resume(); setInterval(() => {}, 1000)", { deadlineMs: 500 })
  const start = performance.now()
  diagnostic(await audit(sourceFiles()), 'ISOLATED_TIMEOUT')
  assert.ok(performance.now() - start < 1500, 'hard timeout exceeded')
})

test('stdout overflow resolves promptly even if descendant inherits pipe', { concurrency: false }, async t => {
  const worker = `
    const { spawn } = await import('node:child_process')
    const gc = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 2000)'],
      { stdio: ['ignore', 'inherit', 'ignore'] })
    gc.unref()
    process.stdout.write('A'.repeat(20000))
  `
  const audit = await harness(t, worker)
  const started = performance.now()
  diagnostic(await audit(sourceFiles()), 'ISOLATED_OUTPUT_LIMIT')
  assert.ok(performance.now() - started < 1850, 'overflow waited for inherited pipe closure')
})

test('split UTF-8 is decoded across stdout chunks before protocol parsing', { concurrency: false }, async t => {
  const worker = `
    const value = JSON.stringify({ok:false,diagnostics:[{code:'UNICODE',message:'caf\\u00e9'}],
      manufacturingApproved:false,physicalRegistrationVerified:false})
    const b = Buffer.from(value)
    const p = b.indexOf(Buffer.from([0xc3]))
    process.stdout.write(b.subarray(0,p+1))
    setTimeout(() => process.stdout.write(b.subarray(p+1)), 30)
  `
  const audit = await harness(t, worker)
  const result = await audit(sourceFiles())
  assert.equal(result.ok, false)
  assert.deepEqual(result.diagnostics, [{ code: 'UNICODE', message: 'café' }])
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
})

test('child abnormal exit wins over forged success response', { concurrency: false }, async t => {
  const audit = await harness(t, `
    process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:false,physicalRegistrationVerified:false}))
    process.exitCode = 23
  `)
  diagnostic(await audit(sourceFiles()), 'ISOLATED_CHILD_FAILED')
})

test('child exiting with pipes still open cannot spoof success before deadline', { concurrency: false }, async t => {
  const audit = await harness(t, `
    const { spawn } = await import('node:child_process')
    const gc = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 1100)'],
      {stdio:['ignore','inherit','ignore']})
    gc.unref()
    process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:false,physicalRegistrationVerified:false}))
    process.exitCode = 23
  `)
  diagnostic(await audit(sourceFiles()), 'ISOLATED_CHILD_FAILED')
})

test('approval spoof fails closed even with syntactically valid JSON', { concurrency: false }, async t => {
  const audit = await harness(t, `
    process.stdout.write(JSON.stringify({ok:true,diagnostics:[],manufacturingApproved:true,physicalRegistrationVerified:true}))
  `)
  diagnostic(await audit(sourceFiles()), 'ISOLATED_PROTOCOL_ERROR')
})

test('success response preserves explicit denial of production approval', { concurrency: false }, async t => {
  const audit = await harness(t, 'process.stdout.write(' + JSON.stringify(JSON.stringify(cleanResult)) + ')')
  const result = await audit(sourceFiles())
  assert.deepEqual(result, cleanResult)
})
