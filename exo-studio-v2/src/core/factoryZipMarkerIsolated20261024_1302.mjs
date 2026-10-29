import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Development-only process boundary; these are application budgets, not OS resource containment.
export const ISOLATED_MARKER_LIMITS_1302 = Object.freeze({
  maxFiles: 512, maxEntryBytes: 8 * 1024 * 1024, maxTotalBytes: 24 * 1024 * 1024,
  maxProjectJsonBytes: 4 * 1024 * 1024, maxInputBytes: 34 * 1024 * 1024,
  maxOutputBytes: 128 * 1024, timeoutMs: 12000, heapMb: 128,
})
const limits = ISOLATED_MARKER_LIMITS_1302
const fail = (code, message) => ({
  ok: false, diagnostics: [{ code, message: String(message).slice(0, 300) }],
  manufacturingApproved: false, physicalRegistrationVerified: false,
})
const plain = object => {
  if (!object || typeof object !== 'object') return false
  const proto = Object.getPrototypeOf(object)
  return proto === null || proto === Object.prototype
}
function snapshotProject(value, seen = new WeakSet(), budget = { nodes: 0 }) {
  if (++budget.nodes > 20000) throw Error('Expected project exceeds node budget')
  if (typeof value === 'string' && value.length > 1000000) throw Error('Expected project string exceeds budget')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'object' || (!Array.isArray(value) && !plain(value))) throw Error('Expected project must be plain JSON data')
  if (seen.has(value)) throw Error('Expected project contains a cycle or repeated reference')
  seen.add(value)
  const desc = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(desc)
  if (keys.length > 10000 || keys.some(key => typeof key !== 'string')) throw Error('Invalid project keys')
  if (Array.isArray(value)) {
    if (value.length > 20000 || keys.length !== value.length + 1) throw Error('Expected project array must be dense')
    const copy = []
    for (let i = 0; i < value.length; i++) {
      if (!Object.hasOwn(desc, i) || !Object.hasOwn(desc[i], 'value')) throw Error('Expected project accessor rejected')
      copy.push(snapshotProject(desc[i].value, seen, budget))
    }
    return copy
  }
  const copy = Object.create(null)
  for (const key of keys) {
    if (!Object.hasOwn(desc[key], 'value')) throw Error('Expected project accessor rejected')
    copy[key] = snapshotProject(desc[key].value, seen, budget)
  }
  return copy
}
function snapshot(files, expectedProject) {
  if (!plain(files)) throw Error('Archive must be a plain file map')
  const descriptors = Object.getOwnPropertyDescriptors(files)
  const names = Reflect.ownKeys(descriptors)
  if (!names.length || names.length > limits.maxFiles || names.some(k => typeof k !== 'string')) throw Error('Archive file count or keys invalid')
  const out = Object.create(null)
  let total = 0
  for (const name of names) {
    if (!name || name.length > 512 || name.includes('\0')) throw Error('Invalid archive entry path')
    const descriptor = descriptors[name]
    if (!Object.hasOwn(descriptor, 'value')) throw Error('Archive accessor rejected')
    const bytes = descriptor.value
    if (!(bytes instanceof Uint8Array) || bytes.buffer instanceof SharedArrayBuffer || bytes.byteLength > limits.maxEntryBytes) throw Error('Archive entry must be bounded non-shared bytes')
    total += bytes.byteLength
    if (total > limits.maxTotalBytes) throw Error('Archive total bytes exceeded')
    out[name] = Buffer.from(bytes).toString('base64')
  }
  const project = expectedProject === undefined ? undefined : snapshotProject(expectedProject)
  const input = JSON.stringify({ files: out, expectedProject: project })
  if (Buffer.byteLength(input) > limits.maxInputBytes || (project !== undefined && Buffer.byteLength(JSON.stringify(project)) > limits.maxProjectJsonBytes)) throw Error('Serialized input exceeds budget')
  return input
}

/** Audit a factory archive FILE MAP with an immutable child-bound snapshot.
 * Resolves a diagnostic result; never grants manufacturing or physical registration approval.
 * Timeout, heap cap, IPC byte caps and process exit are enforced, but OS CPU/RSS are not.
 */
export async function auditFactoryZipMarkerIsolated20261024_1302(files, expectedProject) {
  let input
  try { input = snapshot(files, expectedProject) }
  catch (error) { return fail('ISOLATED_INPUT_REJECTED', error?.message || error) }
  return new Promise(resolve => {
    let child
    try {
      child = spawn(process.execPath, [`--max-old-space-size=${limits.heapMb}`, fileURLToPath(new URL('./factoryZipMarkerIsolatedWorker20261024_1302.mjs', import.meta.url))], {
        stdio: ['pipe', 'pipe', 'pipe'], shell: false, env: { PATH: process.env.PATH || '' },
      })
    } catch (error) { resolve(fail('ISOLATED_SPAWN_FAILED', error?.message || error)); return }
    let finished = false, stdout = '', stdoutBytes = 0, stderrBytes = 0, timedOut = false, overOutput = false
    const finish = result => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL') }, limits.timeoutMs)
    child.stdout.on('data', chunk => {
      stdoutBytes += chunk.length
      if (stdoutBytes > limits.maxOutputBytes) { overOutput = true; child.kill('SIGKILL') }
      else stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', chunk => {
      stderrBytes += chunk.length
      if (stderrBytes > limits.maxOutputBytes) { overOutput = true; child.kill('SIGKILL') }
    })
    child.on('error', error => finish(fail('ISOLATED_CHILD_ERROR', error?.message || error)))
    child.on('close', code => {
      if (timedOut) return finish(fail('ISOLATED_TIMEOUT', 'Marker audit exceeded deadline'))
      if (overOutput) return finish(fail('ISOLATED_OUTPUT_LIMIT', 'Marker audit exceeded output budget'))
      if (code !== 0) return finish(fail('ISOLATED_CHILD_FAILED', 'Marker audit child exited abnormally'))
      try {
        const result = JSON.parse(stdout)
        if (!plain(result) || typeof result.ok !== 'boolean' || !Array.isArray(result.diagnostics) || result.diagnostics.length > 64 ||
          result.ok !== (result.diagnostics.length === 0) || result.manufacturingApproved !== false || result.physicalRegistrationVerified !== false ||
          result.diagnostics.some(d => !plain(d) || typeof d.code !== 'string' || d.code.length > 100 || typeof d.message !== 'string' || d.message.length > 1000)) throw Error('Malformed child result')
        finish({ ok: result.ok, diagnostics: result.diagnostics, manufacturingApproved: false, physicalRegistrationVerified: false })
      } catch { finish(fail('ISOLATED_PROTOCOL_ERROR', 'Malformed child response')) }
    })
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
