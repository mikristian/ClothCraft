// Development-only boundary: validate untrusted inputs before provenance and visual parity.
import { types } from 'node:util';
import { verifyGuardedPdfReferenceProvenance } from './factoryZipPdfProvenanceDataGuard20261025_0058.mjs';
import { verifyAuthenticatedPdfParity } from './factoryZipPdfAuthenticatedParity20261024_2155.mjs';

const OPTIONS = ['referencePdfBytes', 'candidatePdfBytes', 'authoredSourceBytes', 'payload', 'signatureBase64', 'trust', 'expectedGeometry'];
const PAYLOAD = ['schemaVersion', 'keyId', 'referencePdfSha256', 'authoredSourceSha256', 'garmentId', 'revision', 'size', 'units', 'documentRole'];
const TRUST = ['publicKeyPem', 'keyId', 'garmentId', 'revision', 'size', 'units', 'documentRole'];
const GEOMETRY = ['pages', 'width', 'length', 'contours'];
const getter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get;
const fail = reason => ({ provenanceVerified: false, parityVerified: false, manufacturingApproved: false, reason });
function invalid(message) { throw new Error('guarded PDF parity: ' + message); }

function record(value, names, label) {
  if (value === null || typeof value !== 'object' || types.isProxy(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) invalid('invalid ' + label);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || keys.some(key => typeof key !== 'string' || !names.includes(key))) invalid('invalid ' + label + ' fields');
  const result = Object.create(null);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('invalid ' + label + '.' + name);
    result[name] = descriptor.value;
  }
  return result;
}

function bytes(value, label, max) {
  if (value === null || typeof value !== 'object' || types.isProxy(value) ||
      !types.isUint8Array(value) ||
      (Object.getPrototypeOf(value) !== Uint8Array.prototype && Object.getPrototypeOf(value) !== Buffer.prototype)) invalid('invalid ' + label);
  const len = getter.call(value);
  if (len < 1 || len > max) invalid('invalid ' + label + ' length');
  const copy = Buffer.allocUnsafe(len);
  try { Uint8Array.prototype.set.call(copy, value); } catch { invalid('cannot copy ' + label); }
  return copy;
}

function denseArray(value, label, min, max) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) invalid('invalid ' + label);
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < min || length > max) invalid('invalid ' + label + ' length');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1) invalid('invalid ' + label + ' keys');
  const result = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('invalid ' + label + ' index');
    result.push(descriptor.value);
  }
  return result;
}

function number(value, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1_000_000 || (positive && value <= 0)) invalid('invalid geometry number');
  return value;
}

function geometry(value) {
  const g = record(value, GEOMETRY, 'geometry');
  if (!Number.isSafeInteger(g.pages) || g.pages < 1 || g.pages > 100) invalid('invalid page count');
  const outer = denseArray(g.contours, 'contours', 1, 1000);
  let points = 0;
  const contours = outer.map(contour => {
    const coords = denseArray(contour, 'contour', 3, 20000);
    points += coords.length;
    if (points > 20000) invalid('too many contour points');
    return coords.map(point => {
      const pair = denseArray(point, 'point', 2, 2);
      return [number(pair[0]), number(pair[1])];
    });
  });
  return { pages: g.pages, width: number(g.width, true), length: number(g.length, true), contours };
}

export function verifyGuardedAuthenticatedPdfParity(options) {
  try {
    const values = record(options, OPTIONS, 'options');
    const payload = record(values.payload, PAYLOAD, 'payload');
    const trust = record(values.trust, TRUST, 'trust');
    for (const field of PAYLOAD) if (typeof payload[field] !== 'string') invalid('invalid payload.' + field);
    for (const field of TRUST) if (typeof trust[field] !== 'string') invalid('invalid trust.' + field);
    if (typeof values.signatureBase64 !== 'string') invalid('invalid signature');
    const referencePdfBytes = bytes(values.referencePdfBytes, 'reference PDF', 1_400_000);
    const candidatePdfBytes = bytes(values.candidatePdfBytes, 'candidate PDF', 1_400_000);
    const authoredSourceBytes = bytes(values.authoredSourceBytes, 'authored source', 32 * 1024 * 1024);
    const expectedGeometry = geometry(values.expectedGeometry);
    verifyGuardedPdfReferenceProvenance({ referencePdfBytes, authoredSourceBytes, payload, signatureBase64: values.signatureBase64, trust });
    return verifyAuthenticatedPdfParity({ referencePdfBytes, candidatePdfBytes, authoredSourceBytes, payload, signatureBase64: values.signatureBase64, trust, expectedGeometry });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'untrusted parity input rejected');
  }
}
