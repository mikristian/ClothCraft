import {auditFactoryZipResourceThenCrc20261024_0600} from './factoryZipResourceBudget20261024_0600.mjs'

const MAX_BYTES = 16 * 1024 * 1024
const fail = (code, message) => ({ok: false, diagnostics: [{code, message}], manufacturingApproved: false})
let size = 0
const chunks = []
try {
  for await (const chunk of process.stdin) {
    size += chunk.length
    if (size > MAX_BYTES) {
      process.stdout.write(JSON.stringify(fail('ISOLATED_INPUT_BUDGET', 'ZIP verifier input exceeded limit')))
      process.exitCode = 0
      break
    }
    chunks.push(chunk)
  }
  if (size <= MAX_BYTES) {
    const result = auditFactoryZipResourceThenCrc20261024_0600(Buffer.concat(chunks, size))
    process.stdout.write(JSON.stringify({...result, manufacturingApproved: false}))
  }
} catch {
  process.stdout.write(JSON.stringify(fail('ISOLATED_WORKER_FAILURE', 'ZIP verifier failed')))
}
