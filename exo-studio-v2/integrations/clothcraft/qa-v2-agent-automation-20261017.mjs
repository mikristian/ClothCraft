import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { createAgentApi } from './agent-api.mjs'

let revision = 4
const commands = []
const workspace = {
  status: () => ({ loaded: true, busy: false }),
  async request(command) {
    commands.push(command)
    if (command.op === 'snapshot') return { ok: true, data: { revision, running: false, busy: false, template: { name: 'Tee', panels: [{ id: 'front', polygon: { edges: ['hem'] } }], fabrics: [{ id: 'cotton', name: 'Cotton' }], seams: [{ id: 'seam-1' }] } } }
    if (command.op === 'undo' || command.op === 'redo') revision++
    return { ok: true, data: { revision } }
  },
}
const allowedOrigin = 'http://127.0.0.1:5386'
const api = createAgentApi(workspace, { allowOrigin: origin => origin === allowedOrigin })
async function post(url, payload, headers = { origin: allowedOrigin }) {
  const req = new PassThrough()
  Object.assign(req, { method: 'POST', url, headers })
  const res = { writeHead(status, responseHeaders) { this.status = status; this.responseHeaders = responseHeaders }, end(payload) { this.body = JSON.parse(payload) } }
  req.end(JSON.stringify(payload))
  assert.equal(await api.handle(req, res), true)
  return { status: res.status, headers: res.responseHeaders, ...res.body }
}
const allowedSuccess = await post('/agent/v1/actions', { action: 'workspace.summary' }, { origin: allowedOrigin })
assert.equal(allowedSuccess.headers['Access-Control-Allow-Origin'], allowedOrigin)
assert.equal(allowedSuccess.headers.Vary, 'Origin')
const allowedError = await post('/agent/v1/batch', { actions: [] }, { origin: allowedOrigin })
assert.equal(allowedError.status, 400)
assert.equal(allowedError.headers['Access-Control-Allow-Origin'], allowedOrigin)
assert.equal(allowedError.headers.Vary, 'Origin')
const denied = await post('/agent/v1/actions', { action: 'workspace.summary' }, { origin: 'https://evil.example' })
assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined)
assert.equal(denied.headers.Vary, undefined)
const defaultTrustedOrigin = await post('/agent/v1/actions', { action: 'workspace.summary' })
assert.equal(defaultTrustedOrigin.headers['Access-Control-Allow-Origin'], allowedOrigin)
const missingOrigin = await post('/agent/v1/actions', { action: 'workspace.summary' }, {})
assert.equal(missingOrigin.status, 401)
assert.equal(missingOrigin.headers['Access-Control-Allow-Origin'], undefined)
assert.deepEqual((await post('/agent/v1/actions', { action: 'workspace.summary' })).panels.map(p => p.id), ['front'])
assert.equal((await post('/agent/v1/actions', { action: 'workspace.save' })).code, 'REVISION_REQUIRED')
assert.equal((await post('/agent/v1/actions', { action: 'workspace.undo', expectedRevision: 3 })).code, 'STALE_REVISION')
assert.equal((await post('/agent/v1/actions', { action: 'workspace.save', expectedRevision: 4, path: '/tmp/evil' })).code, 'INVALID_ACTION')
const batch = await post('/agent/v1/batch', { actions: [
  { action: 'workspace.save', expectedRevision: 4 },
  { action: 'workspace.undo', expectedRevision: 4 },
  { action: 'workspace.redo', expectedRevision: 4 },
] })
assert.equal(batch.code, 'BATCH_STOPPED')
assert.equal(batch.completed, 2)
assert.equal(batch.failedIndex, 2)
assert.equal(revision, 5)
assert.equal(commands.filter(c => c.op === 'save').length, 1)
assert.equal(commands.filter(c => c.op === 'redo').length, 0)
assert.equal((await post('/agent/v1/batch', { actions: [] })).code, 'INVALID_BATCH')
assert.equal((await post('/agent/v1/batch', { actions: [{ action: 'workspace.redo', expectedRevision: 5 }] })).completed, 1)
assert.equal(revision, 6)
const previous = process.env.EXO_AGENT_API_TOKEN
try {
  process.env.EXO_AGENT_API_TOKEN = 'test-only-token'
  assert.equal((await post('/agent/v1/actions', { action: 'workspace.summary' }, {})).code, 'UNAUTHORIZED')
  const authError = await post('/agent/v1/actions', { action: 'workspace.summary' }, { origin: allowedOrigin })
  assert.equal(authError.status, 200)
  assert.equal(authError.headers['Access-Control-Allow-Origin'], allowedOrigin)
  assert.equal((await post('/agent/v1/actions', { action: 'workspace.summary' }, { 'x-clothcraft-token': 'test-only-token' })).ok, true)
  assert.equal((await post('/agent/v1/batch', { actions: [{ action: 'workspace.save', expectedRevision: 6 }] }, {})).code, 'UNAUTHORIZED')
  assert.equal((await post('/agent/v1/batch', { actions: [{ action: 'workspace.save', expectedRevision: 6 }] }, { 'x-clothcraft-token': 'test-only-token' })).completed, 1)
} finally {
  if (previous === undefined) delete process.env.EXO_AGENT_API_TOKEN
  else process.env.EXO_AGENT_API_TOKEN = previous
}
console.log('Agent automation: summaries, validated save/undo/redo, fail-fast sequential batch, auth passed')
api.close()
