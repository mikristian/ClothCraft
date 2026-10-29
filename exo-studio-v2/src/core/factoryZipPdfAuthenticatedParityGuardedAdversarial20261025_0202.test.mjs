import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const matching = (await readdir(here)).filter(n => /^factoryZipPdfAuthenticatedParity.*Guard.*\.mjs$/.test(n) && !n.endsWith('.test.mjs'));
assert.equal(matching.length, 1, `expected exactly one guarded parity entrypoint, found ${matching.join(', ')}`);
const { verifyGuardedAuthenticatedPdfParity: verify } = await import(`./${matching[0]}`);
assert.equal(typeof verify, 'function', 'guarded parity export missing');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const referencePdfBytes = Buffer.from('%PDF-1.7\nsynthetic reference');
const candidatePdfBytes = Buffer.from(referencePdfBytes);
const authoredSourceBytes = Buffer.from('signed source');
const sha = x => createHash('sha256').update(x).digest('hex');
const trust = { publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }), keyId: 'dev-key', garmentId: 'shirt', revision: 'r1', size: 'M', units: 'cm', documentRole: 'factory-reference' };
const payload = { schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId, referencePdfSha256: sha(referencePdfBytes), authoredSourceSha256: sha(authoredSourceBytes), garmentId: trust.garmentId, revision: trust.revision, size: trust.size, units: trust.units, documentRole: trust.documentRole };
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const expectedGeometry = { pages: 1, width: 50, length: 50, contours: [[[1, 1], [2, 1], [2, 2]]] };
const valid = () => ({ referencePdfBytes, candidatePdfBytes, authoredSourceBytes, payload, signatureBase64, trust, expectedGeometry: { ...expectedGeometry, contours: expectedGeometry.contours.map(contour => contour.map(point => [...point])) } });
function rejects(input, expectedProvenance = false) {
  let result;
  assert.doesNotThrow(() => { result = verify(input); });
  assert.equal(result?.provenanceVerified, expectedProvenance, `unexpected provenance outcome: ${JSON.stringify(result)}`);
  assert.equal(result?.manufacturingApproved, false);
  assert.equal(result?.parityVerified, false, `unexpected parity acceptance: ${JSON.stringify(result)}`);
  assert.equal(typeof result?.reason, 'string');
}

test('nested geometry getters fail without executing accessors', () => {
  for (const section of ['root', 'contour', 'point']) {
    let hits = 0;
    const data = valid();
    if (section === 'root') Object.defineProperty(data.expectedGeometry, 'width', { enumerable: true, get() { hits++; throw Error('geometry getter'); } });
    if (section === 'contour') Object.defineProperty(data.expectedGeometry.contours[0], '0', { enumerable: true, get() { hits++; throw Error('contour getter'); } });
    if (section === 'point') Object.defineProperty(data.expectedGeometry.contours[0][0], '0', { enumerable: true, get() { hits++; throw Error('point getter'); } });
    rejects(data);
    assert.equal(hits, 0, section);
  }
});

test('top-level option getter fails without execution', () => {
  const data = valid();
  let hits = 0;
  Object.defineProperty(data, 'expectedGeometry', { enumerable: true, get() { hits++; throw Error('top-level getter'); } });
  rejects(data);
  assert.equal(hits, 0);
});

test('nested geometry proxies fail without running traps', () => {
  for (const section of ['root', 'contours', 'contour', 'point']) {
    let hits = 0;
    const data = valid();
    const hostile = target => new Proxy(target, { get() { hits++; throw Error('get trap'); }, ownKeys() { hits++; throw Error('keys trap'); }, getPrototypeOf() { hits++; throw Error('prototype trap'); }, getOwnPropertyDescriptor() { hits++; throw Error('descriptor trap'); } });
    if (section === 'root') data.expectedGeometry = hostile(data.expectedGeometry);
    if (section === 'contours') data.expectedGeometry.contours = hostile(data.expectedGeometry.contours);
    if (section === 'contour') data.expectedGeometry.contours[0] = hostile(data.expectedGeometry.contours[0]);
    if (section === 'point') data.expectedGeometry.contours[0][0] = hostile(data.expectedGeometry.contours[0][0]);
    rejects(data);
    assert.equal(hits, 0, section);
  }
});

test('byte constructors, species and shadowed metadata never execute accessors', () => {
  for (const field of ['referencePdfBytes', 'candidatePdfBytes', 'authoredSourceBytes']) {
    const data = valid();
    let hits = 0;
    const bytes = Uint8Array.from(data[field]);
    const constructor = {};
    Object.defineProperty(constructor, Symbol.species, { get() { hits++; throw Error('species'); } });
    Object.defineProperty(bytes, 'constructor', { get() { hits++; return constructor; } });
    Object.defineProperty(bytes, 'byteLength', { get() { hits++; throw Error('byteLength'); } });
    Object.defineProperty(bytes, 'length', { get() { hits++; throw Error('length'); } });
    data[field] = bytes;
    // Synthetic PDF may fail actual parity; importantly accessors must never execute.
    rejects(data, true);
    assert.equal(hits, 0, field);
  }
});

test('extra fields, symbols, inherited records, altered signatures and stale hashes reject', () => {
  rejects({ ...valid(), unexpected: 1 });
  rejects({ ...valid(), [Symbol('hidden')]: true });
  rejects({ ...valid(), expectedGeometry: { ...expectedGeometry, unexpected: 1 } });
  rejects({ ...valid(), expectedGeometry: { ...expectedGeometry, [Symbol('hidden')]: true } });
  rejects({ ...valid(), expectedGeometry: Object.assign(Object.create({ inherited: true }), expectedGeometry) });
  rejects({ ...valid(), payload: { ...payload, unexpected: 'yes' } });
  rejects({ ...valid(), trust: { ...trust, unexpected: 'yes' } });
  rejects({ ...valid(), signatureBase64: Buffer.alloc(64).toString('base64') });
  rejects({ ...valid(), authoredSourceBytes: Buffer.from('updated source') });
  rejects({ ...valid(), referencePdfBytes: Buffer.from('different PDF') });
});
