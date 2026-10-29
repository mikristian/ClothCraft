import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { preflightRootSignedPythonDependencyKeyPolicy as preflight } from './factoryZipPdfRootSignedKeyPolicy20261025_1900.mjs'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const root = generateKeyPairSync('ed25519')
const signing = generateKeyPairSync('ed25519')
const rootDer = root.publicKey.export({ format: 'der', type: 'spki' })
const signingDer = signing.publicKey.export({ format: 'der', type: 'spki' })
const domain = Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V1\0', 'ascii')
const canonical = obj => JSON.stringify(obj, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v)
function fixture(status = 'active', until = '2027-01-01T00:00:00Z') {
  const policyBytes = Buffer.from(canonical({ scope: 'python-dependency-manifest', keys: [{ keyId: 'publisher-1', spkiSha256: sha(signingDer), status, validFromUtc: '2026-01-01T00:00:00Z', validUntilUtc: until }] }))
  return {
    policyBytes,
    rootSignatureBytes: sign(null, Buffer.concat([domain, policyBytes]), root.privateKey),
    rootPublicKeySpkiDer: Buffer.from(rootDer),
    pinnedRootSpkiSha256: sha(rootDer),
    signingPublicKeySpkiDer: Buffer.from(signingDer),
    keyId: 'publisher-1',
    nowUtc: '2026-10-25T19:00:00Z',
  }
}

test('verifies root-signed canonical policy and active scoped signing key with bounded claims', () => {
  const result = preflight(fixture())
  assert.deepEqual(result, { developmentOnly: true, rootSignatureVerified: true, rootPinMatched: true, signingKeyPolicyVerified: true, rootOwnershipAuthenticated: false, publisherAuthenticated: false, runtimeExecutionAuthorized: false, manufacturingApproved: false })
  assert(Object.isFrozen(result))
})

test('rejects substituted root, wrong pin, signature and tampering', () => {
  const f = fixture()
  const substituted = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' })
  assert.throws(() => preflight({ ...f, rootPublicKeySpkiDer: substituted }), /ROOT_PIN_MISMATCH/)
  assert.throws(() => preflight({ ...f, pinnedRootSpkiSha256: '0'.repeat(64) }), /ROOT_PIN_MISMATCH/)
  assert.throws(() => preflight({ ...f, rootPublicKeySpkiDer: substituted, pinnedRootSpkiSha256: sha(substituted) }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, rootPublicKeySpkiDer: Buffer.alloc(44), pinnedRootSpkiSha256: sha(Buffer.alloc(44)) }), /INVALID_ROOT_DER/)
  assert.throws(() => preflight({ ...f, rootSignatureBytes: Buffer.alloc(64) }), /INVALID_ROOT_SIGNATURE/)
  const altered = Buffer.from(f.policyBytes)
  altered[20] ^= 1
  assert.throws(() => preflight({ ...f, policyBytes: altered }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, rootSignatureBytes: sign(null, f.policyBytes, root.privateKey) }), /INVALID_ROOT_SIGNATURE/)
})

test('rejects revoked, expired, wrong key scope and noncanonical signed policy', () => {
  assert.throws(() => preflight(fixture('revoked')), /KEY_NOT_ACTIVE/)
  assert.throws(() => preflight(fixture('expired')), /KEY_NOT_ACTIVE/)
  assert.throws(() => preflight(fixture('active', '2026-02-01T00:00:00Z')), /KEY_OUTSIDE_VALIDITY/)
  assert.throws(() => preflight({ ...fixture(), keyId: 'unknown' }), /KEY_NOT_FOUND/)
  const f = fixture()
  const noncanonical = Buffer.from(' ' + f.policyBytes.toString())
  assert.throws(() => preflight({ ...f, policyBytes: noncanonical, rootSignatureBytes: sign(null, Buffer.concat([domain, noncanonical]), root.privateKey) }), /NONCANONICAL_POLICY/)
})

test('rejects proxies, accessors, shared memory and aliased input views', () => {
  const f = fixture()
  assert.throws(() => preflight(new Proxy(f, {})), /UNSAFE_OPTIONS/)
  const getter = Object.defineProperty({ ...f }, 'keyId', { get() { throw Error('GETTER_CALLED') } })
  assert.throws(() => preflight(getter), /UNSAFE_OPTIONS/)
  assert.throws(() => preflight({ ...f, policyBytes: new Proxy(f.policyBytes, {}) }), /UNSAFE_POLICY_BYTES/)
  const shared = new Uint8Array(new SharedArrayBuffer(f.policyBytes.length))
  shared.set(f.policyBytes)
  assert.throws(() => preflight({ ...f, policyBytes: shared }), /UNSAFE_SHARED_POLICY_BYTES/)
  const backing = new ArrayBuffer(f.policyBytes.length + 64)
  const policyBytes = new Uint8Array(backing, 0, f.policyBytes.length)
  const rootSignatureBytes = new Uint8Array(backing, 10, 64)
  policyBytes.set(f.policyBytes)
  rootSignatureBytes.set(f.rootSignatureBytes)
  assert.throws(() => preflight({ ...f, policyBytes, rootSignatureBytes }), /SHARED_BACKING/)
})
