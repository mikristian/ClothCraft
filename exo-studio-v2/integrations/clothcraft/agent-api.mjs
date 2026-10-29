// Versioned, localhost-only facade for the existing ClothCraft workspace.
import { createAgentKeyStore } from './agent-key-store.mjs'
import { createAgentValidator } from './rust-agent-api/client.mjs'
import { planOrderedAssembly } from '../../src/core/backends/nativeOrderedAssembly20261025.mjs'
// Mount handle() after the server's origin check, sharing its workspace instance.
export const AGENT_API_VERSION = '1.3.0'

export const capabilityManifest = Object.freeze({
  api: 'exo.clothcraft.agent', version: AGENT_API_VERSION,
  scope: 'single-local-workspace', transport: 'HTTP JSON on loopback',
  revision: 'Native revision integer. Mutations require expectedRevision; 409 on mismatch.',
  capabilities: [
    { id: 'agent.keys.list', method: 'GET', path: '/agent/v1/keys', mutates: false, access: 'trusted-ui-origin-only' },
    { id: 'agent.keys.create', method: 'POST', path: '/agent/v1/keys', mutates: true, access: 'trusted-ui-origin-only' },
    { id: 'agent.keys.revoke', method: 'DELETE', path: '/agent/v1/keys/:id', mutates: true, access: 'trusted-ui-origin-only' },
    { id: 'workspace.status', method: 'GET', path: '/agent/v1/status', mutates: false },
    { id: 'workspace.snapshot', method: 'POST', path: '/agent/v1/actions', mutates: false, args: { action: 'workspace.snapshot' } },
    { id: 'workspace.summary', method: 'POST', path: '/agent/v1/actions', mutates: false },
    { id: 'workspace.save', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision' },
    { id: 'workspace.undo', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision' },
    { id: 'workspace.redo', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision' },
    { id: 'workspace.batch', method: 'POST', path: '/agent/v1/batch', mutates: true, notes: 'Sequential; stops on first failure, no rollback, at most 16 actions' },
    { id: 'assembly.preflight', method: 'POST', path: '/agent/v1/actions', mutates: false, notes: 'Validate ordered 3D placements and seam lengths without edits' },
    { id: 'assembly.apply', method: 'POST', path: '/agent/v1/actions', mutates: true, access: 'edit', notes: 'Revision-checked ordered placement + sewing; revalidate on native edits, no rollback guarantee' },
    { id: 'simulation.pause', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision' },
    { id: 'simulation.step', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision', args: { steps: 'integer 1..4' } },
    { id: 'line.inspect', method: 'POST', path: '/agent/v1/actions', mutates: false, args: { panel: 'existing panel ID', edge: 'existing named boundary' }, units: 'cm' },
    { id: 'line.setTargetSpecification', method: 'POST', path: '/agent/v1/actions', mutates: true, precondition: 'expectedRevision', args: { panel: 'existing panel ID', edge: 'existing named boundary', targetCm: 'finite number 0.01..1000' }, effect: 'Drafting annotation only; no physical force or mesh deformation' },
  ],
  unsupported: ['create-garment', 'arbitrary-pattern-edit', 'fabric-grab', 'play', 'open-project-from-path', 'recover-off-body', 'fit-certification'],
})

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const ownKeys = (v, allowed) => Object.keys(v).every(k => allowed.includes(k))
const validRevision = n => Number.isSafeInteger(n) && n >= 0
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]))
function inspectLine(data, panel, edge) {
  const authored = data?.template?.panels?.find(p => p.id === panel)
  const meshPanel = data?.panels?.find(p => p.id === panel)
  if (!authored || !meshPanel) return { ok: false, code: 'UNKNOWN_PANEL' }
  if (!Array.isArray(authored.polygon?.edges) || !authored.polygon.edges.includes(edge) || !Array.isArray(meshPanel.boundaries?.[edge])) return { ok: false, code: 'UNKNOWN_EDGE' }
  const indices = meshPanel.boundaries[edge]
  if (indices.length < 2 || !indices.every(n => Number.isSafeInteger(n) && n >= 0 && Array.isArray(data.uv?.[n]) && Array.isArray(data.positions?.[n]) && data.uv[n].length >= 2 && data.positions[n].length >= 3 && data.uv[n].every(Number.isFinite) && data.positions[n].every(Number.isFinite))) return { ok: false, code: 'INVALID_GEOMETRY' }
  const uvCm = indices.map(i => data.uv[i].slice(0, 2).map(n => n * 100))
  const live3dCm = indices.map(i => data.positions[i].slice(0, 3).map(n => n * 100))
  const sumLength = points => points.slice(1).reduce((n, p, i) => n + distance(points[i], p), 0)
  return { ok: true, panel, edge, revision: data.revision, indices, uvCm, live3dCm, length2dCm: sumLength(uvCm), length3dCm: sumLength(live3dCm), targetSpecificationCm: Number.isFinite(authored.polygon?.target_lengths?.[edge]) ? authored.polygon.target_lengths[edge] * 100 : null, physicalEffect: 'none; drafting specification only' }
}

export function createAgentApi(workspace, { audit = () => {}, allowOrigin = () => false, keyStorePath } = {}) {
  if (!workspace || typeof workspace.request !== 'function' || typeof workspace.status !== 'function') throw new TypeError('Workspace API required')
  const keys = createAgentKeyStore(keyStorePath)
  const agentValidator = createAgentValidator()
  let inFlight = false
  const respond = (req, res, status, data) => {
    const origin = req.headers?.origin
    const cors = typeof origin === 'string' && origin && allowOrigin(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors })
    res.end(JSON.stringify(data))
  }
  const snapshot = async () => {
    if (!workspace.status().loaded) return { ok: false, error: 'No garment open', code: 'NOT_LOADED' }
    return workspace.request({ op: 'snapshot', avatar: false })
  }
  const summarize = data => ({ ok: true, revision: data.revision, running: Boolean(data.running), busy: Boolean(data.busy), name: data.template?.name || null,
    panels: (data.template?.panels || []).map(p => ({ id: p.id, name: p.name || p.id, fabric: p.fabric, edges: p.polygon?.edges || [] })),
    fabrics: (data.template?.fabrics || []).map(f => ({ id: f.id, name: f.name || f.id })),
    seams: (data.template?.seams || []).map(s => ({ id: s.id ?? null, a: s.a ?? null, b: s.b ?? null })),
    graphics: data.template?.graphics || [], time: data.time ?? null })
  const requiredScope = action => action?.startsWith('simulation.') ? 'simulate' : ['workspace.save', 'workspace.undo', 'workspace.redo', 'line.setTargetSpecification', 'assembly.apply'].includes(action) ? 'edit' : 'read'
  const dispatch = async (command, scopes = ['read', 'edit', 'simulate']) => {
    if (!scopes.includes(requiredScope(command?.action))) return { status: 403, body: { ok: false, code: 'INSUFFICIENT_SCOPE' } }
    const rustValidation = command?.action?.startsWith('assembly.') ? null : await agentValidator.validate(command)
    if (rustValidation?.status === 400) return rustValidation
    if (!isObject(command) || typeof command.action !== 'string' || !ownKeys(command, ['action', 'expectedRevision', 'steps', 'panel', 'edge', 'targetCm', 'proposal'])) return { status: 400, body: { ok: false, code: 'INVALID_ACTION', error: 'Unknown fields or malformed action' } }
    const { action, expectedRevision, steps, panel, edge, targetCm } = command
    if (!['workspace.snapshot', 'workspace.summary', 'workspace.save', 'workspace.undo', 'workspace.redo', 'simulation.pause', 'simulation.step', 'line.inspect', 'line.setTargetSpecification', 'assembly.preflight', 'assembly.apply'].includes(action)) return { status: 400, body: { ok: false, code: 'UNSUPPORTED_ACTION', error: 'Action is not in capability manifest' } }
    if (action === 'workspace.summary') {
      if (!ownKeys(command, ['action'])) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS' } }
      const result = await snapshot()
      return { status: result.ok ? 200 : 409, body: result.ok ? summarize(result.data) : result }
    }
    if (action === 'workspace.snapshot') {
      if (!ownKeys(command, ['action'])) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS' } }
      const result = await snapshot()
      return { status: result.ok ? 200 : 409, body: result }
    }
    if (action === 'assembly.preflight' || action === 'assembly.apply') {
      if (!ownKeys(command, action === 'assembly.preflight' ? ['action', 'proposal'] : ['action', 'proposal', 'expectedRevision'])) return { status:400, body:{ok:false,code:'INVALID_ARGUMENTS'} }
      const current=await snapshot()
      if (!current.ok)return {status:409,body:current}
      const plan=planOrderedAssembly(current.data,command.proposal)
      if (!plan.ok)return {status:422,body:{...plan,code:plan.reason}}
      if (action === 'assembly.preflight')return {status:200,body:{...plan,commands:undefined}}
      if (!validRevision(expectedRevision))return {status:400,body:{ok:false,code:'REVISION_REQUIRED'}}
      if (expectedRevision!==current.data.revision)return {status:409,body:{ok:false,code:'STALE_REVISION',currentRevision:current.data.revision}}
      if (workspace.status().busy || current.data?.busy || current.data?.running)return {status:409,body:{ok:false,code:'WORKSPACE_BUSY'}}
      let rev=expectedRevision,committed=0
      for (const step of plan.commands){
        let result
        try{result=await workspace.request({op:'edit',revision:rev,command:step})}catch(error){return {status:409,body:{ok:false,code:'ASSEMBLY_PARTIAL',committed,error:String(error.message||error),revision:rev}}}
        if (!result.ok)return {status:409,body:{ok:false,code:'ASSEMBLY_PARTIAL',committed,error:result.error,revision:rev}}
        const actualRevision=result.data?.revision
        if(!Number.isSafeInteger(actualRevision)||actualRevision!==rev+1)
          return {status:409,body:{ok:false,code:'ASSEMBLY_REVISION_DRIFT',committed,expectedRevision:rev+1,actualRevision:actualRevision??null}}
        rev=actualRevision;committed++
      }
      return {status:200,body:{ok:true,action,committed,revision:rev,placementCount:plan.placementCount,seamCount:plan.seamCount,warnings:plan.warnings,simulationApproved:false}}
    }
    const lineAction = action === 'line.inspect' || action === 'line.setTargetSpecification'
    if (lineAction) {
      const allowed = action === 'line.inspect' ? ['action', 'panel', 'edge'] : ['action', 'panel', 'edge', 'expectedRevision', 'targetCm']
      if (!ownKeys(command, allowed) || typeof panel !== 'string' || !panel.trim() || typeof edge !== 'string' || !edge.trim()) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS' } }
      if (action === 'line.setTargetSpecification' && (typeof targetCm !== 'number' || !Number.isFinite(targetCm) || targetCm < 0.01 || targetCm > 1000)) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS', error: 'targetCm must be 0.01–1000 cm' } }
    }
    if (action === 'line.inspect') {
      const result = await snapshot()
      if (!result.ok) return { status: 409, body: result }
      const line = inspectLine(result.data, panel, edge)
      return { status: line.ok ? 200 : 404, body: line }
    }
    if (!validRevision(expectedRevision)) return { status: 400, body: { ok: false, code: 'REVISION_REQUIRED', error: 'expectedRevision must be a nonnegative safe integer' } }
    if (['workspace.save', 'workspace.undo', 'workspace.redo'].includes(action) && !ownKeys(command, ['action', 'expectedRevision'])) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS' } }
    if (action === 'simulation.pause' && !ownKeys(command, ['action', 'expectedRevision'])) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS' } }
    // The native validator owns this action's argument check when it has
    // accepted the command. Preserve identical synchronous JS compatibility
    // validation when the child process is absent, busy or unresponsive.
    if (action === 'simulation.step' && rustValidation?.valid !== true && (!ownKeys(command, ['action', 'expectedRevision', 'steps']) || !Number.isInteger(steps) || steps < 1 || steps > 4)) return { status: 400, body: { ok: false, code: 'INVALID_ARGUMENTS', error: 'steps must be integer 1..4' } }
    const current = await snapshot()
    if (!current.ok) return { status: 409, body: current }
    if (current.data?.revision !== expectedRevision) return { status: 409, body: { ok: false, code: 'STALE_REVISION', error: 'Snapshot revision differs', currentRevision: current.data?.revision } }
    if (['workspace.save', 'workspace.undo', 'workspace.redo'].includes(action)) {
      if (workspace.status().busy || current.data?.busy || current.data?.running) return { status: 409, body: { ok: false, code: 'WORKSPACE_BUSY' } }
      const operation = action.slice('workspace.'.length)
      const result = await workspace.request({ op: operation, ...(operation === 'save' ? {} : { revision: expectedRevision }) })
      if (!result.ok) return { status: 409, body: { ok: false, code: 'WORKSPACE_REJECTED', error: result.error || `${operation} rejected` } }
      return { status: 200, body: { ok: true, action, revision: result.data?.revision ?? expectedRevision, saved: operation === 'save' } }
    }
    if (action === 'line.setTargetSpecification') {
      if (workspace.status().busy || current.data?.running || current.data?.busy) return { status: 409, body: { ok: false, code: 'WORKSPACE_BUSY' } }
      const line = inspectLine(current.data, panel, edge)
      if (!line.ok) return { status: line.code === 'INVALID_GEOMETRY' ? 422 : 404, body: line }
      const result = await workspace.request({ op: 'line-spec', panel, edge, target_m: targetCm / 100, revision: expectedRevision })
      if (!result.ok) return { status: 409, body: { ...result, code: 'WORKSPACE_REJECTED' } }
      return { status: 200, body: { ok: true, action, panel, edge, targetSpecificationCm: targetCm, expectedRevision, revision: result.data?.revision, physicalEffect: 'none; drafting specification only' } }
    }
    if (action === 'simulation.step' && (current.data?.running || current.data?.busy)) return { status: 409, body: { ok: false, code: 'WORKSPACE_BUSY', error: 'Pause simulation before stepping' } }
    const result = await workspace.request(action === 'simulation.pause' ? { op: 'pause' } : { op: 'step', steps, revision: expectedRevision })
    if (!result.ok) return { status: 409, body: { ...result, code: 'WORKSPACE_REJECTED' } }
    return { status: 200, body: { ok: true, action, expectedRevision, revision: result.data?.revision, running: Boolean(result.data?.running), time: result.data?.time } }
  }
  async function handle(req, res) {
    const url = req.url?.split('?')[0]
    if (!url?.startsWith('/agent/v1/')) return false
    const origin = req.headers?.origin
    const trusted = typeof origin === 'string' && origin.length > 0 && allowOrigin(origin)
    if (origin && !trusted) { respond(req, res, 403, { ok: false, code: 'ORIGIN_FORBIDDEN' }); return true }
    const authorization = req.headers?.authorization
    const bearer = typeof authorization === 'string' && /^Bearer\s+\S+$/i.test(authorization) ? authorization.replace(/^Bearer\s+/i, '') : null
    const custom = req.headers?.['x-clothcraft-token']
    const token = bearer || custom || null
    const legacy = process.env.EXO_AGENT_API_TOKEN
    const legacyValid = Boolean(token && legacy && token === legacy)
    const identity = token && !legacyValid ? keys.authenticate(token) : null
    if (token && !legacyValid && !identity || (!trusted && !identity && !legacyValid)) { respond(req, res, 401, { ok: false, code: 'UNAUTHORIZED' }); return true }
    const scopes = identity?.scopes || ['read', 'edit', 'simulate']
    const management = url === '/agent/v1/keys' || url.startsWith('/agent/v1/keys/')
    if (management) {
      if (!trusted) { respond(req, res, 403, { ok: false, code: 'MANAGEMENT_ORIGIN_REQUIRED' }); return true }
      if (token && !legacyValid && !identity) { respond(req, res, 401, { ok: false, code: 'UNAUTHORIZED' }); return true }
      try {
        if (req.method === 'GET' && url === '/agent/v1/keys') { audit({ at: new Date().toISOString(), action: 'agent.keys.list', status: 200, ok: true }); respond(req, res, 200, { ok: true, keys: keys.list() }); return true }
        if (req.method === 'DELETE' && /^\/agent\/v1\/keys\/[0-9a-f-]{36}$/i.test(url)) {
          const revoked = keys.revoke(url.split('/').pop())
          audit({ at: new Date().toISOString(), action: 'agent.keys.revoke', status: revoked ? 200 : 404, ok: Boolean(revoked), keyId: revoked?.id ?? null })
          respond(req, res, revoked ? 200 : 404, revoked ? { ok: true, key: revoked } : { ok: false, code: 'KEY_NOT_FOUND' }); return true
        }
        if (req.method === 'POST' && url === '/agent/v1/keys') {
          const chunks = []; let size = 0
          for await (const chunk of req) { size += chunk.length; if (size > 4096) throw Error('Request too large'); chunks.push(chunk) }
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if (!isObject(body) || !ownKeys(body, ['name', 'scopes', 'expiresAt', 'expiresInDays']) || (body.expiresAt !== undefined && body.expiresInDays !== undefined)) throw Error('Invalid key fields')
          if (body.expiresInDays !== undefined && (!Number.isInteger(body.expiresInDays) || body.expiresInDays < 1 || body.expiresInDays > 365)) throw Error('expiresInDays must be an integer from 1 to 365')
          const expiresAt = body.expiresInDays === undefined ? body.expiresAt ?? null : new Date(Date.now() + body.expiresInDays * 86400000).toISOString()
          const created = keys.create({ ...body, expiresAt })
          audit({ at: new Date().toISOString(), action: 'agent.keys.create', status: 201, ok: true, keyId: created.id })
          respond(req, res, 201, { ok: true, ...created }); return true
        }
      } catch (error) { respond(req, res, 400, { ok: false, code: 'INVALID_KEY_REQUEST', error: error.message }); return true }
      respond(req, res, 404, { ok: false, code: 'NOT_FOUND' }); return true
    }
    if (!scopes.includes('read') && ['GET'].includes(req.method)) { respond(req, res, 403, { ok: false, code: 'INSUFFICIENT_SCOPE' }); return true }
    if (req.method === 'GET' && url === '/agent/v1/capabilities') { respond(req, res, 200, capabilityManifest); return true }
    if (req.method === 'GET' && url === '/agent/v1/status') { respond(req, res, 200, { ok: true, apiVersion: AGENT_API_VERSION, ...workspace.status() }); return true }
    if (req.method !== 'POST' || !['/agent/v1/actions', '/agent/v1/batch'].includes(url)) { respond(req, res, 404, { ok: false, code: 'NOT_FOUND' }); return true }
    if (inFlight) { respond(req, res, 409, { ok: false, code: 'AGENT_BUSY' }); return true }
    inFlight = true
    let action = 'invalid'
    let result
    try {
      const chunks = []
      let length = 0
      for await (const chunk of req) {
        length += chunk.length
        if (length > 16384) throw new Error('Agent request exceeds 16 KB')
        chunks.push(chunk)
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      action = url === '/agent/v1/batch' ? 'workspace.batch' : typeof data?.action === 'string' ? data.action : 'invalid'
      if (url === '/agent/v1/batch') {
        if (!isObject(data) || !ownKeys(data, ['actions']) || !Array.isArray(data.actions) || data.actions.length < 1 || data.actions.length > 16) result = { status: 400, body: { ok: false, code: 'INVALID_BATCH', error: 'Expected 1..16 actions' } }
        else {
          let completed = 0
          const results = []
          for (const item of data.actions) {
            const step = await dispatch(item, scopes)
            results.push(step.body)
            if (!step.body.ok) { result = { status: step.status, body: { ok: false, code: 'BATCH_STOPPED', failedIndex: completed, completed, results, error: step.body.error || step.body.code } }; break }
            completed++
          }
          result ||= { status: 200, body: { ok: true, completed, results } }
        }
      } else result = await dispatch(data, scopes)
    } catch (error) { result = { status: 400, body: { ok: false, code: 'INVALID_REQUEST', error: String(error.message || error) } } }
    finally { inFlight = false }
    try { audit({ at: new Date().toISOString(), action, status: result.status, ok: result.body.ok, revision: result.body.revision ?? null }) } catch { /* telemetry must never alter operations */ }
    respond(req, res, result.status, result.body)
    return true
  }
  return { handle, dispatch, close: () => agentValidator.close() }
}
