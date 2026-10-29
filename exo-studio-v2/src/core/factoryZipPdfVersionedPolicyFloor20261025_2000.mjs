// DEVELOPMENT ONLY. Root identity, UTC time and minimum trusted version are caller supplied.
// This stateless verifier cannot independently establish or persist an anti-rollback floor.
import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto'
import { TextDecoder, types } from 'node:util'
import { preflightPythonDependencySigningKeyPolicy } from './factoryZipPdfDependencyKeyPolicy20261025_1800.mjs'

const VERSIONED_POLICY_DOMAIN_V2 = 'EXO2D-PY-DEPENDENCY-KEY-POLICY-V2\0'
const DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const fields = ['policyBytes', 'rootSignatureBytes', 'rootPublicKeySpkiDer', 'pinnedRootSpkiSha256', 'signingPublicKeySpkiDer', 'keyId', 'nowUtc', 'minimumTrustedVersion']

function plain(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || types.isProxy(value)) throw Error('UNSAFE_' + label)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw Error('UNSAFE_' + label)
  const descriptions = Object.getOwnPropertyDescriptors(value)
  const names = Reflect.ownKeys(descriptions)
  if (names.length !== expected.length || names.some(name => typeof name !== 'string' || !expected.includes(name) || !Object.hasOwn(descriptions[name], 'value'))) throw Error('INVALID_' + label + '_FIELDS')
  const out = Object.create(null)
  for (const name of names) out[name] = descriptions[name].value
  return out
}

function bytes(value, label, limit, requiredLength = null) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error('UNSAFE_' + label)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Buffer.prototype && prototype !== Uint8Array.prototype) throw Error('UNSAFE_' + label)
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key))) throw Error('UNSAFE_' + label)
  if (value.buffer instanceof SharedArrayBuffer) throw Error('UNSAFE_SHARED_' + label)
  if (!value.byteLength || value.byteLength > limit || (requiredLength !== null && value.byteLength !== requiredLength)) throw Error('INVALID_' + label)
  return { backing: value.buffer, offset: value.byteOffset, length: value.byteLength, copy: Buffer.from(value) }
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
  return JSON.stringify(value)
}

function rootKey(der) {
  if (der.length !== 44 || !der.subarray(0, DER_PREFIX.length).equals(DER_PREFIX)) throw Error('INVALID_ROOT_DER')
  try {
    const key = createPublicKey({ key: der, format: 'der', type: 'spki' })
    if (key.asymmetricKeyType !== 'ed25519' || !key.export({ format: 'der', type: 'spki' }).equals(der)) throw Error('INVALID_ROOT_DER')
    return key
  } catch { throw Error('INVALID_ROOT_DER') }
}

/** Checks caller-pinned V2 policy version against a caller-supplied floor, without persisting it. */
export function preflightVersionedPythonDependencyKeyPolicy(options) {
  const o = plain(options, fields, 'OPTIONS')
  // A zero floor represents an uninitialized trust policy and is deliberately rejected.
  if (!Number.isSafeInteger(o.minimumTrustedVersion) || o.minimumTrustedVersion < 1) throw Error('INVALID_VERSION_FLOOR')
  const policy = bytes(o.policyBytes, 'POLICY_BYTES', 64 * 1024)
  const signature = bytes(o.rootSignatureBytes, 'ROOT_SIGNATURE', 64, 64)
  const root = bytes(o.rootPublicKeySpkiDer, 'ROOT_DER', 44, 44)
  const signing = bytes(o.signingPublicKeySpkiDer, 'SIGNING_DER', 44, 44)
  const views = [policy, signature, root, signing]
  for (let i = 0; i < views.length; i++) for (let j = i + 1; j < views.length; j++) {
    const a = views[i], b = views[j]
    if (a.backing === b.backing && a.offset < b.offset + b.length && b.offset < a.offset + a.length) throw Error('SHARED_BACKING')
  }
  if (typeof o.pinnedRootSpkiSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(o.pinnedRootSpkiSha256)) throw Error('INVALID_ROOT_PIN')
  if (!timingSafeEqual(createHash('sha256').update(root.copy).digest(), Buffer.from(o.pinnedRootSpkiSha256, 'hex'))) throw Error('ROOT_PIN_MISMATCH')
  const key = rootKey(root.copy)
  if (!verify(null, Buffer.concat([Buffer.from(VERSIONED_POLICY_DOMAIN_V2, 'ascii'), policy.copy]), key, signature.copy)) throw Error('INVALID_ROOT_SIGNATURE')
  let parsed, source
  try { source = decoder.decode(policy.copy); parsed = JSON.parse(source) } catch { throw Error('INVALID_POLICY_JSON') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || canonical(parsed) !== source) throw Error('NONCANONICAL_POLICY')
  const record = plain(parsed, ['version', 'scope', 'keys'], 'POLICY')
  if (!Number.isSafeInteger(record.version) || record.version < 1) throw Error('INVALID_POLICY_VERSION')
  if (record.version < o.minimumTrustedVersion) throw Error('POLICY_VERSION_ROLLBACK')
  // The existing strict key/scope/window verifier receives canonical policy sans V2 version.
  // The version was authenticated as part of the V2 signature before this conversion.
  const legacyBytes = Buffer.from(canonical({ scope: record.scope, keys: record.keys }), 'utf8')
  const checked = preflightPythonDependencySigningKeyPolicy({
    policyBytes: legacyBytes,
    pinnedPolicySha256: createHash('sha256').update(legacyBytes).digest('hex'),
    keyId: o.keyId,
    pinnedPublicKeySpkiDer: signing.copy,
    nowUtc: o.nowUtc,
  })
  return Object.freeze({
    developmentOnly: true,
    policyVersion: record.version,
    minimumTrustedVersion: o.minimumTrustedVersion,
    rootSignatureVerified: true,
    rootPinMatched: true,
    signingKeyPolicyVerified: checked.trustAnchorMatched,
    rollbackFloorIndependentlyTrusted: false,
    rollbackFloorPersisted: false,
    rootOwnershipAuthenticated: false,
    publisherAuthenticated: false,
    runtimeExecutionAuthorized: false,
    manufacturingApproved: false,
  })
}
