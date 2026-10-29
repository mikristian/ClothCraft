import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { createTeeTemplate } from '../data/templates.js';
import { gradeProject } from './grading.js';
import { buildFabricMarkers } from './marker.js';
import { markerToPdf } from './markerArtifacts.js';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';
import { verifyAuthenticatedPdfParity } from './factoryZipPdfAuthenticatedParity20261024_2155.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const trust = { publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }), keyId: 'test-identity', garmentId: 'tee', revision: 'r1', size: 'M', units: 'cm', documentRole: 'factory-reference' };
const project = gradeProject(createTeeTemplate(), 'M');
const marker = Object.values(buildFabricMarkers(project))[0];
const referencePdfBytes = Buffer.from(markerToPdf(marker, { size: 'M', project, calibration: true }));
const authoredSourceBytes = Buffer.from('externally authored marker revision r1');
const expectedGeometry = { pages: Math.ceil(marker.length / 400), width: marker.width, length: marker.length,
  contours: marker.placements.map(p => p.outline.map(q => [q.x, q.y])) };
const payload = { schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId,
  referencePdfSha256: hash(referencePdfBytes), authoredSourceSha256: hash(authoredSourceBytes),
  garmentId: trust.garmentId, revision: trust.revision, size: trust.size, units: trust.units, documentRole: trust.documentRole };
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const valid = { referencePdfBytes, candidatePdfBytes: referencePdfBytes, authoredSourceBytes, expectedGeometry, payload, signatureBase64, trust };

test('valid signed actual generated marker PDF passes both development checks', { timeout: 30000 }, () => {
  assert.deepEqual(verifyAuthenticatedPdfParity(valid), { provenanceVerified: true, parityVerified: true, manufacturingApproved: false });
});

test('invalid signature refuses provenance before Python', () => {
  const result = verifyAuthenticatedPdfParity({ ...valid, signatureBase64: Buffer.alloc(64).toString('base64') });
  assert.equal(result.provenanceVerified, false);
  assert.equal(result.parityVerified, false);
  assert.equal(result.manufacturingApproved, false);
  assert.match(result.reason, /signature verification failed/);
});

test('altered candidate fails parity despite authenticated reference', { timeout: 30000 }, () => {
  const candidatePdfBytes = Buffer.from('%PDF-1.7\ninvalid candidate');
  const result = verifyAuthenticatedPdfParity({ ...valid, candidatePdfBytes });
  assert.equal(result.provenanceVerified, true);
  assert.equal(result.parityVerified, false);
  assert.equal(result.manufacturingApproved, false);
});

test('nonfinite or oversized geometry and altered signed reference fail closed', () => {
  for (const width of [Infinity, NaN, 1e12]) {
    const result = verifyAuthenticatedPdfParity({ ...valid, expectedGeometry: { ...expectedGeometry, width } });
    assert.equal(result.provenanceVerified, false);
    assert.equal(result.parityVerified, false);
  }
  const referencePdfBytes = Buffer.from(valid.referencePdfBytes);
  referencePdfBytes[10] ^= 1;
  assert.equal(verifyAuthenticatedPdfParity({ ...valid, referencePdfBytes }).provenanceVerified, false);
});
