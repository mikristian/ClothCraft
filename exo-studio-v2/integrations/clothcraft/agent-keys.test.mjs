import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { createAgentKeyStore } from './agent-key-store.mjs'
import { createAgentApi } from './agent-api.mjs'

test('persistent keys, permissions, revocation, origin and batch enforcement', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clothcraft-agent-test-'))
  const keyStorePath = path.join(dir, 'private.json')
  const store = createAgentKeyStore(keyStorePath)
  const ui = 'http://127.0.0.1:5386'
  const workspace = { status: () => ({ loaded: true, busy: false }), request: async req => ({ ok: true, data: { revision: 2, template: { panels: [] }, ...req.op === 'snapshot' ? {} : {} } }) }
  const api = createAgentApi(workspace, { keyStorePath, allowOrigin: origin => origin === ui })
  const server = http.createServer(async (req, res) => { if (!await api.handle(req, res)) { res.writeHead(404); res.end() } })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  async function request(route, { method = 'GET', origin, token, body } = {}) {
    const res = await fetch(base + route, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: res.status, body: await res.json() }
  }
  try {
    assert.equal((await request('/agent/v1/status')).status, 401)
    assert.equal((await request('/agent/v1/keys', { origin: 'http://evil.test' })).status, 403)
    assert.equal((await request('/agent/v1/keys')).status, 401)
    const created = await request('/agent/v1/keys', { method: 'POST', origin: ui, body: { name: 'Reader', scopes: ['read'] } })
    assert.equal(created.status, 201)
    const token = created.body.key
    assert.ok(token.startsWith('cck_'))
    assert.equal(fs.statSync(keyStorePath).mode & 0o777, 0o600)
    assert.ok(!fs.readFileSync(keyStorePath, 'utf8').includes(token))
    assert.ok(createAgentKeyStore(keyStorePath).authenticate(token))
    const listed = await request('/agent/v1/keys', { origin: ui })
    assert.equal(listed.body.keys.length, 1)
    assert.equal('key' in listed.body.keys[0], false)
    assert.equal((await request('/agent/v1/status', { token })).status, 200)
    assert.equal((await request('/agent/v1/status', { token: 'cck_wrong' })).status, 401)
    const edit = { action: 'workspace.save', expectedRevision: 2 }
    assert.equal((await request('/agent/v1/actions', { method: 'POST', token, origin: ui, body: edit })).status, 403)
    assert.equal((await request('/agent/v1/actions', { method: 'POST', token, body: { action: 'simulation.step', expectedRevision: 2, steps: 1 } })).status, 403)
    const batch = await request('/agent/v1/batch', { method: 'POST', token, body: { actions: [{ action: 'workspace.summary' }, edit] } })
    assert.equal(batch.status, 403)
    assert.equal(batch.body.completed, 1)
    assert.equal((await request('/agent/v1/actions', { method: 'POST', origin: ui, body: edit })).status, 200)
    const revoked = await request(`/agent/v1/keys/${created.body.id}`, { method: 'DELETE', origin: ui })
    assert.equal(revoked.status, 200)
    assert.equal((await request('/agent/v1/status', { token })).status, 401)
    const expired = store.create({ name: 'Short', scopes: ['read'], expiresAt: new Date(Date.now() + 60000).toISOString() })
    const document = JSON.parse(fs.readFileSync(keyStorePath, 'utf8'))
    document.keys.find(x => x.id === expired.id).expiresAt = new Date(Date.now() - 1000).toISOString()
    fs.writeFileSync(keyStorePath, JSON.stringify(document), { mode: 0o600 })
    assert.equal((await request('/agent/v1/status', { token: expired.key })).status, 401)
  } finally { api.close(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }) }
})
