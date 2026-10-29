import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createCollaborationApi } from './collaboration.mjs'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clothcraft-collab-'))
const authenticate = async token => ({ alice: { userId: 'alice' }, bob: { userId: 'bob' }, outsider: { userId: 'outsider' } }[token] || null)
const options = { directory, authenticate, allowOrigin: origin => origin === 'http://localhost:5173' }
let api = createCollaborationApi(options)
const server = http.createServer((req, res) => api.handle(req, res).then(handled => {
  if (!handled) { res.writeHead(404); res.end() }
}))
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const root = 'http://127.0.0.1:' + server.address().port
const request = async (method, endpoint, token, body, origin) => {
  const response = await fetch(root + '/collab/v1/' + endpoint, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(origin ? { Origin: origin } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, body: await response.json(), headers: response.headers }
}
let assertions = 0
const check = (actual, expected) => { assert.equal(actual, expected); assertions++ }
try {
  check((await request('GET', 'teams')).status, 401)
  check((await request('GET', 'teams', 'alice', null, 'http://evil.example')).status, 403)
  check((await request('GET', 'teams', 'alice', null, 'http://localhost:5173')).headers.get('access-control-allow-origin'), 'http://localhost:5173')
  const teamResult = await request('POST', 'teams', 'alice', { name: 'Designers' })
  assert.equal(teamResult.status, 201, JSON.stringify(teamResult.body))
  const team = teamResult.body.team
  check(team.members.alice, 'owner')
  check((await request('GET', 'teams', 'outsider')).body.teams.length, 0)
  check((await request('POST', 'teams/' + team.id + '/members', 'bob', { userId: 'outsider', role: 'editor' })).status, 404)
  check((await request('POST', 'teams/' + team.id + '/members', 'alice', { userId: 'bob', role: 'editor' })).status, 200)
  const project = (await request('POST', 'projects', 'alice', { name: 'Runway', teamId: team.id })).body.project
  check((await request('GET', 'projects/' + project.id + '/snapshot', 'outsider')).status, 404)
  check((await request('GET', 'projects/' + project.id + '/snapshot', 'bob')).body.revision, 0)
  check((await request('PUT', 'projects/' + project.id + '/snapshot', 'outsider', { expectedRevision: 0, snapshot: { model: 1 } })).status, 404)
  check((await request('PUT', 'projects/' + project.id + '/snapshot', 'bob', { expectedRevision: 0, snapshot: { model: 1 } })).body.revision, 1)
  const stale = await request('PUT', 'projects/' + project.id + '/snapshot', 'alice', { expectedRevision: 0, snapshot: { model: 2 } })
  check(stale.status, 409)
  check(stale.body.currentRevision, 1)
  check((await request('POST', 'projects/' + project.id + '/comments', 'bob', { text: 'Adjust sleeve' })).status, 201)
  check((await request('GET', 'projects/' + project.id + '/comments', 'alice')).body.comments.length, 1)
  check((await request('POST', 'projects/' + project.id + '/members', 'alice', { userId: 'outsider', role: 'viewer' })).status, 200)
  check((await request('POST', 'projects/' + project.id + '/comments', 'outsider', { text: 'Denied' })).status, 404)
  check((await request('GET', 'projects/' + project.id + '/snapshot', 'outsider')).body.snapshot.model, 1)
  const room='projects/' + project.id + '/presence'
  check((await request('POST', room, 'bob', {sessionId:'bob-laptop'})).body.users.includes('bob'), true)
  check((await request('POST', room, 'alice', {sessionId:'alice-desktop'})).body.users.length, 2)
  check((await request('POST', room, 'alice', {sessionId:'alice-phone'})).body.users.length, 2)
  check((await request('DELETE', room, 'alice', {sessionId:'alice-phone'})).body.users.includes('alice'), true)
  check((await request('DELETE', room, 'alice', {sessionId:'alice-desktop'})).body.users.includes('alice'), false)
  check((await request('GET', 'projects/' + project.id + '/members', 'bob')).body.members.find(member=>member.userId==='alice').online, false)
  check((await request('DELETE', room, 'bob', {sessionId:'bob-laptop'})).body.users.length, 0)
  check((await request('DELETE', room, 'outsider', {sessionId:'outsider-tab'})).status, 200)
  check((await request('GET', 'state', 'alice')).body.projects.length, 1)
  const extra = (await request('POST', 'projects', 'alice', { name: 'Invite test', teamId: team.id })).body.project
  const invited = await request('POST', 'shares', 'alice', { targetType: 'project', targetId: extra.id, permission: 'commenter', email: 'designer@example.org' })
  check(invited.status, 201)
  check(invited.body.delivery, 'manual')
  check((await request('GET', 'projects/' + extra.id, 'outsider')).status, 404)
  check((await request('POST', 'shares/redeem', 'outsider', { inviteToken: invited.body.inviteToken })).status, 200)
  check((await request('GET', 'projects/' + extra.id, 'outsider')).status, 200)
  check((await request('POST', 'shares/redeem', 'bob', { inviteToken: invited.body.inviteToken })).status, 404)
  check((await request('DELETE', 'shares/' + invited.body.share.id, 'bob')).status, 404)
  check((await request('DELETE', 'shares/' + invited.body.share.id, 'alice')).status, 200)
  check((await request('GET', 'projects/' + extra.id, 'outsider')).status, 404)
  const abort = new AbortController()
  const stream = await fetch(root + '/collab/v1/projects/' + project.id + '/events', {
    headers: { Authorization: 'Bearer bob' }, signal: abort.signal,
  })
  check(stream.status, 200)
  check(stream.headers.get('content-type').startsWith('text/event-stream'), true)
  const reader = stream.body.getReader()
  const hello = await reader.read()
  check(new TextDecoder().decode(hello.value).includes(': connected'), true)
  await request('PUT', 'projects/' + project.id + '/snapshot', 'alice', { expectedRevision: 1, snapshot: { model: 3 } })
  const update = await reader.read()
  check(new TextDecoder().decode(update.value).includes('event: revision'), true)
  await reader.cancel()
  abort.abort()
  api.close(); await new Promise(resolve => server.close(resolve))
  api = createCollaborationApi(options)
  check((await api.handle({ url: '/unrelated', headers: {} }, {})), false)
  const reopened = http.createServer((req, res) => api.handle(req, res))
  await new Promise(resolve => reopened.listen(0, '127.0.0.1', resolve))
  const reply = await fetch('http://127.0.0.1:' + reopened.address().port + '/collab/v1/projects/' + project.id + '/snapshot', { headers: { Authorization: 'Bearer alice' } })
  check((await reply.json()).snapshot.model, 3)
  await new Promise(resolve => reopened.close(resolve))
  console.log('PASS collaboration API: ' + assertions + ' assertions, persistence, roles, auth, revisions')
} finally {
  api.close()
  if (server.listening) await new Promise(resolve => server.close(resolve))
  fs.rmSync(directory, { recursive: true, force: true })
}
