import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verifyAuthenticatedPdfParity } from './factoryZipPdfAuthenticatedParity20261024_2155.mjs';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const contour = [[10, 10], [21, 11], [22, 17], [19, 21], [9, 20]];
const expectedGeometry = { pages: 1, width: 50, length: 50, contours: [contour] };
const fixture = String.raw`
import fitz,sys,base64
s=72/2.54
d=fitz.open();p=d.new_page(width=50*s,height=50*s)
d.xref_set_key(p.xref,'EXOStartCm','0');d.xref_set_key(p.xref,'EXOEndCm','50')
q=[fitz.Point(x*s,y*s) for x,y in [[10,10],[21,11],[22,17],[19,21],[9,20]]]
shape=p.new_shape()
for a,b in zip(q,q[1:]+q[:1]):shape.draw_line(a,b)
shape.finish(color=(0,0,0),width=.8);shape.commit()
for x in (2,3,4,5):p.draw_line((x*s,39*s),(x*s,41*s),color=(0,0,0),width=.5)
if sys.argv[1]=='extra':p.draw_line((4*s,12*s),(6*s,12*s),color=(1,0,0),width=.5)
sys.stdout.write(base64.b64encode(d.tobytes()).decode())
`;

function pdf(variant) {
  const child = spawnSync('python3', ['-c', fixture, variant], { encoding: 'utf8', timeout: 10000, maxBuffer: 2_000_000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  return Buffer.from(child.stdout, 'base64');
}

const referencePdfBytes = pdf('baseline');
const candidatePdfBytes = pdf('extra');
const authoredSourceBytes = Buffer.from('independent immutable garment source bytes');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const { publicKey: wrongKey } = generateKeyPairSync('ed25519');
const trust = {
  publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
  keyId: 'factory-pinned-dev-key', garmentId: 'synthetic-shirt', revision: 'r1',
  size: 'M', units: 'cm', documentRole: 'factory-reference',
};
const payload = {
  schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId,
  referencePdfSha256: sha256(referencePdfBytes), authoredSourceSha256: sha256(authoredSourceBytes),
  garmentId: trust.garmentId, revision: trust.revision, size: trust.size,
  units: trust.units, documentRole: trust.documentRole,
};
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const valid = { referencePdfBytes, candidatePdfBytes: referencePdfBytes, authoredSourceBytes,
  payload, signatureBase64, trust, expectedGeometry };

function denied(overrides, provenanceVerified) {
  const result = verifyAuthenticatedPdfParity({ ...valid, ...overrides });
  assert.equal(result.provenanceVerified, provenanceVerified, JSON.stringify(result));
  assert.equal(result.parityVerified, false, JSON.stringify(result));
  assert.equal(result.manufacturingApproved, false);
  assert.ok(typeof result.reason === 'string' && result.reason.length, JSON.stringify(result));
  return result;
}

test('signed independent reference and identical candidate pass development parity only', () => {
  assert.deepEqual(verifyAuthenticatedPdfParity(valid), {
    provenanceVerified: true, parityVerified: true, manufacturingApproved: false,
  });
});

test('missing caller trust and wrong pinned public key reject before parity', () => {
  denied({ trust: undefined }, false);
  denied({ trust: { ...trust, publicKeyPem: wrongKey.export({ type: 'spki', format: 'pem' }) } }, false);
  denied({ trust: { ...trust, revision: 'r2' } }, false);
});

test('signed source or reference byte mutation invalidates pinned provenance', () => {
  const changedReference = Buffer.from(referencePdfBytes);
  changedReference[changedReference.length - 12] ^= 1;
  denied({ referencePdfBytes: changedReference }, false);
  denied({ authoredSourceBytes: Buffer.from('different source bytes') }, false);
  denied({ payload: { ...payload, authoredSourceSha256: sha256(Buffer.from('forged source')) } }, false);
});

test('bad signature and attacker authored reference signature do not substitute for caller trust', () => {
  denied({ signatureBase64: Buffer.alloc(64).toString('base64') }, false);
  const { privateKey: attackerPrivate, publicKey: attackerPublic } = generateKeyPairSync('ed25519');
  const attackerPayload = { ...payload, referencePdfSha256: sha256(candidatePdfBytes) };
  const attackerSig = sign(null, canonicalPdfReferenceProvenance(attackerPayload), attackerPrivate).toString('base64');
  denied({ referencePdfBytes: candidatePdfBytes, candidatePdfBytes,
    payload: attackerPayload, signatureBase64: attackerSig }, false);
  denied({ trust: { ...trust, publicKeyPem: attackerPublic.export({ type: 'spki', format: 'pem' }) } }, false);
});

test('malicious candidate and signed reference geometry mismatch reject after provenance', () => {
  denied({ candidatePdfBytes }, true);
  denied({ expectedGeometry: { ...expectedGeometry, width: 51 } }, true);
  denied({ candidatePdfBytes: Buffer.from('%PDF-1.7\nmalformed') }, true);
});

test('nonfinite geometry, malformed bytes, and oversized input reject closed', () => {
  denied({ expectedGeometry: { ...expectedGeometry, width: Infinity } }, false);
  denied({ expectedGeometry: { ...expectedGeometry, contours: [[[0, 0], [1, NaN], [2, 1]]] } }, false);
  denied({ expectedGeometry: { ...expectedGeometry, contours: [[[0, 0], [1, 1], [2, Infinity]]] } }, false);
  denied({ candidatePdfBytes: 'not bytes' }, false);
  denied({ authoredSourceBytes: new Uint8Array(0) }, false);
  denied({ candidatePdfBytes: Buffer.alloc(1_400_001) }, false);
});

test('Python checker nonzero exit fails closed while signed provenance remains true', () => {
  const result = denied({ candidatePdfBytes: Buffer.from('%PDF-1.7\nmalformed') }, true);
  assert.match(result.reason, /parity checker failed/);
});
