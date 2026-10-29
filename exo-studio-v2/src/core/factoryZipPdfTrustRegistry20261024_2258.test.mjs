import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { resolvePdfTrustRegistry, PDF_TRUST_REGISTRY_SCHEMA } from './factoryZipPdfTrustRegistry20261024_2258.mjs';
import { canonicalPdfReferenceProvenance, verifyPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const identity = { garmentId: 'garment-a', revision: 'r1', size: 'M', documentRole: 'reference-pattern', units: 'cm' };
const key = { keyId: 'trusted-key', publicKeyPem, status: 'active', validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2027-01-01T00:00:00.000Z', ...identity };
const asOf = '2026-10-24T00:00:00.000Z';
const sha = value => createHash('sha256').update(value).digest('hex');
const resolve = (keys = [key], extra = {}, registryExtra = {}) => {
  const registryBytes = Buffer.from(JSON.stringify({ schemaVersion: PDF_TRUST_REGISTRY_SCHEMA, keys, ...registryExtra }));
  return resolvePdfTrustRegistry({ registryBytes, pinnedSha256: sha(registryBytes), asOf, identity, ...extra });
};

test('resolves exact independently pinned Ed25519 trust and verifies a signature', () => {
  const trust = resolve();
  assert.deepEqual(Object.keys(trust).sort(), ['publicKeyPem', 'keyId', ...Object.keys(identity)].sort());
  assert.ok(Object.isFrozen(trust));
  const referencePdfBytes = Buffer.from('%PDF-1.7 reference');
  const authoredSourceBytes = Buffer.from('authored source');
  const payload = { schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId, referencePdfSha256: sha(referencePdfBytes), authoredSourceSha256: sha(authoredSourceBytes), ...identity };
  const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
  assert.deepEqual(verifyPdfReferenceProvenance({ referencePdfBytes, authoredSourceBytes, payload, signatureBase64, trust }), { verified: true, scope: 'caller-configured trust anchor', manufacturingApproved: false });
});

test('rejects bad pin and invalid pin spelling', () => {
  assert.throws(() => resolve([key], { pinnedSha256: '0'.repeat(64) }), /digest mismatch/);
  assert.throws(() => resolve([key], { pinnedSha256: '0'.repeat(63) }), /invalid caller pin/);
});

test('rejects unknown fields in registry and key', () => {
  assert.throws(() => resolve([key], {}, { pdfMetadata: {} }), /invalid registry fields/);
  assert.throws(() => resolve([{ ...key, unexpected: true }]), /invalid key record fields/);
});

test('rejects duplicates including differently scoped records', () => {
  assert.throws(() => resolve([key, { ...key, garmentId: 'other' }]), /duplicate keyId/);
  assert.throws(() => resolve([key, { ...key, keyId: 'other-key' }]), /ambiguous identity/);
});

test('rejects revoked, not-yet-valid, and expired keys', () => {
  assert.throws(() => resolve([{ ...key, status: 'revoked' }]), /revoked/);
  assert.throws(() => resolve([key], { asOf: '2025-12-31T23:59:59.999Z' }), /not yet valid/);
  assert.throws(() => resolve([key], { asOf: key.validUntil }), /expired/);
});

test('rejects wrong identity, units and malformed dates', () => {
  assert.throws(() => resolve([key], { identity: { ...identity, revision: 'r2' } }), /no matching key/);
  assert.throws(() => resolve([key], { identity: { ...identity, units: 'in' } }), /caller units/);
  assert.throws(() => resolve([{ ...key, validFrom: '2026-02-30T00:00:00.000Z' }]), /UTC timestamp/);
  assert.throws(() => resolve([key], { asOf: 'today' }), /UTC timestamp/);
});

test('rejects invalid key type, corrupted bytes and out-of-band metadata impersonation', () => {
  const { publicKey: rsa } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  assert.throws(() => resolve([{ ...key, publicKeyPem: rsa.export({ type: 'spki', format: 'pem' }) }]), /Ed25519/);
  assert.throws(() => resolve([key], { registryBytes: Buffer.from('{') }), /digest mismatch/);
  assert.throws(() => resolve([key], { identity: { ...identity, publicKeyPem } }), /caller identity fields/);
  assert.throws(() => resolve([key], { registryBytes: Buffer.alloc(128 * 1024 + 1) }), /registry bytes/);
});

test('rejects accessor-bearing caller identity without invoking getter', () => {
  let calls = 0;
  const untrusted = { ...identity };
  Object.defineProperty(untrusted, 'revision', { enumerable: true, get() { calls++; return 'r1'; } });
  assert.throws(() => resolve([key], { identity: untrusted }), /invalid caller identity fields/);
  assert.equal(calls, 0);
});
