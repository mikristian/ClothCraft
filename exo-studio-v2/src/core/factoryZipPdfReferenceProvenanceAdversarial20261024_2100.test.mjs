import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'

// The trusted key must be supplied by the caller independently of the artifact.
// These fixtures sign with real, independently generated Ed25519 keypairs.
const trusted = generateKeyPairSync('ed25519')
const attacker = generateKeyPairSync('ed25519')
const digest = value => createHash('sha256').update(value).digest('hex')
const source = Buffer.from('independently trusted source fixture')
const reference = Buffer.from('%PDF-1.7\ntrusted reference fixture\n')
const manifest = {
  schemaVersion: 'exo.pdf-reference-provenance.v1',
  keyId: 'trusted-key',
  authoredSourceSha256: digest(source),
  referencePdfSha256: digest(reference),
  garmentId: 'exo2d-055/test-source',
  revision: 'rev-001',
  size: 'M',
  units: 'cm',
  documentRole: 'reference',
}

// Keep this adapter isolated so the test suite uses the verifier's documented
// public interface when the implementation lands; do not copy verifier logic.
const modulePath = './factoryZipPdfReferenceProvenance20261024_2100.mjs'
const moduleUnderTest = await import(modulePath)
const verify = moduleUnderTest.verifyPdfReferenceProvenance
const canonical = moduleUnderTest.canonicalPdfReferenceProvenance
assert.equal(typeof verify, 'function', 'provenance verifier must expose its public API')

function publicKey(pair) {
  return pair.publicKey.export({ type: 'spki', format: 'pem' })
}

function signed(payload = manifest, keypair = trusted) {
  const signatureBase64 = sign(null, canonical(payload), keypair.privateKey).toString('base64')
  return { payload, signatureBase64 }
}

async function decision(envelope, pinned = publicKey(trusted)) {
  try {
    return await verify({
      referencePdfBytes: reference,
      authoredSourceBytes: source,
      ...envelope,
      trust: { publicKeyPem: pinned, keyId: 'trusted-key', garmentId: manifest.garmentId, revision: manifest.revision, size: manifest.size, units: 'cm', documentRole: manifest.documentRole },
    })
  } catch (error) { return { verified: false, error: String(error) } }
}

test('known trusted Ed25519 signature passes only under caller pinned key', async () => {
  assert.equal((await decision(signed())).verified, true)
  assert.equal((await decision(signed(), publicKey(attacker))).verified, false)
})

test('attacker cannot replace or rotate pinned key using envelope key fields', async () => {
  const forged = signed(manifest, attacker)
  for (const injected of [
    { publicKeyPem: publicKey(attacker) },
    { signerPublicKey: publicKey(attacker), keyId: 'rotated' },
    { trustedKeys: [publicKey(attacker)] },
  ]) {
    const verdict = await decision({ ...forged, ...injected })
    assert.equal(verdict.verified, false, `accepted forged signer with ${Object.keys(injected)}`)
  }
})

test('signed source, reference, identity and revision cannot be altered', async () => {
  const envelope = signed()
  for (const change of [
    { authoredSourceSha256: digest('substituted source') },
    { referencePdfSha256: digest('substituted reference') },
    { garmentId: 'attacker/source' },
    { revision: 'rev-002' },
    { size: 'L' },
  ]) {
    assert.equal((await decision({ ...envelope, payload: { ...manifest, ...change } })).verified, false, JSON.stringify(change))
  }
})

test('signed hashes also reject changed underlying source or PDF bytes', async () => {
  const envelope = signed()
  for (const substituted of [
    { referencePdfBytes: Buffer.from('%PDF-1.7\nsubstituted reference fixture\n') },
    { authoredSourceBytes: Buffer.from('substituted source fixture') },
  ]) {
    assert.equal((await decision({ ...envelope, ...substituted })).verified, false)
  }
})

test('caller pinned identity metadata remains mandatory and immutable', async () => {
  const envelope = signed()
  const goodTrust = { publicKeyPem: publicKey(trusted), keyId: manifest.keyId, garmentId: manifest.garmentId, revision: manifest.revision, size: manifest.size, units: 'cm', documentRole: manifest.documentRole }
  for (const trust of [
    { ...goodTrust, keyId: 'attacker-key' },
    { ...goodTrust, garmentId: 'attacker/garment' },
    { ...goodTrust, revision: 'rev-002' },
    { ...goodTrust, size: 'L' },
    { ...goodTrust, units: 'mm' },
    { ...goodTrust, documentRole: 'production' },
    { ...goodTrust, publicKeyPem: publicKey(attacker) },
    { ...goodTrust, untrustedOverride: true },
    null,
  ]) {
    let accepted = false
    try { accepted = (await verify({ referencePdfBytes: reference, authoredSourceBytes: source, ...envelope, trust })).verified === true } catch {}
    assert.equal(accepted, false, JSON.stringify(trust && { ...trust, publicKeyPem: '<key>' }))
  }
})

test('signature encoding and malformed metadata fail closed', async () => {
  const envelope = signed()
  for (const mutation of [
    { signatureBase64: envelope.signatureBase64.replace(/=+$/, '') + '!' },
    { signatureBase64: ` ${envelope.signatureBase64}` },
    { signatureBase64: envelope.signatureBase64.toLowerCase() },
    { signatureBase64: '***' },
    { signatureBase64: '' },
    { signatureBase64: null },
    { payload: null },
    { payload: { ...manifest, revision: '' } },
    { payload: { ...manifest, authoredSourceSha256: 'not-a-hash' } },
    { payload: { ...manifest, garmentId: null } },
    { payload: { ...manifest, extraUnsignedApproval: true } },
  ]) {
    assert.equal((await decision({ ...envelope, ...mutation })).verified, false, JSON.stringify(mutation))
  }
})

test('a verified signature conveys provenance only, never manufacturing approval', async () => {
  const result = await decision(signed())
  assert.equal(result.verified, true)
  assert.notEqual(result.manufacturingApproved, true)
  assert.notEqual(result.certifiedForManufacturing, true)
})
