// Local-first collaboration client. Server owns ACLs, comments and versioned
// shared snapshots; IndexedDB remains the source for personal project files.
import { parseCollaborationSseBlock, initializeRustCollaborationSseKernel } from './rustCollaborationSseKernel.js'
const DEFAULT_BASE = typeof window !== 'undefined' && window.location.port === '5486'
  ? 'http://127.0.0.1:5485' : typeof window !== 'undefined' && window.location.port === '5386'
  ? 'http://127.0.0.1:5385' : 'http://127.0.0.1:5193'
export const COLLABORATION_BASE = (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || DEFAULT_BASE).replace(/\/$/, '')
const TOKEN_STORAGE = 'exo.clothcraft.collaboration.agentKey.v1'
let inflightToken = null

function savedToken() {
  try { return window.localStorage.getItem(TOKEN_STORAGE) || '' } catch { return '' }
}
function saveToken(token) {
  try { window.localStorage.setItem(TOKEN_STORAGE, token) } catch { /* private browsing */ }
}
async function issueToken() {
  // Key provisioning is restricted by the bridge to trusted localhost UI origins.
  // A remote origin cannot mint a credential through this endpoint.
  const response = await fetch(`${COLLABORATION_BASE}/agent/v1/keys`, {
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({name:'File Library collaboration',scopes:['read','edit'],expiresInDays:180}),
  })
  const data = await response.json()
  if (!response.ok || !data.ok || !data.key) throw Error(data.error || data.code || 'Unable to establish a collaboration session')
  saveToken(data.key)
  return data.key
}
async function token(refresh = false) {
  if (!refresh && savedToken()) return savedToken()
  if (!inflightToken) inflightToken = issueToken().finally(() => { inflightToken = null })
  return inflightToken
}
export async function requestCollaboration(method, path, body, retry = true) {
  const bearer = await token()
  const response = await fetch(`${COLLABORATION_BASE}/collab/v1${path}`, {
    method,headers:{Authorization:`Bearer ${bearer}`,Accept:'application/json',...(body === undefined?{}:{'Content-Type':'application/json'})},
    cache:'no-store',...(body === undefined?{}:{body:JSON.stringify(body)}),
  })
  if (response.status === 401 && retry) {
    // A key can expire or be revoked. Create a new identity only from the
    // trusted local app origin, then retry once.
    await token(true)
    return requestCollaboration(method,path,body,false)
  }
  let data
  try { data = await response.json() } catch { throw Error(`Collaboration server returned HTTP ${response.status}`) }
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || data.code || `Collaboration HTTP ${response.status}`)
    error.code = data.code
    error.status = response.status
    error.currentRevision = data.currentRevision
    throw error
  }
  return data
}
export const collaboration = {
  profile: () => requestCollaboration('GET','/me'),
  updateProfile: ({displayName,bio='',avatarDataUrl}) => requestCollaboration('PUT','/me',{displayName,bio,...(avatarDataUrl===undefined?{}:{avatarDataUrl})}),
  teams: () => requestCollaboration('GET','/teams'),
  state: () => requestCollaboration('GET','/state'),
  createTeam: name => requestCollaboration('POST','/teams',{name}),
  projects: () => requestCollaboration('GET','/projects'),
  createProject: ({teamId,name}) => requestCollaboration('POST','/projects',{teamId,name}),
  project: id => requestCollaboration('GET',`/projects/${encodeURIComponent(id)}`),
  snapshot: id => requestCollaboration('GET',`/projects/${encodeURIComponent(id)}/snapshot`),
  history: id => requestCollaboration('GET',`/projects/${encodeURIComponent(id)}/history`),
  members: id => requestCollaboration('GET',`/projects/${encodeURIComponent(id)}/members`),
  publish: (id,expectedRevision,snapshot) => requestCollaboration('PUT',`/projects/${encodeURIComponent(id)}/snapshot`,{expectedRevision,snapshot}),
  comments: id => requestCollaboration('GET',`/projects/${encodeURIComponent(id)}/comments`),
  comment: (id,body) => requestCollaboration('POST',`/projects/${encodeURIComponent(id)}/comments`,{text:body}),
  presence: (id,sessionId) => requestCollaboration('POST',`/projects/${encodeURIComponent(id)}/presence`,{sessionId}),
  shares: () => requestCollaboration('GET','/shares'),
  share: input => requestCollaboration('POST','/shares',input),
  redeemShare: inviteToken => requestCollaboration('POST','/shares/redeem',{inviteToken}),
  revokeShare: id => requestCollaboration('DELETE',`/shares/${encodeURIComponent(id)}`),
  updateShare: (id,permission) => requestCollaboration('PUT',`/shares/${encodeURIComponent(id)}`,{permission}),
}

// A one-way, best-effort departure on pagehide/project switch. keepalive
// allows the signed desktop WebView to transmit the request while closing.
export function leaveProjectPresence(projectId,sessionId) {
  const bearer=savedToken()
  if(!bearer||!projectId||!sessionId)return Promise.resolve()
  return fetch(`${COLLABORATION_BASE}/collab/v1/projects/${encodeURIComponent(projectId)}/presence`,{
    method:'DELETE',keepalive:true,cache:'no-store',
    headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},
    body:JSON.stringify({sessionId}),
  }).catch(()=>{})
}

const MAPPING_STORAGE = 'exo.clothcraft.collaboration.projectMapping.v1'
export function readSharedProjectMapping() {
  try { const entries = JSON.parse(window.localStorage.getItem(MAPPING_STORAGE)||'{}');return entries&&typeof entries==='object'&&!Array.isArray(entries)?entries:{} }catch{return {}}
}
export function updateSharedProjectMapping(sourceId, value) {
  const mapping=readSharedProjectMapping()
  mapping[sourceId]={...mapping[sourceId],...value}
  try { window.localStorage.setItem(MAPPING_STORAGE,JSON.stringify(mapping)) } catch { /* Browser quota */ }
  return mapping[sourceId]
}

// Fetch streaming permits Authorization without embedding a secret in SSE URLs.
// The caller owns the abort controller; notifications never apply remote edits
// over a designer's uncommitted local garment changes.
export async function followProjectEvents(projectId, onEvent, signal) {
  // Loading is opportunistic: stream parsing never waits for WASM startup.
  void initializeRustCollaborationSseKernel()
  const bearer = await token()
  if (signal?.aborted) return
  const response = await fetch(`${COLLABORATION_BASE}/collab/v1/projects/${encodeURIComponent(projectId)}/events`, {
    headers:{Authorization:`Bearer ${bearer}`,Accept:'text/event-stream'},signal,cache:'no-store',
  })
  if (!response.ok || !response.body) throw Error(`Collaboration events unavailable (HTTP ${response.status})`)
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let pending = ''
  try {
    while (!signal?.aborted) {
      const {value,done} = await reader.read()
      if (done) break
      pending += decoder.decode(value,{stream:true}).replace(/\r/g,'')
      let index
      while ((index=pending.indexOf('\n\n'))>=0) {
        const block=pending.slice(0,index);pending=pending.slice(index+2)
        const {type:event,wire}=parseCollaborationSseBlock(block)
        if (wire) { try { onEvent({type:event,data:JSON.parse(wire)}) } catch { /* malformed server event */ } }
      }
    }
  } finally { await reader.cancel().catch(()=>{}) }
}
