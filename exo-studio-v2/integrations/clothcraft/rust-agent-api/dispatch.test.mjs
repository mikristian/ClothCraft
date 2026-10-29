// Run with node --experimental-test-module-mocks --test dispatch.test.mjs.
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import http from 'node:http'
import { PassThrough } from 'node:stream'
import { createAgentValidator } from './client.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Synthetic identities only: HTTP authentication is exercised without reading
// or writing credential files. Key hashing/persistence is outside this test.
mock.module('../agent-key-store.mjs', { namedExports: {
  createAgentKeyStore: () => ({ authenticate: token => ({
    'test-read': { scopes: ['read'] },
    'test-simulate': { scopes: ['read', 'simulate'] },
  })[token] || null }),
} })
const { createAgentApi } = await import('../agent-api.mjs')
const binary = path.join(path.dirname(fileURLToPath(import.meta.url)), 'target/debug/exo-agent-validator')

test('temporary HTTP dispatch: native/fallback parity, token and scope denial', async () => {
  const probe = createAgentValidator({ binary })
  try { assert.deepEqual(await probe.validate({ action: 'simulation.step', expectedRevision: 7, steps: 1 }), { valid: true }) } finally { probe.close() }
  const inMemory = process.env.EXO_QA_IN_MEMORY === '1'
  const previous = process.env.EXO_AGENT_VALIDATOR_BIN
  const outcomes = []
  try {
    for (const native of [true, false]) {
      process.env.EXO_AGENT_VALIDATOR_BIN = native ? binary : `${binary}.absent`
      const calls = []
      const api = createAgentApi({
        status: () => ({ loaded: true }),
        request: async command => {
          calls.push(command)
          return { ok: true, data: { revision: 7, running: false, busy: false } }
        },
      }, { allowOrigin: origin => origin === 'http://trusted.test' })
      const server = http.createServer((req, res) => { api.handle(req, res).catch(error => { res.statusCode = 500; res.end(error.message) }) })
      try {
        if (!inMemory) await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
        const results = []
        const send = async (command, token, extra = {}, route = 'actions') => {
          if (inMemory) {
            const req = new PassThrough()
            req.method = 'POST'
            req.url = `/agent/v1/${route}`
            req.headers = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }
            let status
            let body
            const res = { writeHead(value) { status = value }, end(value) { body = JSON.parse(value) } }
            req.end(JSON.stringify(command))
            assert.equal(await api.handle(req, res), true)
            const result = { status, body }
            results.push(result)
            return result
          }
          const response = await fetch(`http://127.0.0.1:${server.address().port}/agent/v1/${route}`, {
            method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify(command),
          })
          const result = { status: response.status, body: await response.json() }
          results.push(result)
          return result
        }
        const step = { action: 'simulation.step', expectedRevision: 7, steps: 1 }
        for (const token of [undefined, 'invalid-token']) assert.equal((await send(step, token)).body.code, 'UNAUTHORIZED')
        assert.equal((await send(step, 'invalid-token', { origin: 'http://trusted.test' })).body.code, 'UNAUTHORIZED')
        assert.equal((await send(step, 'test-simulate', { origin: 'http://evil.test' })).body.code, 'ORIGIN_FORBIDDEN')
        for (const command of [step, { action: 'simulation.step', steps: 0 }, { action: 'workspace.save', expectedRevision: 7 }]) {
          assert.deepEqual(await send(command, 'test-read'), { status: 403, body: { ok: false, code: 'INSUFFICIENT_SCOPE' } })
        }
        assert.equal(calls.length, 0)
        assert.equal((await send({ ...step, expectedRevision: undefined, steps: 0 }, 'test-simulate')).body.code, 'REVISION_REQUIRED')
        for (const steps of [undefined, null, '1', true, 0, 5, 1.5]) {
          assert.deepEqual(await send({ ...step, steps }, 'test-simulate'), { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS', error: 'steps must be integer 1..4' } })
        }
        assert.equal(calls.length, 0)
        assert.equal((await send({ ...step, expectedRevision: 6 }, 'test-simulate')).body.code, 'STALE_REVISION')
        for (const steps of [1, 4]) assert.equal((await send({ ...step, steps }, 'test-simulate')).status, 200)
        assert.deepEqual(calls.filter(c => c.op === 'step'), [1, 4].map(steps => ({ op: 'step', steps, revision: 7 })))
        const batch = await send({ actions: [{ action: 'workspace.snapshot' }, step] }, 'test-read', {}, 'batch')
        assert.equal(batch.status, 403)
        assert.equal(batch.body.code, 'BATCH_STOPPED')
        assert.equal(batch.body.completed, 1)
        assert.equal(batch.body.error, 'INSUFFICIENT_SCOPE')
        outcomes.push(results)
      } finally {
        api.close()
        server.closeAllConnections()
        if (server.listening) await new Promise(resolve => server.close(resolve))
      }
    }
    assert.deepEqual(outcomes[0], outcomes[1])
  } finally {
    if (previous === undefined) delete process.env.EXO_AGENT_VALIDATOR_BIN
    else process.env.EXO_AGENT_VALIDATOR_BIN = previous
  }
})
