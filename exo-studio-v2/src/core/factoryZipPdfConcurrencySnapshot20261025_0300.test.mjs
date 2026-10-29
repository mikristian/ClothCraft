import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';
import { verifyGuardedAuthenticatedPdfParity as verify } from './factoryZipPdfAuthenticatedParityGuarded20261025_0202.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const originalReference = Buffer.from('%PDF-1.7\nsnapshot reference\n%%EOF');
const originalSource = Buffer.from('independent authored source');
const originalCandidate = Buffer.from(originalReference);
const trust = Object.freeze({ publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }), keyId: 'snapshot-key', garmentId: 'tee', revision: 'r1', size: 'M', units: 'cm', documentRole: 'factory-reference' });
const payload = Object.freeze({ schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId, referencePdfSha256: sha256(originalReference), authoredSourceSha256: sha256(originalSource), garmentId: trust.garmentId, revision: trust.revision, size: trust.size, units: trust.units, documentRole: trust.documentRole });
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const geometry = () => ({ pages: 1, width: 10, length: 10, contours: [[[0, 0], [1, 0], [1, 1]]] });
const fixture = () => ({ referencePdfBytes: Buffer.from(originalReference), candidatePdfBytes: Buffer.from(originalCandidate), authoredSourceBytes: Buffer.from(originalSource), payload: { ...payload }, signatureBase64, trust: { ...trust }, expectedGeometry: geometry() });

function assertDeniedApproval(result) {
  assert.equal(result.manufacturingApproved, false, JSON.stringify(result));
}

test('valid signed fixture reaches PDF parity, always without manufacturing approval', () => {
  const data = fixture();
  const before = { reference: Buffer.from(data.referencePdfBytes), candidate: Buffer.from(data.candidatePdfBytes), source: Buffer.from(data.authoredSourceBytes), geometry: structuredClone(data.expectedGeometry) };
  const result = verify(data);
  assert.equal(result.provenanceVerified, true, JSON.stringify(result));
  assert.equal(result.parityVerified, false, 'synthetic PDF has no validated drawing content');
  assertDeniedApproval(result);
  assert.deepEqual(data.referencePdfBytes, before.reference);
  assert.deepEqual(data.candidatePdfBytes, before.candidate);
  assert.deepEqual(data.authoredSourceBytes, before.source);
  assert.deepEqual(data.expectedGeometry, before.geometry);
});

test('mutations made before verification invalidate signed reference and authored source', () => {
  for (const name of ['referencePdfBytes', 'authoredSourceBytes']) {
    const data = fixture();
    data[name][0] ^= 1;
    const result = verify(data);
    assert.equal(result.provenanceVerified, false, `${name}: ${JSON.stringify(result)}`);
    assert.equal(result.parityVerified, false);
    assertDeniedApproval(result);
    assert.match(result.reason, /content hash mismatch/);
  }
});

test('candidate and geometry changes are local to each invocation', () => {
  const data = fixture();
  const original = verify(data);
  assert.equal(original.provenanceVerified, true);
  assertDeniedApproval(original);
  data.candidatePdfBytes[0] ^= 1;
  data.expectedGeometry.contours[0][0][0] = 9;
  const changed = verify(data);
  assert.equal(changed.provenanceVerified, true, JSON.stringify(changed));
  assert.equal(changed.parityVerified, false);
  assertDeniedApproval(changed);
  const restored = verify(fixture());
  assert.equal(restored.provenanceVerified, true, JSON.stringify(restored));
  assertDeniedApproval(restored);
});

test('fixed SharedArrayBuffer bytes copied before worker mutation preserve a signed reference', { timeout: 10000 }, async () => {
  // Synchronize mutation strictly after a first verification has returned. This
  // tests distinct invocation snapshots without claiming atomicity during races.
  const shared = new SharedArrayBuffer(originalReference.length);
  const exposed = new Uint8Array(shared);
  exposed.set(originalReference);
  const data = fixture();
  data.referencePdfBytes = exposed;
  const prior = verify(data);
  assert.equal(prior.provenanceVerified, true, JSON.stringify(prior));
  assertDeniedApproval(prior);
  const worker = new Worker(`
    const { workerData, parentPort } = require('node:worker_threads');
    const bytes = new Uint8Array(workerData);
    bytes[0] ^= 1;
    parentPort.postMessage('mutated');
  `, { eval: true, workerData: shared });
  try {
    await new Promise((resolve, reject) => {
      worker.once('message', message => message === 'mutated' ? resolve() : reject(Error('unexpected worker response')));
      worker.once('error', reject);
      worker.once('exit', code => { if (code !== 0) reject(Error(`worker exited ${code}`)); });
    });
    const after = verify(data);
    assert.equal(after.provenanceVerified, false, JSON.stringify(after));
    assert.equal(after.parityVerified, false);
    assertDeniedApproval(after);
    assert.match(after.reason, /content hash mismatch/);
    const fresh = verify(fixture());
    assert.equal(fresh.provenanceVerified, true, JSON.stringify(fresh));
    assertDeniedApproval(fresh);
  } finally {
    await worker.terminate();
  }
});
