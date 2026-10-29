import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createCollaborationApi } from './collaboration.mjs'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clothcraft-roles-'))
const api = createCollaborationApi({ directory, authenticate: async token =>
  ['owner', 'viewer', 'commenter', 'editor', 'stranger', 'constructor'].includes(token) ? { userId: token } : null })
const server = http.createServer((req, res) => api.handle(req, res))
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const root = `http://127.0.0.1:${server.address().port}/collab/v1`
async function call(user, method, endpoint, body) {
  const response = await fetch(`${root}${endpoint}`, { method, headers: { Authorization: `Bearer ${user}`,
    ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: response.status, ...await response.json() }
}
try {
  assert.equal((await call('constructor', 'GET', '/me')).status, 401)
  const team = (await call('owner', 'POST', '/teams', { name: 'Brand' })).team
  const project = (await call('owner', 'POST', '/projects', { name: 'Collection', teamId: team.id })).project
  const id = project.id
  const avatarDataUrl = `data:image/png;base64,${Buffer.from('small-avatar').toString('base64')}`
  assert.equal((await call('owner', 'PUT', '/me', { displayName: 'Lead Designer', avatarDataUrl })).profile.avatarDataUrl, avatarDataUrl)
  assert.equal((await call('owner', 'PUT', '/me', { displayName: 'Lead Designer', avatarDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400)
  for (const permission of ['viewer', 'commenter', 'editor']) {
    const invite = await call('owner', 'POST', '/shares', { targetType: 'project', targetId: id, permission })
    assert.equal(invite.status, 201)
    assert.equal((await call(permission, 'POST', '/shares/redeem', { inviteToken: invite.inviteToken })).status, 200)
  }
  const members = (await call('viewer', 'GET', `/projects/${id}/members`)).members
  assert.equal(members.find(m => m.userId === 'owner').profile.displayName, 'Lead Designer')
  assert.equal(members.find(m => m.userId === 'owner').profile.avatarDataUrl, avatarDataUrl)
  assert.equal(members.find(m => m.userId === 'viewer').role, 'viewer')
  assert.equal((await call('viewer', 'GET', `/projects/${id}/history`)).history.length, 0)
  assert.equal((await call('viewer', 'POST', `/projects/${id}/comments`, { text: 'denied' })).status, 404)
  assert.equal((await call('viewer', 'PUT', `/projects/${id}/snapshot`, { expectedRevision: 0, snapshot: { a: 1 } })).status, 404)
  assert.equal((await call('commenter', 'POST', `/projects/${id}/comments`, { text: 'Approved' })).status, 201)
  assert.equal((await call('commenter', 'PUT', `/projects/${id}/snapshot`, { expectedRevision: 0, snapshot: { a: 1 } })).status, 404)
  assert.equal((await call('editor', 'PUT', `/projects/${id}/snapshot`, { expectedRevision: 0, snapshot: { a: 1 } })).revision, 1)
  const history = (await call('viewer', 'GET', `/projects/${id}/history`)).history
  assert.deepEqual(history.map(h => [h.revision, h.authorId]), [[1, 'editor']])
  assert.ok(Date.parse(history[0].createdAt))
  assert.equal((await call('stranger', 'GET', `/projects/${id}/members`)).status, 404)
  const viewerShare = (await call('owner', 'GET', '/shares')).shares.find(s => s.redeemedBy === 'viewer')
  assert.equal((await call('viewer', 'PUT', `/shares/${viewerShare.id}`, { permission: 'editor' })).status, 404)
  assert.equal((await call('owner', 'PUT', `/shares/${viewerShare.id}`, { permission: 'editor' })).share.permission, 'editor')
  assert.equal((await call('viewer', 'PUT', `/projects/${id}/snapshot`, { expectedRevision: 1, snapshot: { a: 2 } })).revision, 2)
  assert.equal((await call('owner', 'DELETE', `/shares/${viewerShare.id}`)).status, 200)
  assert.equal((await call('viewer', 'GET', `/projects/${id}/snapshot`)).status, 404)
  assert.equal((await call('owner', 'PUT', `/shares/${viewerShare.id}`, { permission: 'viewer' })).status, 404)
  console.log('PASS collaboration extended roles, profiles, history, permission update, revocation')
} finally {
  api.close()
  await new Promise(resolve => server.close(resolve))
  fs.rmSync(directory, { recursive: true, force: true })
}
