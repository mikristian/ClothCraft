import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {auditFactoryZipResourceBudget20261024_0600} from './factoryZipResourceBudget20261024_0600.mjs'

const WORKER = fileURLToPath(new URL('./factoryZipIsolatedAuditWorker20261024_0700.mjs', import.meta.url))
const MAX_OUTPUT = 64 * 1024
const MAX_INPUT = 16 * 1024 * 1024
const fail = (code, message) => ({ok: false, diagnostics: [{code, message}], manufacturingApproved: false})

export async function auditFactoryZipInIsolatedProcess20261024_0700(bytes, options = {}) {
  // Bound and snapshot the input first. The guard and child must inspect identical bytes,
  // including when the original view is backed by a mutable SharedArrayBuffer.
  if (!(bytes instanceof Uint8Array)) return fail('INVALID_INPUT', 'Expected Uint8Array ZIP bytes')
  let payload
  try {
    if (bytes.byteLength > MAX_INPUT)
      return fail('RESOURCE_ARCHIVE_BUDGET', 'Compressed archive exceeds 16 MiB')
    payload = Buffer.from(bytes)
  } catch {
    return fail('INVALID_INPUT', 'ZIP input could not be copied')
  }
  const preflight = auditFactoryZipResourceBudget20261024_0600(payload)
  if (!preflight.ok) return {...preflight, manufacturingApproved: false}
  const deadline = options?.timeoutMs === undefined ? 5000 : options.timeoutMs
  if (!Number.isInteger(deadline) || deadline < 1 || deadline > 30000)
    return fail('ISOLATED_OPTIONS', 'timeoutMs must be an integer between 1 and 30000')
  return new Promise(resolve => {
    let child
    try {
      child = spawn(process.execPath, ['--max-old-space-size=64', WORKER], {
        shell: false, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true
      })
    } catch {
      resolve(fail('ISOLATED_SPAWN', 'ZIP verifier subprocess could not start'))
      return
    }
    let settled = false
    let timeout = false
    let exceeded = false
    let spawnError = false
    let outputBytes = 0
    const chunks = []
    const timer = setTimeout(() => {
      timeout = true
      child.kill('SIGKILL')
    }, deadline)
    timer.unref?.()
    const finish = result => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({...result, manufacturingApproved: false})
    }
    child.on('error', () => {
      spawnError = true
      child.kill('SIGKILL')
    })
    child.stdout.on('data', chunk => {
      outputBytes += chunk.length
      if (outputBytes > MAX_OUTPUT) {
        exceeded = true
        child.kill('SIGKILL')
      } else chunks.push(chunk)
    })
    // stderr intentionally discarded and bounded by draining; never surface child text.
    child.stderr.on('data', () => {})
    child.stdin.on('error', () => {}) // EPIPE is expected if the child exits early.
    child.on('close', (code, signal) => {
      if (timeout) return finish(fail('ISOLATED_TIMEOUT', 'ZIP verifier exceeded its deadline'))
      if (exceeded) return finish(fail('ISOLATED_OUTPUT_BUDGET', 'ZIP verifier exceeded output limit'))
      if (spawnError) return finish(fail('ISOLATED_SPAWN', 'ZIP verifier subprocess failed to start'))
      if (code !== 0 || signal) return finish(fail('ISOLATED_EXIT', 'ZIP verifier terminated abnormally'))
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (!parsed || typeof parsed.ok !== 'boolean' || !Array.isArray(parsed.diagnostics) ||
            parsed.diagnostics.length > 64 ||
            !parsed.diagnostics.every(d => d && typeof d.code === 'string' && d.code.length <= 128 &&
              typeof d.message === 'string' && d.message.length <= 2048) ||
            (parsed.ok && parsed.diagnostics.length !== 0) ||
            (!parsed.ok && parsed.diagnostics.length === 0) ||
            parsed.manufacturingApproved !== false)
          return finish(fail('ISOLATED_PROTOCOL', 'ZIP verifier response was invalid'))
        return finish({ok: parsed.ok, diagnostics: parsed.diagnostics, manufacturingApproved: false})
      } catch {
        return finish(fail('ISOLATED_PROTOCOL', 'ZIP verifier returned unreadable output'))
      }
    })
    child.stdin.end(payload)
  })
}
