import { auditFactoryZipMarkerPhysicalParity20261024_1202 } from './factoryZipMarkerPhysicalParity20261024_1202.mjs'

const MAX_INPUT = 34 * 1024 * 1024
const fail = message => ({ ok: false, diagnostics: [{ code: 'ISOLATED_WORKER_REJECTED', message: String(message).slice(0, 300) }], manufacturingApproved: false, physicalRegistrationVerified: false })
try {
  const chunks = []
  let length = 0
  for await (const chunk of process.stdin) {
    length += chunk.length
    if (length > MAX_INPUT) throw Error('Worker input budget exceeded')
    chunks.push(chunk)
  }
  const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length)))
  if (!body || !body.files || typeof body.files !== 'object' || Array.isArray(body.files)) throw Error('Invalid worker input')
  const files = Object.create(null)
  for (const [path, encoded] of Object.entries(body.files)) {
    if (typeof encoded !== 'string') throw Error('Invalid worker entry')
    files[path] = Uint8Array.from(Buffer.from(encoded, 'base64'))
  }
  const result = auditFactoryZipMarkerPhysicalParity20261024_1202(files, body.expectedProject)
  process.stdout.write(JSON.stringify({ ok: result.ok === true, diagnostics: result.diagnostics.slice(0, 64).map(d => ({ code: String(d.code).slice(0, 100), message: String(d.message).slice(0, 1000) })), manufacturingApproved: false, physicalRegistrationVerified: false }))
} catch (error) {
  process.stdout.write(JSON.stringify(fail(error?.message || error)))
}
