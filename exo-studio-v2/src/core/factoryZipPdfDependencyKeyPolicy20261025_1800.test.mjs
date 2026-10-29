import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { preflightPythonDependencySigningKeyPolicy as preflight } from './factoryZipPdfDependencyKeyPolicy20261025_1800.mjs'

const sha = data => createHash('sha256').update(data).digest('hex')
const publicKey = generateKeyPairSync('ed25519').publicKey
const spki = publicKey.export({ type: 'spki', format: 'der' })
const goodKey = { keyId: 'publisher-1', spkiSha256: sha(spki), status: 'active', validFromUtc: '2026-01-01T00:00:00Z', validUntilUtc: '2027-01-01T00:00:00Z' }
const canonical = value => JSON.stringify(value, (key, entry) => entry && !Array.isArray(entry) && typeof entry === 'object' ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b, 'en'))) : entry)
function fixture(keys = [goodKey], scope = 'python-dependency-manifest') {
  const policyBytes = Buffer.from(canonical({ keys, scope }))
  return { policyBytes, pinnedPolicySha256: sha(policyBytes), keyId: 'publisher-1', pinnedPublicKeySpkiDer: Buffer.from(spki), nowUtc: '2026-10-25T18:00:00Z' }
}

test('matches externally pinned canonical policy, active Ed25519 key, valid UTC interval with limited claims', () => {
  const result = preflight(fixture())
  assert.deepEqual(result, { developmentOnly: true, trustAnchorMatched: true, publisherAuthenticated: false, runtimeExecutionAuthorized: false, manufacturingApproved: false })
  assert(Object.isFrozen(result))
  assert.equal(preflight({ ...fixture(), nowUtc: goodKey.validFromUtc }).trustAnchorMatched, true)
  assert.throws(() => preflight({ ...fixture(), nowUtc: goodKey.validUntilUtc }), /KEY_OUTSIDE_VALIDITY/)
})

test('rejects substituted key, incorrect policy pin and malformed DER', () => {
  const valid = fixture()
  const different = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' })
  assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: different }), /KEY_DIGEST_MISMATCH/)
  assert.throws(() => preflight({ ...valid, pinnedPolicySha256: '0'.repeat(64) }), /POLICY_PIN_MISMATCH/)
  assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: Buffer.alloc(44) }), /INVALID_KEY_DER/)
  assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: Buffer.alloc(43) }), /INVALID_KEY_DER/)
  assert.throws(() => preflight({ ...valid, keyId: 'different' }), /KEY_NOT_FOUND/)
})

test('rejects incorrect scope, duplicate keys, invalid key statuses, expired or revoked keys and malformed windows', () => {
  const rejected = [
    [fixture([goodKey], 'other-scope'), /INVALID_SCOPE/],
    [fixture([goodKey, goodKey]), /INVALID_OR_DUPLICATE_KEY_ID/],
    [fixture([{ ...goodKey, status: 'revoked' }]), /KEY_NOT_ACTIVE/],
    [fixture([{ ...goodKey, status: 'expired' }]), /KEY_NOT_ACTIVE/],
    [fixture([{ ...goodKey, status: 'pending' }]), /INVALID_KEY_STATUS/],
    [fixture([{ ...goodKey, validFromUtc: '2027-01-01T00:00:00Z' }]), /INVALID_KEY_WINDOW/],
    [fixture([{ ...goodKey, validFromUtc: '2026-02-30T00:00:00Z' }]), /INVALID_UTC_INSTANT/],
    [fixture([{ ...goodKey, validFromUtc: '2026-01-01T00:00:00+00:00' }]), /INVALID_UTC_INSTANT/],
    [fixture([{ ...goodKey, spkiSha256: 'bad' }]), /INVALID_KEY_DIGEST/],
  ]
  for (const [input, error] of rejected) assert.throws(() => preflight(input), error)
})

test('rejects noncanonical JSON, duplicate JSON fields and unexpected schema', () => {
  const base = fixture()
  const variants = [
    Buffer.from(` ${base.policyBytes}`),
    Buffer.from(base.policyBytes.toString().replace('"scope"', '"scope" :')),
    Buffer.from(base.policyBytes.toString().replace('"keys":', '"keys":[],"keys":')),
    Buffer.from(canonical({ keys: [goodKey], scope: 'python-dependency-manifest', extra: true })),
    Buffer.from(canonical({ keys: [{ ...goodKey, extra: true }], scope: 'python-dependency-manifest' })),
    Buffer.from([0xff]),
  ]
  for (const policyBytes of variants) assert.throws(() => preflight({ ...base, policyBytes, pinnedPolicySha256: sha(policyBytes) }))
})

test('rejects proxies, getters, shared buffers, byte subclasses and overlapping backing stores', () => {
  const base = fixture()
  assert.throws(() => preflight(new Proxy(base, {})), /UNSAFE_RECORD/)
  assert.throws(() => preflight(Object.defineProperty({ ...base }, 'keyId', { get() { throw Error('unexpected getter') } })), /INVALID_FIELDS/)
  assert.throws(() => preflight({ ...base, policyBytes: new Proxy(base.policyBytes, {}) }), /UNSAFE_POLICY_BYTES/)
  class ExoticBytes extends Uint8Array {}
  assert.throws(() => preflight({ ...base, policyBytes: new ExoticBytes(base.policyBytes) }), /UNSAFE_POLICY_BYTES/)
  const shared = new Uint8Array(new SharedArrayBuffer(base.policyBytes.length))
  shared.set(base.policyBytes)
  assert.throws(() => preflight({ ...base, policyBytes: shared }), /UNSAFE_SHARED_POLICY_BYTES/)
  const backing = new ArrayBuffer(1024)
  const policyBytes = new Uint8Array(backing, 0, base.policyBytes.length)
  const pinnedPublicKeySpkiDer = new Uint8Array(backing, 30, 44)
  policyBytes.set(base.policyBytes)
  pinnedPublicKeySpkiDer.set(spki)
  assert.throws(() => preflight({ ...base, policyBytes, pinnedPublicKeySpkiDer }), /SHARED_BACKING/)
})
