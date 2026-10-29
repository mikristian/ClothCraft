// Development-only process containment probes. No production behavior is changed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./factoryZipPdfTrustedVectorParity20261024_1956.py', import.meta.url))
const options = {
  encoding: 'utf8', timeout: 750, maxBuffer: 2048, shell: false,
  env: { PATH: '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin', PYTHONDONTWRITEBYTECODE: '1' },
}

// This deliberately small, independent harness models fail-closed verifier handling.
// timeout and maxBuffer bound runtime/output; neither bounds child RSS or total memory.
function guarded(program, args, input = '') {
  if (typeof input !== 'string' || Buffer.byteLength(input) > 1024) return { accepted: false, reason: 'input limit' }
  const child = spawnSync(program, args, { ...options, input })
  if (child.error || child.signal || child.status !== 0) {
    return { accepted: false, reason: child.error?.code || child.signal || `exit ${child.status}` }
  }
  if (typeof child.stdout !== 'string' || Buffer.byteLength(child.stdout) > 1024) {
    return { accepted: false, reason: 'output limit' }
  }
  try {
    const data = JSON.parse(child.stdout)
    if (!data || Array.isArray(data) || typeof data !== 'object' ||
        Object.keys(data).sort().join(',') !== 'candidateDrawings,candidateItems,drawings,items,ok,pages' ||
        data.ok !== true || !Number.isSafeInteger(data.pages) || data.pages < 1 ||
        !['drawings', 'items', 'candidateDrawings', 'candidateItems'].every(k => Number.isSafeInteger(data[k]) && data[k] >= 0)) {
      throw new Error('invalid output shape')
    }
    return { accepted: true, data }
  } catch {
    return { accepted: false, reason: 'invalid output' }
  }
}

const js = script => guarded(process.execPath, ['-e', script])

test('guard accepts only a well-shaped successful verifier response', () => {
  const payload = { ok: true, pages: 1, drawings: 0, items: 0, candidateDrawings: 0, candidateItems: 0 }
  assert.equal(js(`process.stdout.write(${JSON.stringify(JSON.stringify(payload))})`).accepted, true)
})

test('guard fails closed on a child process timeout', () => {
  const result = js('while (true) {}')
  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'ETIMEDOUT')
})

test('guard fails closed on maxBuffer overflow without large allocation', () => {
  const result = js('process.stdout.write("x".repeat(4096))')
  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'ENOBUFS')
})

test('guard fails closed on nonzero exit even with a valid-looking response', () => {
  const result = js('process.stdout.write(JSON.stringify({ok:true,pages:1,drawings:0,items:0,candidateDrawings:0,candidateItems:0}));process.exit(2)')
  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'exit 2')
})

test('guard rejects missing, malformed and extra-field output', () => {
  for (const script of [
    '',
    'process.stdout.write("not json")',
    'process.stdout.write(JSON.stringify({ok:true,pages:1,drawings:0,items:0,candidateDrawings:0,candidateItems:0,approved:true}))',
    'process.stdout.write(JSON.stringify({ok:false,pages:1,drawings:0,items:0,candidateDrawings:0,candidateItems:0}))',
  ]) assert.equal(js(script).accepted, false)
})

test('guard rejects oversized input without spawning', () => {
  const result = guarded(process.execPath, ['-e', 'process.exit(0)'], 'a'.repeat(1025))
  assert.deepEqual(result, { accepted: false, reason: 'input limit' })
})

test('actual PDF verifier rejects intentionally invalid minimal JSON input', () => {
  const result = guarded('python3', [checker], '{}')
  assert.equal(result.accepted, false)
})
