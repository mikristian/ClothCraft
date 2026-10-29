// DEVELOPMENT ONLY. The policy SHA-256 pin must arrive through an independently trusted channel.
// This checks local key policy integrity; it never authenticates a publisher or authorizes execution.
import { createHash, createPublicKey, timingSafeEqual } from 'node:crypto'
import { TextDecoder, types } from 'node:util'

const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const digest = /^[0-9a-f]{64}$/
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const instantPattern = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z$/
const prefix = Buffer.from('302a300506032b6570032100', 'hex')

function plainRecord(value, allowed, mandatory = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) throw Error('UNSAFE_RECORD')
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_RECORD')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(descriptors)
  if (keys.some(k => typeof k !== 'string' || !allowed.includes(k) || !Object.hasOwn(descriptors[k], 'value')) || mandatory.some(k => !Object.hasOwn(descriptors, k))) throw Error('INVALID_FIELDS')
  const result = Object.create(null)
  for (const key of keys) result[key] = descriptors[key].value
  return result
}

function copyBytes(value, maxLength, label) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error(`UNSAFE_${label}`)
  if (Object.getPrototypeOf(value) !== Buffer.prototype && Object.getPrototypeOf(value) !== Uint8Array.prototype) throw Error(`UNSAFE_${label}`)
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key))) throw Error(`UNSAFE_${label}`)
  if (value.buffer instanceof SharedArrayBuffer) throw Error(`UNSAFE_SHARED_${label}`)
  if (!value.byteLength || value.byteLength > maxLength) throw Error(`INVALID_${label}`)
  return Buffer.from(value)
}

function parseInstant(value) {
  if (typeof value !== 'string' || !instantPattern.test(value)) throw Error('INVALID_UTC_INSTANT')
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value.replace(/Z$/, '.000Z')) throw Error('INVALID_UTC_INSTANT')
  return timestamp
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`
  return JSON.stringify(value)
}

/** Checks caller-pinned canonical JSON policy bytes for one active Ed25519 key at a caller-supplied UTC instant. */
export function preflightPythonDependencySigningKeyPolicy(options) {
  const o = plainRecord(options, ['policyBytes', 'pinnedPolicySha256', 'keyId', 'pinnedPublicKeySpkiDer', 'nowUtc'])
  if (typeof o.pinnedPolicySha256 !== 'string' || !digest.test(o.pinnedPolicySha256)) throw Error('INVALID_POLICY_PIN')
  if (typeof o.keyId !== 'string' || !idPattern.test(o.keyId)) throw Error('INVALID_KEY_ID')
  const now = parseInstant(o.nowUtc)
  const policyBytes = copyBytes(o.policyBytes, 64 * 1024, 'POLICY_BYTES')
  const der = copyBytes(o.pinnedPublicKeySpkiDer, 44, 'KEY_DER')
  if (der.length !== 44) throw Error('INVALID_KEY_DER')
  if (o.policyBytes.buffer === o.pinnedPublicKeySpkiDer.buffer && o.policyBytes.byteOffset < o.pinnedPublicKeySpkiDer.byteOffset + o.pinnedPublicKeySpkiDer.byteLength && o.pinnedPublicKeySpkiDer.byteOffset < o.policyBytes.byteOffset + o.policyBytes.byteLength) throw Error('SHARED_BACKING')
  const observed = createHash('sha256').update(policyBytes).digest()
  if (!timingSafeEqual(observed, Buffer.from(o.pinnedPolicySha256, 'hex'))) throw Error('POLICY_PIN_MISMATCH')
  let parsed
  let source
  try { source = decoder.decode(policyBytes); parsed = JSON.parse(source) } catch { throw Error('INVALID_POLICY_JSON') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || canonicalize(parsed) !== source) throw Error('NONCANONICAL_POLICY')
  const policy = plainRecord(parsed, ['scope', 'keys'])
  if (policy.scope !== 'python-dependency-manifest') throw Error('INVALID_SCOPE')
  if (!Array.isArray(policy.keys) || policy.keys.length < 1 || policy.keys.length > 128) throw Error('INVALID_KEYS')
  const seen = new Set()
  let selected = null
  for (const entry of policy.keys) {
    const key = plainRecord(entry, ['keyId', 'spkiSha256', 'status', 'validFromUtc', 'validUntilUtc'])
    if (typeof key.keyId !== 'string' || !idPattern.test(key.keyId) || seen.has(key.keyId)) throw Error('INVALID_OR_DUPLICATE_KEY_ID')
    seen.add(key.keyId)
    if (typeof key.spkiSha256 !== 'string' || !digest.test(key.spkiSha256)) throw Error('INVALID_KEY_DIGEST')
    if (key.status !== 'active' && key.status !== 'revoked' && key.status !== 'expired') throw Error('INVALID_KEY_STATUS')
    const from = parseInstant(key.validFromUtc)
    const until = parseInstant(key.validUntilUtc)
    if (from >= until) throw Error('INVALID_KEY_WINDOW')
    if (key.keyId === o.keyId) selected = { ...key, from, until }
  }
  if (!selected) throw Error('KEY_NOT_FOUND')
  if (selected.status !== 'active') throw Error('KEY_NOT_ACTIVE')
  if (now < selected.from || now >= selected.until) throw Error('KEY_OUTSIDE_VALIDITY')
  if (!der.subarray(0, prefix.length).equals(prefix)) throw Error('INVALID_KEY_DER')
  try {
    const key = createPublicKey({ key: der, format: 'der', type: 'spki' })
    if (key.asymmetricKeyType !== 'ed25519' || !key.export({ type: 'spki', format: 'der' }).equals(der)) throw Error('INVALID_KEY_DER')
  } catch { throw Error('INVALID_KEY_DER') }
  const observedDerDigest = createHash('sha256').update(der).digest()
  if (!timingSafeEqual(observedDerDigest, Buffer.from(selected.spkiSha256, 'hex'))) throw Error('KEY_DIGEST_MISMATCH')
  return Object.freeze({ developmentOnly: true, trustAnchorMatched: true, publisherAuthenticated: false, runtimeExecutionAuthorized: false, manufacturingApproved: false })
}
