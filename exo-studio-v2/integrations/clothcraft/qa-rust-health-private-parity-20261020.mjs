// Isolated private-port Node/Rust health route comparison. Never uses installed state.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer, request } from 'node:http'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const switchName = process.env.EXO_QA_HEALTH_OPT_IN_ENV
const switchValue = process.env.EXO_QA_HEALTH_OPT_IN_VALUE || '1'
const binaryName = process.env.EXO_QA_HEALTH_BINARY_ENV
assert(switchName && /^EXO_[A-Z0-9_]+$/.test(switchName), 'Set EXO_QA_HEALTH_OPT_IN_ENV to worker-1 production opt-in switch')
assert(binaryName && /^EXO_[A-Z0-9_]+$/.test(binaryName), 'Set EXO_QA_HEALTH_BINARY_ENV to worker-1 adapter binary override')
const folder = mkdtempSync(join(tmpdir(), 'exo-health-private-'))
const rustExecutable = process.env.EXO_QA_HEALTH_REAL_BINARY || join(process.cwd(), 'rust/exo_health_kernel/target/release/exo-health-kernel')
assert(existsSync(rustExecutable), 'Real Rust health executable must exist; no false-positive fallback-only parity')
const proof = join(folder, 'rust-invocations.txt')
const wrapper = join(folder, 'health-rust-proof.sh')
writeFileSync(wrapper, '#!/bin/sh\nprintf "called\\n" >> '+ JSON.stringify(proof) +'\nexec '+ JSON.stringify(rustExecutable) +'\n')
chmodSync(wrapper, 0o700)
const reserve = async () => {
  const socket = createServer()
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  return port
}
const ports = await Promise.all([reserve(), reserve(), reserve()])
const children = []
const start = async (index, flags = {}) => {
  const env = {
    ...process.env, EXO_CLOTHCRAFT_PORT: String(ports[index]),
    EXO_CLOTHCRAFT_OUTPUT_DIR: join(folder, 'backend-' + index),
    ...flags,
  }
  if (!Object.hasOwn(flags, switchName)) delete env[switchName]
  if (!Object.hasOwn(flags, binaryName)) delete env[binaryName]
  const child = spawn(process.execPath, ['integrations/clothcraft/server.mjs'], { env, stdio: 'ignore' })
  children.push(child)
  for (let attempt = 0; attempt < 90; attempt++) {
    if (child.exitCode !== null) throw Error('Private bridge exited ' + child.exitCode)
    try { await raw(index, 'GET', '/health'); return child } catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  throw Error('Private bridge readiness timed out')
}
const raw = (index, method, pathname, origin) => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port: ports[index], method, path: pathname,
    headers: origin === undefined ? {} : { Origin: origin } }, response => {
    const chunks = []
    response.on('data', chunk => chunks.push(chunk))
    response.on('end', () => resolve({ status: response.statusCode,
      headers: Object.fromEntries(Object.entries(response.headers).filter(([key]) =>
        !['date', 'connection', 'keep-alive', 'transfer-encoding'].includes(key))),
      body: Buffer.concat(chunks).toString('hex') }))
  })
  req.on('error', reject)
  req.end()
})
let cases = 0
const compare = async (index, label) => {
  const origins = [undefined, 'http://127.0.0.1:5188', 'http://localhost:5173', 'http://localhost:5297', 'https://evil.test', 'null']
  for (const origin of origins) for (const [method, pathname] of [
    ['GET', '/health'], ['OPTIONS', '/health'], ['HEAD', '/health'],
    ['POST', '/health'], ['GET', '/health?test=1'], ['GET', '/unknown-rust-qa']
  ]) {
    const baseline = await raw(0, method, pathname, origin)
    const actual = await raw(index, method, pathname, origin)
    assert.deepStrictEqual(actual, baseline, JSON.stringify({ label, origin, method, pathname }))
    cases++
  }
}
try {
  await start(0)
  await start(1, { [switchName]: switchValue, [binaryName]: wrapper })
  await compare(1, 'Rust opt-in')
  const rustInvocations = readFileSync(proof, 'utf8').trim().split('\n').length
  assert(rustInvocations >= 1, 'Rust-backed opt-in route must actually invoke native executable')
  await start(2, { [switchName]: switchValue, [binaryName]: '/does-not-exist/exo-health-adapter' })
  await compare(2, 'Rust down fallback')
  console.log(JSON.stringify({ pass: true, cases, rustInvocations, origins: 6, methodsAndPaths: 6,
    comparisons: ['baseline vs opt-in', 'baseline vs Rust down'], temporaryPorts: true, disposableOutputs: true }))
} finally {
  for (const child of children) child.kill('SIGTERM')
  rmSync(folder, { recursive: true, force: true })
}
