import test from 'node:test'
import assert from 'node:assert/strict'
import { runPdfRssWatchdog } from './factoryZipPdfRssWatchdog20261025_0500.mjs'

const payload = JSON.stringify({ ok: true, pages: 1, drawings: 0, items: 0, candidateDrawings: 0, candidateItems: 0 })
const script = body => `setTimeout(() => { ${body} }, 120)`
const run = (body, overrides = {}) => {
  const args = ['-e', script(body)]
  return runPdfRssWatchdog({ command: process.execPath, allowedCommand: process.execPath,
    args, allowedArgs: args, timeoutMs: 800, sampleIntervalMs: 20,
    rssLimitKb: 90 * 1024, ...overrides })
}

test('accepts bounded successful JSON with an observed RSS sample', async () => {
  assert.equal((await run(`process.stdout.write(${JSON.stringify(payload)})`, { sampleRssKb: () => 32 * 1024 })).accepted, true)
})

test('rejects unapproved arguments and excessive input before spawn', async () => {
  assert.equal((await run('process.exit(0)', { allowedArgs: ['-e', 'other'] })).reason, 'invalid input')
  assert.equal((await run('process.exit(0)', { input: 'x'.repeat(65537) })).reason, 'invalid input')
})

test('rejects timeout and kills its own child', async () => {
  assert.equal((await run('while(true) {}', { timeoutMs: 200 })).reason, 'timeout')
})

test('rejects nonzero exit and malformed JSON', async () => {
  const stableSample = { sampleRssKb: () => 32 * 1024 }
  assert.equal((await run(`process.stdout.write(${JSON.stringify(payload)});process.exit(4)`, stableSample)).reason, 'nonzero exit')
  assert.equal((await run('process.stdout.write("not-json")', stableSample)).reason, 'invalid JSON output')
})

test('rejects extra output fields and oversized output', async () => {
  assert.equal((await run(`process.stdout.write(${JSON.stringify(JSON.stringify({ ...JSON.parse(payload), trusted: true }))})`)).reason, 'invalid JSON output')
  assert.equal((await run('process.stdout.write("x".repeat(9000))')).reason, 'oversized output')
})

test('rejects duplicate, escaped, ambiguous and noncanonical JSON keys and scalars', async () => {
  const stableSample = { sampleRssKb: () => 32 * 1024 }
  const bad = [
    '{"ok":false,"ok":true,"pages":1,"drawings":0,"items":0,"candidateDrawings":0,"candidateItems":0}',
    '{"ok":true,"ok":true,"pages":1,"drawings":0,"items":0,"candidateDrawings":0,"candidateItems":0}',
    '{"o\\u006b":true,"pages":1,"drawings":0,"items":0,"candidateDrawings":0,"candidateItems":0}',
    '{"ok":true,"pages":1,"drawings":0,"items":0,"candidateDrawings":0,"candidateItems":0,"extra":1}',
    '{"ok":true,"pages":1.0,"drawings":0,"items":0,"candidateDrawings":0,"candidateItems":0}',
    payload + payload,
  ]
  for (const output of bad) {
    const result = await run(`process.stdout.write(${JSON.stringify(output)})`, stableSample)
    assert.equal(result.reason, 'invalid JSON output', output)
  }
})

test('accepts valid reordered JSON with whitespace', async () => {
  const output = ' { "items" : 0, "candidateItems" : 0, "pages":1, "ok":true, "candidateDrawings":0, "drawings":0 } \n'
  const result = await run(`process.stdout.write(${JSON.stringify(output)})`, { sampleRssKb: () => 32 * 1024 })
  assert.equal(result.accepted, true)
})

test('rejects measured RSS above the threshold with a tiny child', async () => {
  assert.equal((await run('process.stdout.write("unused")', { rssLimitKb: 1 })).reason, 'RSS threshold exceeded')
})

test('rejects child spawn error and RSS sampling failure', async () => {
  const args = []
  assert.equal((await runPdfRssWatchdog({ command: '/missing/exo-pdf-verifier', allowedCommand: '/missing/exo-pdf-verifier', args, allowedArgs: args })).reason, 'child error')
  assert.equal((await run('process.exit(0)', { sampleRssKb: () => { throw new Error('ps unavailable') } })).reason, 'RSS sample failure')
  assert.equal((await run('process.exit(0)', { sampleRssKb: () => NaN })).reason, 'RSS sample failure')
})

test('fast child exit with no successful RSS sample rejects', async () => {
  const args = ['-e', 'process.exit(0)']
  const result = await runPdfRssWatchdog({ command: process.execPath, allowedCommand: process.execPath,
    args, allowedArgs: args, sampleIntervalMs: 250, sampleRssKb: () => { throw new Error('no sample') } })
  assert.equal(result.reason, 'RSS sample failure')
})
