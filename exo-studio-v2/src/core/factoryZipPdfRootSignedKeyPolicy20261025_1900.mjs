// DEVELOPMENT ONLY. The caller supplies the root key and its pin; root ownership is not independently authenticated.
import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto'
import { types } from 'node:util'
import { preflightPythonDependencySigningKeyPolicy } from './factoryZipPdfDependencyKeyPolicy20261025_1800.mjs'

const PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const DOMAIN = Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V1\0', 'ascii')
const FIELDS = ['policyBytes', 'rootSignatureBytes', 'rootPublicKeySpkiDer', 'pinnedRootSpkiSha256', 'signingPublicKeySpkiDer', 'keyId', 'nowUtc']

function optionsOnly(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)) throw Error('UNSAFE_OPTIONS')
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).length !== FIELDS.length) throw Error('UNSAFE_OPTIONS')
  const result = Object.create(null)
  for (const name of Reflect.ownKeys(descriptors)) {
    if (typeof name !== 'string' || !FIELDS.includes(name) || !Object.hasOwn(descriptors[name], 'value')) throw Error('UNSAFE_OPTIONS')
    result[name] = descriptors[name].value
  }
  return result
}

function safeView(input, name, maximum, exact = null) {
  if (!input || typeof input !== 'object' || types.isProxy(input)) throw Error(`UNSAFE_${name}`)
  const proto = Object.getPrototypeOf(input)
  if (proto !== Buffer.prototype && proto !== Uint8Array.prototype) throw Error(`UNSAFE_${name}`)
  if (Object.hasOwn(input, 'buffer') || Object.hasOwn(input, 'byteOffset') || Object.hasOwn(input, 'byteLength')) throw Error(`UNSAFE_${name}`)
  const buffer = input.buffer
  if (buffer instanceof SharedArrayBuffer) throw Error(`UNSAFE_SHARED_${name}`)
  const length = input.byteLength
  if (!length || length > maximum || (exact !== null && length !== exact)) throw Error(`INVALID_${name}`)
  return { buffer, offset: input.byteOffset, length, snapshot: Buffer.from(input) }
}

function canonicalRootDer(bytes) {
  if (bytes.length !== 44 || !bytes.subarray(0, PREFIX.length).equals(PREFIX)) throw Error('INVALID_ROOT_DER')
  try {
    const key = createPublicKey({ key: bytes, format: 'der', type: 'spki' })
    if (key.asymmetricKeyType !== 'ed25519' || !key.export({ format: 'der', type: 'spki' }).equals(bytes)) throw Error('INVALID_ROOT_DER')
    return key
  } catch { throw Error('INVALID_ROOT_DER') }
}

/** Offline integrity check only; the supplied root pin does not attest independent ownership. */
export function preflightRootSignedPythonDependencyKeyPolicy(options) {
  const o = optionsOnly(options)
  const policy = safeView(o.policyBytes, 'POLICY_BYTES', 64 * 1024)
  const signature = safeView(o.rootSignatureBytes, 'ROOT_SIGNATURE', 64, 64)
  const root = safeView(o.rootPublicKeySpkiDer, 'ROOT_DER', 44, 44)
  const signing = safeView(o.signingPublicKeySpkiDer, 'SIGNING_DER', 44, 44)
  const views = [policy, signature, root, signing]
  for (let i = 0; i < views.length; i++) {
    for (let j = i + 1; j < views.length; j++) {
      const a = views[i], b = views[j]
      if (a.buffer === b.buffer && a.offset < b.offset + b.length && b.offset < a.offset + a.length) throw Error('SHARED_BACKING')
    }
  }
  if (typeof o.pinnedRootSpkiSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(o.pinnedRootSpkiSha256)) throw Error('INVALID_ROOT_PIN')
  const actualPin = createHash('sha256').update(root.snapshot).digest()
  if (!timingSafeEqual(actualPin, Buffer.from(o.pinnedRootSpkiSha256, 'hex'))) throw Error('ROOT_PIN_MISMATCH')
  const rootKey = canonicalRootDer(root.snapshot)
  if (!verify(null, Buffer.concat([DOMAIN, policy.snapshot]), rootKey, signature.snapshot)) throw Error('INVALID_ROOT_SIGNATURE')
  const policyPin = createHash('sha256').update(policy.snapshot).digest('hex')
  const checked = preflightPythonDependencySigningKeyPolicy({
    policyBytes: policy.snapshot,
    pinnedPolicySha256: policyPin,
    keyId: o.keyId,
    pinnedPublicKeySpkiDer: signing.snapshot,
    nowUtc: o.nowUtc,
  })
  return Object.freeze({
    developmentOnly: true,
    rootSignatureVerified: true,
    rootPinMatched: true,
    signingKeyPolicyVerified: checked.trustAnchorMatched,
    rootOwnershipAuthenticated: false,
    publisherAuthenticated: false,
    runtimeExecutionAuthorized: false,
    manufacturingApproved: false,
  })
}
