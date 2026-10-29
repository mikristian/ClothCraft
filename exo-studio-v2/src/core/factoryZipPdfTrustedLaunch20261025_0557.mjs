// Development-only boundary. Digests detect changed files at check time; they
// provide neither OS isolation nor atomic check-to-execution (TOCTOU) safety.
// Python -I excludes unpinned user-site modules; if fitz is unavailable under
// isolation this intentionally fails closed until independently provisioned.
// Descendant processes are not isolated by the underlying watchdog.
// Never use this prototype as manufacturing approval or an untrusted service.
import { readFileSync, lstatSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { types } from 'node:util'
import { runPdfRssWatchdog } from './factoryZipPdfRssWatchdog20261025_0500.mjs'

const PYTHON = '/usr/bin/python3'
const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PINNED = Object.freeze([
  ['factoryZipPdfRssWatchdog20261025_0500.mjs', '1fc66d404736aed3f4b263b47530e9bbee6f99e96c297319f8274d7163a8c3b6'],
  ['factoryZipPdfTrustedVectorParity20261024_1956.py', '8d7de91d56d6ead7b84b617b751807e5c768778cd2e1e4b3012027eecb001cb4'],
  ['factoryZipIndependentRasterHardened20261024_1854.py', '39ed79af373d4f749d2279ada8edb1bbbe9cddbaec7c28ba27fa6ee20470b498'],
])
const fail = reason => ({ accepted: false, manufacturingApproved: false, reason })

// Also usable with temporary fixtures in tests; it never supplies launch paths.
export function matchesPinnedDigest(path, expected) {
  try {
    const stat = lstatSync(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024 ||
        realpathSync(path) !== path) return false
    return createHash('sha256').update(readFileSync(path)).digest('hex') === expected
  } catch { return false }
}

function trustedOptions(value) {
  if (value === null || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)) return null
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return null
    const keys = Reflect.ownKeys(value)
    if (keys.length !== 1 || keys[0] !== 'input') return null
    const desc = Object.getOwnPropertyDescriptor(value, 'input')
    if (!desc || !Object.hasOwn(desc, 'value') || typeof desc.value !== 'string' ||
        Buffer.byteLength(desc.value, 'utf8') > 64 * 1024) return null
    return { input: desc.value }
  } catch { return null } // Traps and accessors must never reach the launcher.
}

export async function runTrustedPdfVerifier(options) {
  const safe = trustedOptions(options)
  if (!safe) return fail('invalid input')
  for (const [filename, hash] of PINNED) {
    if (!matchesPinnedDigest(ROOT + filename, hash)) return fail('verifier integrity mismatch')
  }
  // Absolute executable pin, with a regular-file check. System binary updates
  // aren't pinned by content hash; the interpreter itself remains in the TCB.
  try {
    if (!lstatSync(PYTHON).isFile() || realpathSync(PYTHON) !== PYTHON) return fail('interpreter unavailable')
  } catch { return fail('interpreter unavailable') }
  try {
    const result = await runPdfRssWatchdog({
      command: PYTHON, allowedCommand: PYTHON,
      args: ['-I', ROOT + 'factoryZipPdfTrustedVectorParity20261024_1956.py'],
      allowedArgs: ['-I', ROOT + 'factoryZipPdfTrustedVectorParity20261024_1956.py'],
      input: safe.input, timeoutMs: 1500, sampleIntervalMs: 25,
      rssLimitKb: 64 * 1024,
    })
    return { ...result, manufacturingApproved: false }
  } catch { return fail('verifier launch failed') }
}
