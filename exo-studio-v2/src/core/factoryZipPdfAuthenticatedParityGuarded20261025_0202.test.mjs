import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';
import { verifyGuardedAuthenticatedPdfParity } from './factoryZipPdfAuthenticatedParityGuarded20261025_0202.mjs';
import { createTeeTemplate } from '../data/templates.js';
import { gradeProject } from './grading.js';
import { buildFabricMarkers } from './marker.js';
import { markerToPdf } from './markerArtifacts.js';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const trust = { publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }), keyId: 'fixture-key', garmentId: 'tee', revision: 'r1', size: 'M', units: 'cm', documentRole: 'factory-reference' };
const referencePdfBytes = Buffer.from('%PDF-1.4\nsynthetic signed reference\n%%EOF');
const authoredSourceBytes = Buffer.from('authored source test fixture');
const payload = { schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId, referencePdfSha256: createHash('sha256').update(referencePdfBytes).digest('hex'), authoredSourceSha256: createHash('sha256').update(authoredSourceBytes).digest('hex'), garmentId: trust.garmentId, revision: trust.revision, size: trust.size, units: trust.units, documentRole: trust.documentRole };
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const expectedGeometry = { pages: 1, width: 10, length: 10, contours: [[[0, 0], [1, 0], [1, 1]]] };
const valid = { referencePdfBytes, candidatePdfBytes: referencePdfBytes, authoredSourceBytes, payload, signatureBase64, trust, expectedGeometry };
const rejected = value => {
  assert.equal(value.provenanceVerified, false);
  assert.equal(value.parityVerified, false);
  assert.equal(value.manufacturingApproved, false);
  assert.equal(typeof value.reason, 'string');
};

test('valid signed synthetic provenance reaches independent parity checker, which rejects non-PDF fixture', () => {
  const result = verifyGuardedAuthenticatedPdfParity(valid);
  assert.equal(result.provenanceVerified, true);
  assert.equal(result.parityVerified, false);
  assert.equal(result.manufacturingApproved, false);
});

test('rejects top-level and nested accessors without invoking them', () => {
  let hits = 0;
  const accessor = (base, key) => {
    const copy = { ...base };
    Object.defineProperty(copy, key, { enumerable: true, get() { hits++; throw Error('getter executed'); } });
    return copy;
  };
  rejected(verifyGuardedAuthenticatedPdfParity(accessor(valid, 'referencePdfBytes')));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, payload: accessor(payload, 'garmentId') }));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, trust: accessor(trust, 'keyId') }));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, expectedGeometry: accessor(expectedGeometry, 'pages') }));
  const contour = [[0, 0], [1, 0], [1, 1]];
  Object.defineProperty(contour, '1', { configurable: true, enumerable: true, get() { hits++; return [1, 0]; } });
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, expectedGeometry: { ...expectedGeometry, contours: [contour] } }));
  assert.equal(hits, 0);
});

test('rejects proxies, sparse arrays, array extras, inherited records, and shadowed byte properties', () => {
  rejected(verifyGuardedAuthenticatedPdfParity(new Proxy(valid, {})));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, payload: new Proxy(payload, {}) }));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, expectedGeometry: { ...expectedGeometry, contours: new Array(1) } }));
  const contaminated = [[0, 0], [1, 0], [1, 1]];
  contaminated.extra = true;
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, expectedGeometry: { ...expectedGeometry, contours: [contaminated] } }));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, trust: Object.assign(Object.create({ inherited: true }), trust) }));
  let hits = 0;
  const bytes = Buffer.from(referencePdfBytes);
  Object.defineProperty(bytes, 'byteLength', { get() { hits++; throw Error('shadowed bytes getter'); } });
  Object.defineProperty(bytes, 'constructor', { get() { hits++; throw Error('species getter'); } });
  const result = verifyGuardedAuthenticatedPdfParity({ ...valid, candidatePdfBytes: bytes });
  assert.equal(result.manufacturingApproved, false);
  assert.equal(hits, 0);
});

test('rejects invalid signature and oversized numeric geometry', () => {
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, signatureBase64: 'invalid' }));
  rejected(verifyGuardedAuthenticatedPdfParity({ ...valid, expectedGeometry: { ...expectedGeometry, width: Infinity } }));
});

test('signed generated marker passes provenance and independent raster parity', { timeout: 30000 }, () => {
  const project = gradeProject(createTeeTemplate(), 'M');
  const marker = Object.values(buildFabricMarkers(project))[0];
  const pdf = Buffer.from(markerToPdf(marker, { size: 'M', project, calibration: true }));
  const realPayload = { ...payload, referencePdfSha256: createHash('sha256').update(pdf).digest('hex') };
  const realSignature = sign(null, canonicalPdfReferenceProvenance(realPayload), privateKey).toString('base64');
  const realGeometry = { pages: Math.ceil(marker.length / 400), width: marker.width, length: marker.length,
    contours: marker.placements.map(p => p.outline.map(q => [q.x, q.y])) };
  assert.deepEqual(verifyGuardedAuthenticatedPdfParity({ ...valid, referencePdfBytes: pdf, candidatePdfBytes: pdf,
    payload: realPayload, signatureBase64: realSignature, expectedGeometry: realGeometry }),
  { provenanceVerified: true, parityVerified: true, manufacturingApproved: false });
});
