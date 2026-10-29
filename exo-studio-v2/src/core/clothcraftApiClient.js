const DEFAULT_BRIDGE = typeof window !== 'undefined' && window.location.port === '5486'
  ? 'http://127.0.0.1:5485' : typeof window !== 'undefined' && window.location.port === '5386'
  ? 'http://127.0.0.1:5385' : 'http://127.0.0.1:5191';

export const CLOTHCRAFT_BRIDGE = DEFAULT_BRIDGE;

async function request(path, body, { signal } = {}) {
  const response = await fetch(`${CLOTHCRAFT_BRIDGE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal,
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`HTTP ${response.status}: invalid JSON response`); }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || payload?.code || `HTTP ${response.status}`);
  return payload;
}

async function keyRequest(method, path, body, { signal } = {}) {
  const response = await fetch(`${CLOTHCRAFT_BRIDGE}${path}`, {
    method,
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store', signal,
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`HTTP ${response.status}: invalid JSON response`); }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || payload?.code || `HTTP ${response.status}`);
  return payload;
}

export const listClothCraftApiKeys = options => keyRequest('GET', '/agent/v1/keys', undefined, options);
export const createClothCraftApiKey = ({ name, scopes, expiresInDays }, options) => keyRequest('POST', '/agent/v1/keys', { name, scopes, expiresInDays }, options);
export const revokeClothCraftApiKey = (id, options) => keyRequest('DELETE', `/agent/v1/keys/${encodeURIComponent(id)}`, undefined, options);

export const readClothCraftHealth = options => request('/health', null, options);
export const readClothCraftStatus = options => request('/agent/v1/status', null, options);
export const readClothCraftCapabilities = options => request('/agent/v1/capabilities', null, options);
export const runClothCraftAction = (action, args = {}, options) => request('/agent/v1/actions', { action, ...args }, options);

export function summarizeClothCraftSnapshot(result) {
  const data = result?.data || {};
  return {
    revision: data.revision ?? null,
    name: data.template?.name || data.name || 'Current native project',
    panels: (data.template?.panels || []).map(p => ({ id: p.id, name: p.name || p.id, edges: p.polygon?.edges || [] })),
    fabrics: (data.template?.fabrics || []).map(f => f.name || f.id),
    seams: data.template?.seams?.length ?? 0,
    time: data.time ?? null,
    running: Boolean(data.running), busy: Boolean(data.busy),
  };
}
