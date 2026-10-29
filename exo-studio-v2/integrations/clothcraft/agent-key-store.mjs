import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomBytes, createHash, timingSafeEqual, randomUUID } from 'node:crypto'

export const AGENT_SCOPES = Object.freeze(['read', 'edit', 'simulate'])
export const defaultAgentKeyPath = () => process.env.EXO_AGENT_KEY_STORE_PATH || path.join(os.homedir(), 'Library', 'Application Support', 'EXO-ClothCraft-Studio-V2', 'agent-keys.json')
const digest = value => createHash('sha256').update(value).digest('hex')
const metadata = record => ({ id: record.id, name: record.name, scopes: record.scopes, createdAt: record.createdAt, expiresAt: record.expiresAt, revokedAt: record.revokedAt, lastUsedAt: record.lastUsedAt ?? null })

export function createAgentKeyStore(filePath = defaultAgentKeyPath()) {
  const location = path.resolve(filePath)
  function load() {
    try {
      const stat = fs.lstatSync(location)
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw Error('Agent key store must be a private regular file (0600)')
      const data = JSON.parse(fs.readFileSync(location, 'utf8'))
      if (data.version !== 1 || !Array.isArray(data.keys)) throw Error('Unsupported agent key store')
      return data.keys
    } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  function save(keys) {
    fs.mkdirSync(path.dirname(location), { recursive: true, mode: 0o700 })
    const temporary = `${location}.${randomUUID()}.tmp`
    try {
      fs.writeFileSync(temporary, JSON.stringify({ version: 1, keys }, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
      fs.chmodSync(temporary, 0o600)
      fs.renameSync(temporary, location)
    } finally { try { fs.unlinkSync(temporary) } catch {} }
  }
  return {
    path: location,
    list() { return load().map(metadata) },
    create({ name, scopes, expiresAt = null }) {
      if (typeof name !== 'string' || !name.trim() || name.length > 100) throw Error('Invalid key name')
      if (!Array.isArray(scopes) || !scopes.length || scopes.length > 3 || new Set(scopes).size !== scopes.length || scopes.some(s => !AGENT_SCOPES.includes(s))) throw Error('Invalid key scopes')
      if (!scopes.includes('read')) throw Error('Every agent key must include read scope for revision inspection')
      if (expiresAt !== null && (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) throw Error('Invalid key expiration')
      const raw = `cck_${randomBytes(32).toString('base64url')}`
      const salt = randomBytes(32).toString('hex')
      const item = { id: randomUUID(), name: name.trim(), scopes, createdAt: new Date().toISOString(), expiresAt, revokedAt: null, lastUsedAt: null, salt, hash: digest(`${salt}:${raw}`) }
      const keys = load(); keys.push(item); save(keys)
      return { ...metadata(item), key: raw }
    },
    revoke(id) {
      const keys = load(); const item = keys.find(k => k.id === id)
      if (!item) return null
      if (!item.revokedAt) { item.revokedAt = new Date().toISOString(); save(keys) }
      return metadata(item)
    },
    authenticate(token) {
      if (typeof token !== 'string' || !token.startsWith('cck_') || token.length > 256) return null
      const keys = load()
      const match = keys.find(k => {
        if (typeof k.salt !== 'string' || typeof k.hash !== 'string' || !/^[a-f0-9]{64}$/.test(k.hash)) return false
        return timingSafeEqual(Buffer.from(digest(`${k.salt}:${token}`), 'hex'), Buffer.from(k.hash, 'hex'))
      })
      if (!match || match.revokedAt || (match.expiresAt && Date.parse(match.expiresAt) <= Date.now())) return null
      match.lastUsedAt = new Date().toISOString()
      save(keys)
      return metadata(match)
    },
  }
}
