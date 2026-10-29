import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { canonicalPdfReferenceProvenance, verifyPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const { publicKey: otherKey } = generateKeyPairSync('ed25519');
const pem = publicKey.export({ format: 'pem', type: 'spki' });
const hash = b => createHash('sha256').update(b).digest('hex');
const referencePdfBytes = Buffer.from('%PDF-1.7\ntrusted-reference');
const authoredSourceBytes = Buffer.from('authored source bytes');
const trust = { publicKeyPem: pem, keyId: 'dev-key-1', garmentId: 'garment-42', revision: 'r7', size: 'M', units: 'cm', documentRole: 'factory-reference' };
const payload = { schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId, referencePdfSha256: hash(referencePdfBytes), authoredSourceSha256: hash(authoredSourceBytes), garmentId: trust.garmentId, revision: trust.revision, size: trust.size, units: 'cm', documentRole: trust.documentRole };
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const valid = { referencePdfBytes, authoredSourceBytes, payload, signatureBase64, trust };
const reject = (overrides, pattern = /PDF reference provenance:/) => assert.throws(() => verifyPdfReferenceProvenance({ ...valid, ...overrides }), pattern);

test('accepts genuine detached Ed25519 signature with caller-pinned identity and hashes', () => {
  assert.deepEqual(verifyPdfReferenceProvenance(valid), { verified: true, scope: 'caller-configured trust anchor', manufacturingApproved: false });
});
test('rejects PDF and source byte tampering', () => {
  reject({ referencePdfBytes: Buffer.from('%PDF-1.7\nchanged') }, /content hash mismatch/);
  reject({ authoredSourceBytes: Buffer.from('changed source') }, /content hash mismatch/);
});
test('rejects metadata changes even with identical bytes', () => {
  for (const field of ['garmentId', 'revision', 'size', 'documentRole', 'keyId']) reject({ payload: { ...payload, [field]: 'other' } });
  reject({ payload: { ...payload, units: 'mm' } });
  reject({ payload: { ...payload, schemaVersion: 'v2' } });
});
test('rejects forged signatures and wrong pinned keys', () => {
  reject({ signatureBase64: Buffer.alloc(64).toString('base64') }, /signature verification failed/);
  reject({ trust: { ...trust, publicKeyPem: otherKey.export({ format: 'pem', type: 'spki' }) } }, /signature verification failed/);
});
test('rejects missing trust, malformed signatures and self-attestation', () => {
  reject({ trust: undefined });
  reject({ trust: { ...trust, extraneous: true } });
  reject({ payload: { ...payload, publicKeyPem: pem } });
  reject({ payload: { ...payload, manufacturingApproved: true } });
  reject({ signatureBase64: '' });
  reject({ signatureBase64: 'A'.repeat(88) });
});
test('rejects swapped pinned role, revision, missing content and oversized content', () => {
  reject({ trust: { ...trust, revision: 'r8' } });
  reject({ trust: { ...trust, size: 'L' } });
  reject({ trust: { ...trust, units: 'mm' } });
  reject({ trust: { ...trust, documentRole: 'cutting-master' } });
  reject({ authoredSourceBytes: undefined });
  reject({ referencePdfBytes: Buffer.alloc(32 * 1024 * 1024 + 1) });
});
