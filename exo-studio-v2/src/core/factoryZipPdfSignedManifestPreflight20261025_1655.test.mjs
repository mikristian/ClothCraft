import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { preflightSignedPythonPackageManifest as preflight } from './factoryZipPdfSignedManifestPreflight20261025_1655.mjs'

const manifestText = '{"pillow":"' + 'a'.repeat(64) + '"}'
function fixture(text = manifestText) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const manifestBytes = Buffer.from(text)
  return {
    manifestBytes,
    pinnedSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    signatureBytes: sign(null, Buffer.concat([Buffer.from('EXO2D-PY-PACKAGE-MANIFEST-V1\0', 'ascii'), manifestBytes]), privateKey),
    pinnedPublicKeySpkiDer: publicKey.export({ type: 'spki', format: 'der' }),
  }
}

test('accepts canonical signed manifest, with explicitly limited claims', () => {
  const result = preflight(fixture())
  assert.equal(result.signatureVerified, true)
  assert.equal(result.publisherAuthenticated, false)
  assert.equal(result.runtimeExecutionAuthorized, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.developmentOnly, true)
  assert.equal(Object.isFrozen(result.packages), true)
  assert.equal(result.packages.pillow, 'a'.repeat(64))
  assert.equal(Object.getPrototypeOf(result.packages), null)
})

test('rejects absent and invalid key pins and incorrect key types', () => {
  const valid = fixture()
  for (const value of [undefined, null, '', Buffer.alloc(44), new Uint8Array(44), Buffer.alloc(256)]) {
    assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: value }))
  }
  const wrong = generateKeyPairSync('x25519').publicKey.export({ format: 'der', type: 'spki' })
  assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: wrong }), /INVALID_PUBLIC_KEY/)
  assert.throws(() => preflight({ ...valid, pinnedPublicKeySpkiDer: fixture().pinnedPublicKeySpkiDer }), /INVALID_SIGNATURE/)
})

test('rejects tampering, wrong digests, noncanonical manifests, and altered signatures', () => {
  const valid = fixture()
  assert.throws(() => preflight({ ...valid, manifestBytes: Buffer.from('{}') }), /PIN_MISMATCH/)
  assert.throws(() => preflight({ ...valid, pinnedSha256: '0'.repeat(64) }), /PIN_MISMATCH/)
  const tamperedSignature = Buffer.from(valid.signatureBytes)
  tamperedSignature[0] ^= 1
  assert.throws(() => preflight({ ...valid, signatureBytes: tamperedSignature }), /INVALID_SIGNATURE/)
  assert.throws(() => preflight({ ...valid, signatureBytes: Buffer.concat([valid.signatureBytes, Buffer.from([0])]) }), /INVALID_SIGNATURE/)
  const noncanonical = fixture('{ "pillow":"' + 'a'.repeat(64) + '"}')
  assert.throws(() => preflight(noncanonical), /NONCANONICAL_MANIFEST/)
})

test('rejects proxies, getters, malformed option objects and buffer subclasses', () => {
  const valid = fixture()
  const withGetter = Object.defineProperty({ ...valid }, 'signatureBytes', { get() { throw Error('getter used') } })
  assert.throws(() => preflight(withGetter), /UNSAFE_OPTIONS/)
  assert.throws(() => preflight(new Proxy(valid, {})), /UNSAFE_OPTIONS/)
  assert.throws(() => preflight({ ...valid, extra: true }), /UNSAFE_OPTIONS/)
  assert.throws(() => preflight({ ...valid, signatureBytes: new Proxy(valid.signatureBytes, {}) }), /UNSAFE_SIGNATURE/)
  const fakeLength = Buffer.from(valid.signatureBytes)
  Object.defineProperty(fakeLength, 'byteLength', { value: 64 })
  assert.throws(() => preflight({ ...valid, signatureBytes: fakeLength }), /UNSAFE_SIGNATURE/)
  class CustomBytes extends Uint8Array {}
  assert.throws(() => preflight({ ...valid, signatureBytes: new CustomBytes(valid.signatureBytes) }), /UNSAFE_SIGNATURE/)
})

test('rejects SharedArrayBuffer backed inputs and shared backing between inputs', () => {
  const valid = fixture()
  for (const name of ['manifestBytes', 'signatureBytes', 'pinnedPublicKeySpkiDer']) {
    const data = valid[name]
    const shared = new Uint8Array(new SharedArrayBuffer(data.length))
    shared.set(data)
    assert.throws(() => preflight({ ...valid, [name]: shared }), /UNSAFE_SHARED_/)
  }
  const backing = new ArrayBuffer(256)
  const signatureBytes = new Uint8Array(backing, 0, 64)
  const pinnedPublicKeySpkiDer = new Uint8Array(backing, 32, 44)
  signatureBytes.set(valid.signatureBytes)
  pinnedPublicKeySpkiDer.set(valid.pinnedPublicKeySpkiDer)
  assert.throws(() => preflight({ ...valid, signatureBytes, pinnedPublicKeySpkiDer }), /SHARED_BACKING/)
})
