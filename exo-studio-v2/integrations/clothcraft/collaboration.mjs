// Local collaboration metadata and versioned project snapshots.
// Integration: createCollaborationApi({ directory, authenticate, allowOrigin }).handle(req,res)
// authenticate(bearerToken,req) MUST return { userId } for a verified credential.
// Browser origins never grant identity. Server must bind loopback unless LAN is explicitly enabled.
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID, randomBytes, createHash } from 'node:crypto'

const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value)
const name = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 120
const object = value => !!value && typeof value === 'object' && !Array.isArray(value)
const fail = (status, code) => { const error = new Error(code); error.status = status; throw error }
const now = () => new Date().toISOString()
const roleRank = { viewer: 1, commenter: 2, editor: 3, owner: 4 }

export function createCollaborationApi({ directory, authenticate = async () => null, allowOrigin = () => false } = {}) {
  if (!directory || typeof authenticate !== 'function') throw new TypeError('directory and authenticate callback required')
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const file = path.join(directory, 'collaboration-v1.json')
  let db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) :
    { version: 1, profiles: {}, teams: {}, projects: {}, comments: {}, shares: {} }
  if (db.version !== 1 || !object(db.teams) || !object(db.projects)) throw new Error('Unsupported collaboration store')
  db.shares ||= {}
  db.history ||= {}
  const clients = new Map()
  // Room presence is per browser session rather than just user. Closing one
  // tab must not mark the same designer offline in a second open tab.
  const presence = new Map()
  const activePresence = projectId => {
    const room = presence.get(projectId)
    const online = new Set()
    if (!room) return online
    for (const [userId, sessions] of room) {
      for (const [sessionId, seenAt] of sessions) {
        if (Date.now() - seenAt >= 60000 || !canAccess(projectId, userId)) sessions.delete(sessionId)
      }
      if (sessions.size) online.add(userId)
      else room.delete(userId)
    }
    if (!room.size) presence.delete(projectId)
    return online
  }
  const presencePayload = projectId => ({
    projectId,
    users: [...activePresence(projectId)],
    members: memberList(projectId),
  })
  const save = () => {
    const temporary = path.join(directory, '.collaboration-' + randomUUID())
    try {
      fs.writeFileSync(temporary, JSON.stringify(db), { mode: 0o600, flag: 'wx' })
      fs.renameSync(temporary, file)
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
  }
  const emit = (projectId, event, payload) => {
    const wire = 'event: ' + event + '\ndata: ' + JSON.stringify(payload) + '\n\n'
    for (const entry of clients.get(projectId) || []) {
      if (!entry.res.destroyed && !entry.res.writableEnded && canAccess(projectId, entry.userId)) entry.res.write(wire)
      else entry.res.end()
    }
  }
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key) ? obj[key] : null
  const projectRole = (project, userId) => {
    if (project.ownerId === userId) return 'owner'
    const direct = own(project.roles, userId)
    const teamRole = own(db.teams[project.teamId]?.members, userId)
    return (roleRank[direct] || 0) >= (roleRank[teamRole] || 0) ? direct : teamRole
  }
  const canAccess = (projectId, userId) => !!db.projects[projectId] && (roleRank[projectRole(db.projects[projectId], userId)] || 0) >= roleRank.viewer
  const publicProfile = id => ({ userId: id, displayName: db.profiles[id]?.displayName || id,
    avatarDataUrl: db.profiles[id]?.avatarDataUrl || null })
  const memberList = id => {
    const project = db.projects[id], team = db.teams[project.teamId]
    const ids = new Set([project.ownerId, ...Object.keys(project.roles || {}), ...Object.keys(team?.members || {})])
    const online = activePresence(id)
    return [...ids].filter(userId => projectRole(project, userId)).map(userId => ({
      userId, role: projectRole(project, userId), profile: publicProfile(userId),
      online: online.has(userId),
    }))
  }
  const access = (projectId, userId, required = 'viewer') => {
    const project = db.projects[projectId]
    if (!project || (roleRank[projectRole(project, userId)] || 0) < roleRank[required]) fail(404, 'PROJECT_NOT_FOUND')
    return project
  }
  const teamAccess = (teamId, userId, required = 'viewer') => {
    const team = db.teams[teamId]
    if (!team || (roleRank[team.members?.[userId]] || 0) < roleRank[required]) fail(404, 'TEAM_NOT_FOUND')
    return team
  }
  const allowedCors = req => req.headers.origin && allowOrigin(req.headers.origin)
  const headers = req => ({
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    ...(allowedCors(req) ? { 'Access-Control-Allow-Origin': req.headers.origin, Vary: 'Origin' } : {}),
  })
  const respond = (req, res, status, body) => {
    res.writeHead(status, { ...headers(req), 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
  }
  const read = async (req,allowEmpty=false) => {
    let size = 0; const chunks = []
    for await (const chunk of req) {
      size += chunk.length
      if (size > 8 * 1024 * 1024) fail(413, 'BODY_TOO_LARGE')
      chunks.push(chunk)
    }
    let body
    if(allowEmpty&&!size)return {}
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { fail(400, 'INVALID_JSON') }
    if (!object(body)) fail(400, 'INVALID_BODY')
    return body
  }
  const requireName = value => { if (!name(value)) fail(400, 'INVALID_NAME'); return value.trim() }
  const requireRole = role => { if (!['viewer', 'commenter', 'editor'].includes(role)) fail(400, 'INVALID_ROLE'); return role }

  async function handle(req, res) {
    const url = new URL(req.url || '/', 'http://localhost')
    if (!url.pathname.startsWith('/collab/v1/')) return false
    if (req.headers.origin && !allowedCors(req)) { respond(req, res, 403, { ok: false, code: 'ORIGIN_FORBIDDEN' }); return true }
    if (req.method === 'OPTIONS') {
      if (!allowedCors(req)) { respond(req, res, 403, { ok: false, code: 'ORIGIN_FORBIDDEN' }); return true }
      res.writeHead(204, { ...headers(req), 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' })
      res.end(); return true
    }
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1]
    let identity = null
    try { if (token) identity = await authenticate(token, req) } catch {}
    if (!validId(identity?.userId)) { respond(req, res, 401, { ok: false, code: 'UNAUTHORIZED' }); return true }
    const userId = identity.userId
    const method = req.method
    const pieces = url.pathname.split('/').filter(Boolean).slice(2)
    try {
      let data; let status = 200
      if (method === 'GET' && pieces.join('/') === 'me') data = { profile: db.profiles[userId] || { userId, displayName: userId } }
      else if (method === 'GET' && pieces.join('/') === 'state') {
        const projects = Object.values(db.projects).filter(p => projectRole(p, userId)).map(({ snapshot, ...p }) => p)
        data = { profile: db.profiles[userId] || { userId, displayName: userId }, teams: Object.values(db.teams).filter(t => t.members[userId]), projects,
          shares: Object.values(db.shares).filter(s => s.createdBy === userId).map(({ tokenHash, ...s }) => s) }
      } else if (method === 'GET' && pieces.join('/') === 'shares') {
        data = { shares: Object.values(db.shares).filter(s => s.createdBy === userId).map(({ tokenHash, ...s }) => s) }
      } else if (method === 'POST' && pieces.join('/') === 'shares') {
        const body = await read(req)
        if (!['project', 'team'].includes(body.targetType) || !validId(body.targetId)) fail(400, 'UNSUPPORTED_SHARE_TARGET')
        if (body.targetType === 'project') access(body.targetId, userId, 'owner')
        else teamAccess(body.targetId, userId, 'owner')
        const role = requireRole(body.permission)
        if (body.email !== undefined && (typeof body.email !== 'string' || body.email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email))) fail(400, 'INVALID_EMAIL')
        const token = randomBytes(32).toString('base64url'), id = randomUUID()
        const share = { id, targetType: body.targetType, targetId: body.targetId, permission: role,
          email: body.email || null, createdBy: userId, createdAt: now(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          tokenHash: createHash('sha256').update(token).digest('hex'), redeemedBy: null, previousRole: null, revoked: false }
        db.shares[id] = share; save(); status = 201
        const { tokenHash, ...publicShare } = share
        data = { share: publicShare, inviteToken: token, delivery: 'manual', message: 'Share this token privately; no email was sent' }
      } else if (method === 'POST' && pieces.join('/') === 'shares/redeem') {
        const body = await read(req)
        if (typeof body.inviteToken !== 'string' || body.inviteToken.length > 200) fail(400, 'INVALID_INVITE')
        const hash = createHash('sha256').update(body.inviteToken).digest('hex')
        const share = Object.values(db.shares).find(s => s.tokenHash === hash && !s.revoked && !s.redeemedBy && Date.parse(s.expiresAt) > Date.now())
        if (!share) fail(404, 'INVITE_NOT_FOUND')
        if (share.targetType === 'project') {
          const project = db.projects[share.targetId]
          if (!project) fail(404, 'PROJECT_NOT_FOUND')
          share.previousRole = own(project.roles, userId)
          if (userId !== project.ownerId && (roleRank[share.permission] > (roleRank[projectRole(project, userId)] || 0))) project.roles[userId] = share.permission
        } else {
          const team = db.teams[share.targetId]
          if (!team) fail(404, 'TEAM_NOT_FOUND')
          share.previousRole = own(team.members, userId)
          if (roleRank[share.permission] > (roleRank[share.previousRole] || 0)) team.members[userId] = share.permission
        }
        share.redeemedBy = userId; save(); data = { targetType: share.targetType, targetId: share.targetId, role: share.permission }
        if (share.targetType === 'project') emit(share.targetId, 'membership', { projectId: share.targetId })
      } else if (method === 'DELETE' && pieces[0] === 'shares' && pieces.length === 2) {
        const share = db.shares[pieces[1]]
        if (!share || share.createdBy !== userId) fail(404, 'SHARE_NOT_FOUND')
        if (!share.revoked && share.redeemedBy) {
          const members = share.targetType === 'project' ? db.projects[share.targetId]?.roles : db.teams[share.targetId]?.members
          if (members?.[share.redeemedBy] === share.permission) {
            if (share.previousRole) members[share.redeemedBy] = share.previousRole
            else delete members[share.redeemedBy]
          }
        }
        share.revoked = true; save(); data = { shareId: share.id, revoked: true }
        if (share.targetType === 'project') emit(share.targetId, 'membership', { projectId: share.targetId })
      } else if (method === 'PUT' && pieces[0] === 'shares' && pieces.length === 2) {
        const share = own(db.shares, pieces[1])
        if (!share || share.createdBy !== userId || share.revoked) fail(404, 'SHARE_NOT_FOUND')
        const body = await read(req), permission = requireRole(body.permission)
        if (share.targetType === 'project') access(share.targetId, userId, 'owner')
        else teamAccess(share.targetId, userId, 'owner')
        if (share.redeemedBy) {
          const members = share.targetType === 'project' ? db.projects[share.targetId]?.roles : db.teams[share.targetId]?.members
          if (members?.[share.redeemedBy] !== share.permission) fail(409, 'MEMBERSHIP_CHANGED')
          const target = share.targetType === 'project' ? db.projects[share.targetId] : db.teams[share.targetId]
          if (share.redeemedBy === target.ownerId || members?.[share.redeemedBy] === 'owner') fail(409, 'OWNER_CANNOT_CHANGE')
          members[share.redeemedBy] = permission
        }
        share.permission = permission; save()
        const { tokenHash, ...publicShare } = share
        data = { share: publicShare }
        if (share.targetType === 'project') emit(share.targetId, 'membership', { projectId: share.targetId })
      }
      else if (method === 'PUT' && pieces.join('/') === 'me') {
        const body = await read(req)
        if (body.avatarDataUrl !== undefined && body.avatarDataUrl !== null &&
          (typeof body.avatarDataUrl !== 'string' || body.avatarDataUrl.length > 180000 ||
          !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.avatarDataUrl))) fail(400, 'INVALID_AVATAR')
        data = { profile: db.profiles[userId] = { userId, displayName: requireName(body.displayName),
          bio: typeof body.bio === 'string' ? body.bio.slice(0, 500) : '',
          avatarDataUrl: body.avatarDataUrl === undefined ? (db.profiles[userId]?.avatarDataUrl || null) : body.avatarDataUrl } }; save()
      } else if (method === 'GET' && pieces.join('/') === 'teams') {
        data = { teams: Object.values(db.teams).filter(t => t.members[userId]).map(t => ({ ...t })) }
      } else if (method === 'POST' && pieces.join('/') === 'teams') {
        const body = await read(req), id = randomUUID()
        data = { team: db.teams[id] = { id, name: requireName(body.name), members: { [userId]: 'owner' }, createdAt: now() } }; save(); status = 201
      } else if (pieces[0] === 'teams' && pieces.length === 3 && pieces[2] === 'members' && method === 'POST') {
        const team = teamAccess(pieces[1], userId, 'owner'), body = await read(req)
        if (!validId(body.userId)) fail(400, 'INVALID_USER')
        if (team.members[body.userId] === 'owner') fail(409, 'OWNER_CANNOT_CHANGE')
        team.members[body.userId] = requireRole(body.role); save(); data = { team }
      } else if (method === 'GET' && pieces.join('/') === 'projects') {
        data = { projects: Object.values(db.projects).filter(p => projectRole(p, userId)).map(({ snapshot, ...p }) => p) }
      } else if (method === 'POST' && pieces.join('/') === 'projects') {
        const body = await read(req)
        if (!validId(body.teamId)) fail(400, 'INVALID_TEAM')
        teamAccess(body.teamId, userId, 'editor')
        const id = randomUUID()
        const project = { id, teamId: body.teamId, ownerId: userId, name: requireName(body.name), roles: {}, revision: 0, snapshot: null, updatedAt: now() }
        db.projects[id] = project; save(); status = 201; data = { project: { ...project, snapshot: undefined } }
      } else if (pieces[0] === 'projects' && validId(pieces[1])) {
        const id = pieces[1]
        if (pieces.length === 2 && method === 'GET') {
          const { snapshot, ...project } = access(id, userId); data = { project }
        } else if (pieces[2] === 'snapshot' && pieces.length === 3 && method === 'GET') {
          const project = access(id, userId); data = { projectId: id, revision: project.revision, snapshot: project.snapshot }
        } else if (pieces[2] === 'snapshot' && pieces.length === 3 && method === 'PUT') {
          const project = access(id, userId, 'editor'), body = await read(req)
          if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail(400, 'REVISION_REQUIRED')
          if (body.expectedRevision !== project.revision) { respond(req, res, 409, { ok: false, code: 'STALE_REVISION', currentRevision: project.revision }); return true }
          if (!('snapshot' in body) || !object(body.snapshot)) fail(400, 'INVALID_SNAPSHOT')
          project.snapshot = body.snapshot; project.revision++; project.updatedAt = now()
          ;(db.history[id] ||= []).push({ revision: project.revision, authorId: userId, createdAt: project.updatedAt })
          save()
          data = { projectId: id, revision: project.revision }; emit(id, 'revision', data)
        } else if (pieces[2] === 'history' && pieces.length === 3 && method === 'GET') {
          access(id, userId); data = { projectId: id, history: db.history[id] || [] }
        } else if (pieces[2] === 'members' && pieces.length === 3 && method === 'GET') {
          access(id, userId); data = { projectId: id, members: memberList(id) }
        } else if (pieces[2] === 'members' && pieces.length === 3 && method === 'POST') {
          const project = access(id, userId, 'owner'), body = await read(req)
          if (!validId(body.userId)) fail(400, 'INVALID_USER')
          if (body.userId === project.ownerId) fail(409, 'OWNER_CANNOT_CHANGE')
          project.roles[body.userId] = requireRole(body.role); save(); data = { projectId: id, roles: project.roles }; emit(id, 'membership', { projectId: id })
        } else if (pieces[2] === 'comments' && pieces.length === 3 && method === 'GET') {
          access(id, userId); data = { comments: db.comments[id] || [] }
        } else if (pieces[2] === 'comments' && pieces.length === 3 && method === 'POST') {
          access(id, userId, 'commenter'); const body = await read(req)
          if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4000) fail(400, 'INVALID_COMMENT')
          const comment = { id: randomUUID(), projectId: id, authorId: userId, text: body.text.trim(), createdAt: now(), revision: db.projects[id].revision }
          ;(db.comments[id] ||= []).push(comment); save(); status = 201; data = { comment }; emit(id, 'comment', comment)
        } else if (pieces[2] === 'presence' && pieces.length === 3 && method === 'POST') {
          access(id, userId)
          const body = await read(req,true)
          const sessionId = validId(body.sessionId) ? body.sessionId : 'default'
          const room = presence.get(id) || new Map(), sessions = room.get(userId) || new Map()
          sessions.set(sessionId, Date.now()); room.set(userId, sessions); presence.set(id, room)
          data = presencePayload(id)
          emit(id, 'presence', data)
        } else if (pieces[2] === 'presence' && pieces.length === 3 && method === 'DELETE') {
          access(id, userId)
          const body = await read(req)
          if (!validId(body.sessionId)) fail(400, 'INVALID_SESSION')
          const room=presence.get(id), sessions=room?.get(userId)
          sessions?.delete(body.sessionId)
          if (sessions && !sessions.size) room.delete(userId)
          if (room && !room.size) presence.delete(id)
          data = presencePayload(id)
          emit(id, 'presence', data)
        } else if (pieces[2] === 'events' && pieces.length === 3 && method === 'GET') {
          access(id, userId)
          res.writeHead(200, { ...headers(req), 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
          res.write(': connected\n\n')
          const room = clients.get(id) || new Set(); const entry = { res, userId }; room.add(entry); clients.set(id, room)
          const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(': heartbeat\n\n') }, 25000)
          req.on('close', () => { clearInterval(heartbeat); room.delete(entry); if (!room.size) clients.delete(id) })
          return true
        } else fail(404, 'NOT_FOUND')
      } else fail(404, 'NOT_FOUND')
      respond(req, res, status, { ok: true, ...data })
    } catch (error) {
      respond(req, res, error.status || 500, { ok: false, code: error.status ? error.message : 'INTERNAL_ERROR' })
    }
    return true
  }
  const sweep = setInterval(()=>{
    for (const projectId of [...presence.keys()]) {
      const previous=[...presence.get(projectId).entries()].map(([id,sessions])=>`${id}:${sessions.size}`).join('|')
      activePresence(projectId)
      const current=[...(presence.get(projectId)||new Map()).entries()].map(([id,sessions])=>`${id}:${sessions.size}`).join('|')
      if (previous !== current) emit(projectId,'presence',presencePayload(projectId))
    }
  },15000)
  sweep.unref?.()
  return { handle, close() { clearInterval(sweep); for (const room of clients.values()) for (const entry of room) entry.res.end(); clients.clear() } }
}
