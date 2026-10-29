import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import * as verifier from './factoryZipPdfVersionedPolicyFloor20261025_2000.mjs'
const { preflightVersionedPythonDependencyKeyPolicy: preflight } = verifier
const DOMAIN = Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V2\0', 'ascii')

const sha = v => createHash('sha256').update(v).digest('hex')
const root = generateKeyPairSync('ed25519')
const signer = generateKeyPairSync('ed25519')
const rootDer = root.publicKey.export({ format: 'der', type: 'spki' })
const signerDer = signer.publicKey.export({ format: 'der', type: 'spki' })
const canonical = v => JSON.stringify(v, (key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value)
function fixture(version = 3, changes = {}, floor = 3) {
  const entry = { keyId: 'publisher-1', spkiSha256: sha(signerDer), status: 'active', validFromUtc: '2026-01-01T00:00:00Z', validUntilUtc: '2027-01-01T00:00:00Z' }
  return signed(canonical({ version, scope: 'python-dependency-manifest', keys: [{ ...entry, ...changes }] }), floor)
}
function signed(source, floor = 3) {
  const policyBytes = Buffer.from(source)
  return {
    policyBytes,
    rootSignatureBytes: sign(null, Buffer.concat([DOMAIN, policyBytes]), root.privateKey),
    rootPublicKeySpkiDer: Buffer.from(rootDer),
    pinnedRootSpkiSha256: sha(rootDer),
    signingPublicKeySpkiDer: Buffer.from(signerDer),
    keyId: 'publisher-1',
    nowUtc: '2026-10-25T19:00:00Z',
    minimumTrustedVersion: floor,
  }
}
test('authenticated V2 version accepted at floor or higher, with development-only claims', () => {
  const result = preflight(fixture())
  assert.equal(result.policyVersion, 3)
  assert.equal(result.minimumTrustedVersion, 3)
  assert.equal(result.rootSignatureVerified, true)
  assert.equal(result.signingKeyPolicyVerified, true)
  assert.equal(result.rollbackFloorPersisted, false)
  assert.equal(result.rollbackFloorIndependentlyTrusted, false)
  assert.equal(result.manufacturingApproved, false)
  assert(Object.isFrozen(result))
  assert.equal(preflight(fixture(4)).policyVersion, 4)
})
test('old correctly signed policies fail under a raised caller floor', () => {
  const old = fixture(2, {}, 2)
  assert.equal(preflight(old).policyVersion, 2)
  assert.throws(() => preflight({ ...old, minimumTrustedVersion: 3 }), /POLICY_VERSION_ROLLBACK/)
  assert.throws(() => preflight({ ...fixture(3), minimumTrustedVersion: 4 }), /POLICY_VERSION_ROLLBACK/)
})
test('revocation rollout requires independently advanced floor to prevent replay', () => {
  const oldActive = fixture(10, {}, 10)
  const newRevoked = fixture(11, { status: 'revoked' }, 11)
  assert.equal(preflight(oldActive).policyVersion, 10)
  assert.throws(() => preflight(newRevoked), /KEY_NOT_ACTIVE/)
  assert.throws(() => preflight({ ...oldActive, minimumTrustedVersion: 11 }), /POLICY_VERSION_ROLLBACK/)
  // The stateless verifier cannot learn the floor from a revoked V11 policy by itself.
  assert.equal(preflight({ ...oldActive, minimumTrustedVersion: 10 }).policyVersion, 10)
})
test('V2 domain bytes cannot be mutated through public exports or aliased fixture buffers', () => {
  assert.equal(Object.hasOwn(verifier, 'VERSIONED_POLICY_DOMAIN_V2'), false)
  const oldDomainSignature = sign(null, Buffer.concat([Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V1\0'), fixture().policyBytes]), root.privateKey)
  assert.throws(() => preflight({ ...fixture(), rootSignatureBytes: oldDomainSignature }), /INVALID_ROOT_SIGNATURE/)
  const attackerOwnedDomain = Buffer.from(DOMAIN)
  attackerOwnedDomain.set(Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V1\0'))
  const f = fixture()
  assert.equal(preflight(f).rootSignatureVerified, true)
  assert.throws(() => preflight({ ...f, rootSignatureBytes: sign(null, Buffer.concat([attackerOwnedDomain, f.policyBytes]), root.privateKey) }), /INVALID_ROOT_SIGNATURE/)
})
test('rejects invalid floors and authenticated invalid versions', () => {
  for (const floor of [-1, 0, 0.5, NaN, Infinity, '3', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => preflight({ ...fixture(), minimumTrustedVersion: floor }), /INVALID_VERSION_FLOOR/)
  }
  for (const version of [-1, 0, 1.5, '3', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => preflight(fixture(version, {}, 1)), /INVALID_POLICY_VERSION/)
  }
})
test('rejects tampered bytes, forged signatures, wrong domain, malformed root and wrong pin', () => {
  const f = fixture()
  const changed = Buffer.from(f.policyBytes)
  changed[15] ^= 1
  assert.throws(() => preflight({ ...f, policyBytes: changed }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, rootSignatureBytes: Buffer.alloc(64) }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, rootSignatureBytes: sign(null, Buffer.concat([Buffer.from('EXO2D-PY-DEPENDENCY-KEY-POLICY-V1\0'), f.policyBytes]), root.privateKey) }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, pinnedRootSpkiSha256: '0'.repeat(64) }), /ROOT_PIN_MISMATCH/)
  const corruptDer = Buffer.alloc(44)
  assert.throws(() => preflight({ ...f, rootPublicKeySpkiDer: corruptDer, pinnedRootSpkiSha256: sha(corruptDer) }), /INVALID_ROOT_DER/)
  const other = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' })
  assert.throws(() => preflight({ ...f, rootPublicKeySpkiDer: other, pinnedRootSpkiSha256: sha(other) }), /INVALID_ROOT_SIGNATURE/)
  assert.throws(() => preflight({ ...f, signingPublicKeySpkiDer: Buffer.alloc(44) }), /INVALID_KEY_DER/)
})
test('rejects signed malformed JSON, duplicate and unknown fields, noncanonical representation', () => {
  const valid = fixture().policyBytes.toString()
  const variants = [
    '{bad json',
    valid.replace('"version":3', '"version":3,"version":3'),
    valid.replace('"version":3', '"version":3,"unknown":1'),
    valid.replace('"scope":"python-dependency-manifest"', '"scope":"python-dependency-manifest","scope":"python-dependency-manifest"'),
    valid.replace('"version":3', '"version":3.0'),
    ' ' + valid,
    valid.replace('"scope":"python-dependency-manifest"', '"scope":"other"'),
    valid.replace('"status":"active"', '"status":"revoked"'),
    valid.replace('"keyId":"publisher-1"', '"keyId":"publisher-1","keyId":"publisher-1"'),
  ]
  for (const source of variants) assert.throws(() => preflight(signed(source)), /INVALID_POLICY_JSON|NONCANONICAL_POLICY|INVALID_POLICY_FIELDS|INVALID_SCOPE|KEY_NOT_ACTIVE/)
})
test('rejects invalid key identity, inactive key and expired time window', () => {
  assert.throws(() => preflight({ ...fixture(), keyId: 'absent' }), /KEY_NOT_FOUND/)
  assert.throws(() => preflight(fixture(3, { status: 'revoked' })), /KEY_NOT_ACTIVE/)
  assert.throws(() => preflight(fixture(3, { validUntilUtc: '2026-02-01T00:00:00Z' })), /KEY_OUTSIDE_VALIDITY/)
  assert.throws(() => preflight(fixture(3, { spkiSha256: '0'.repeat(64) })), /KEY_DIGEST_MISMATCH/)
  assert.throws(() => preflight({ ...fixture(), nowUtc: 'invalid' }), /INVALID_UTC_INSTANT/)
})
test('rejects proxies, getter properties, shared backing, SAB and alien records', () => {
  const f = fixture()
  assert.throws(() => preflight(new Proxy(f, {})), /UNSAFE_OPTIONS/)
  const getter = Object.defineProperty({ ...f }, 'keyId', { get() { throw Error('GETTER_EXECUTED') } })
  assert.throws(() => preflight(getter), /INVALID_OPTIONS_FIELDS/)
  assert.throws(() => preflight({ ...f, policyBytes: new Proxy(f.policyBytes, {}) }), /UNSAFE_POLICY_BYTES/)
  const shared = new Uint8Array(new SharedArrayBuffer(f.policyBytes.length))
  shared.set(f.policyBytes)
  assert.throws(() => preflight({ ...f, policyBytes: shared }), /UNSAFE_SHARED_POLICY_BYTES/)
  const backing = new ArrayBuffer(f.policyBytes.length + 64)
  const first = new Uint8Array(backing, 0, f.policyBytes.length)
  const second = new Uint8Array(backing, 10, 64)
  first.set(f.policyBytes)
  second.set(f.rootSignatureBytes)
  assert.throws(() => preflight({ ...f, policyBytes: first, rootSignatureBytes: second }), /SHARED_BACKING/)
  assert.throws(() => preflight({ ...f, extra: true }), /INVALID_OPTIONS_FIELDS/)
})
