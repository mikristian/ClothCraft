import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGuardedAuthenticatedPdfParity as verify } from './factoryZipPdfAuthenticatedParityGuarded20261025_0202.mjs';

const pdf = Buffer.from('%PDF-1.7\nsynthetic');
const geometry = () => ({ pages: 1, width: 10, length: 10, contours: [[[0, 0], [1, 0], [1, 1]]] });
const base = () => ({
  referencePdfBytes: pdf, candidatePdfBytes: pdf, authoredSourceBytes: Buffer.from('source'),
  payload: { schemaVersion: '', keyId: '', referencePdfSha256: '', authoredSourceSha256: '', garmentId: '', revision: '', size: '', units: '', documentRole: '' },
  signatureBase64: '',
  trust: { publicKeyPem: '', keyId: '', garmentId: '', revision: '', size: '', units: '', documentRole: '' },
  expectedGeometry: geometry(),
});

function rejected(input, reasonPattern) {
  let result;
  assert.doesNotThrow(() => { result = verify(input); });
  assert.equal(result?.provenanceVerified, false, JSON.stringify(result));
  assert.equal(result?.parityVerified, false);
  assert.equal(result?.manufacturingApproved, false);
  assert.match(result?.reason, reasonPattern);
}

test('rejects reference and candidate PDF buffers one byte past their 1.4 MB cap', () => {
  for (const field of ['referencePdfBytes', 'candidatePdfBytes']) {
    const data = base();
    data[field] = Buffer.alloc(1_400_001);
    rejected(data, /invalid (reference PDF|candidate PDF) length/);
  }
});

test('rejects source bytes one byte past 32 MiB cap', () => {
  const data = base();
  data.authoredSourceBytes = Buffer.alloc(32 * 1024 * 1024 + 1);
  rejected(data, /invalid authored source length/);
});

test('rejects zero-length buffers before provenance', () => {
  for (const field of ['referencePdfBytes', 'candidatePdfBytes', 'authoredSourceBytes']) {
    const data = base();
    data[field] = Buffer.alloc(0);
    rejected(data, /invalid .* length/);
  }
});

test('rejects geometry array budgets and oversized nested contours without enormous allocation', () => {
  const sharedPoint = Object.freeze([1, 2]);
  const sharedContour = Object.freeze([sharedPoint, sharedPoint, sharedPoint]);
  const cases = [
    { contours: Array(1001).fill(sharedContour), reason: /invalid contours length/ },
    { contours: [Array(20001).fill(sharedPoint)], reason: /invalid contour length/ },
    { contours: Array(7).fill(Array(3000).fill(sharedPoint)), reason: /too many contour points/ },
    { contours: [[sharedPoint, sharedPoint, Array(20001).fill(0)]], reason: /invalid point length/ },
    { contours: Array(0), reason: /invalid contours length/ },
    { contours: [new Array(20000)], reason: /invalid contour keys/ },
    { contours: [[sharedPoint, sharedPoint, [0, 1, 2]]], reason: /invalid point length/ },
  ];
  for (const { contours, reason } of cases) {
    const data = base();
    data.expectedGeometry.contours = contours;
    // Every geometry case should fail before reaching provenance validation.
    rejected(data, reason);
  }
});

test('rejects invalid dimensions, coordinates and page counts', () => {
  const variants = [
    ['pages', 0, /invalid page count/], ['pages', 101, /invalid page count/],
    ['pages', 1.5, /invalid page count/], ['width', 0, /invalid geometry number/],
    ['length', -1, /invalid geometry number/], ['width', Infinity, /invalid geometry number/],
    ['length', NaN, /invalid geometry number/], ['width', 1_000_001, /invalid geometry number/],
  ];
  for (const [field, value, reason] of variants) {
    const data = base(); data.expectedGeometry[field] = value;
    rejected(data, reason);
  }
  for (const value of [NaN, Infinity, -Infinity, 1_000_001, '1']) {
    const data = base(); data.expectedGeometry.contours[0][0][0] = value;
    rejected(data, /invalid geometry number/);
  }
});

test('rejects hostile nested proxies and accessors without invoking traps or getters', () => {
  for (const field of ['referencePdfBytes', 'candidatePdfBytes', 'authoredSourceBytes']) {
    let hits = 0;
    const data = base();
    const bytes = Buffer.from(pdf);
    Object.defineProperty(bytes, 'constructor', { get() { hits++; throw Error('constructor getter'); } });
    Object.defineProperty(bytes, 'byteLength', { get() { hits++; throw Error('byteLength getter'); } });
    data[field] = bytes;
    // Other fields fail later, but any byte accessor must remain untouched.
    const result = verify(data);
    assert.equal(result.manufacturingApproved, false);
    assert.equal(hits, 0);
  }
  for (const position of ['contours', 'contour', 'point']) {
    let hits = 0;
    const trap = new Proxy([1, 2], { get() { hits++; throw Error('get'); }, ownKeys() { hits++; throw Error('keys'); }, getPrototypeOf() { hits++; throw Error('proto'); } });
    const data = base();
    if (position === 'contours') data.expectedGeometry.contours = trap;
    if (position === 'contour') data.expectedGeometry.contours[0] = trap;
    if (position === 'point') data.expectedGeometry.contours[0][0] = trap;
    rejected(data, /invalid (contours|contour|point)/);
    assert.equal(hits, 0, position);
  }
  let getterHits = 0;
  const data = base();
  Object.defineProperty(data.expectedGeometry.contours[0][0], '0', { get() { getterHits++; throw Error('point getter'); } });
  rejected(data, /invalid point index/);
  assert.equal(getterHits, 0);
});
