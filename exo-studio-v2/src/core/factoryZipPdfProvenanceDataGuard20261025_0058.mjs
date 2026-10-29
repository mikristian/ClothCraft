// Development-only input boundary for the detached PDF provenance verifier.
import { types } from 'node:util';
import { verifyPdfReferenceProvenance } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const MAX_BYTES = 32 * 1024 * 1024;
const INPUT_FIELDS = ['referencePdfBytes', 'authoredSourceBytes', 'payload', 'signatureBase64', 'trust'];
const PAYLOAD_FIELDS = ['schemaVersion', 'keyId', 'referencePdfSha256', 'authoredSourceSha256', 'garmentId', 'revision', 'size', 'units', 'documentRole'];
const TRUST_FIELDS = ['publicKeyPem', 'keyId', 'garmentId', 'revision', 'size', 'units', 'documentRole'];
const byteLengthGetter = Object.getOwnPropertyDescriptor(Uint8Array.prototype, 'byteLength')?.get
  ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get;

function reject(message) { throw new Error(`PDF provenance data guard: ${message}`); }

function safeRecord(value, fields, name) {
  if (value === null || typeof value !== 'object' || types.isProxy(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    reject(`invalid ${name} record`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(k => typeof k !== 'string' || !fields.includes(k))) {
    reject(`invalid ${name} fields`);
  }
  const copy = Object.create(null);
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string') {
      reject(`invalid ${name} field ${field}`);
    }
    copy[field] = descriptor.value;
  }
  return copy;
}

function safeBytes(value, name) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || !types.isUint8Array(value) ||
      (Object.getPrototypeOf(value) !== Buffer.prototype && Object.getPrototypeOf(value) !== Uint8Array.prototype)) {
    reject(`invalid ${name} bytes`);
  }
  // Native typed-array accessors and methods bypass shadowed instance properties.
  const length = byteLengthGetter.call(value);
  if (length === 0 || length > MAX_BYTES) reject(`invalid ${name} length`);
  try {
    const snapshot = Buffer.allocUnsafe(length);
    // Native typed-array set accesses source internal slots without species lookup.
    Uint8Array.prototype.set.call(snapshot, value);
    return snapshot;
  } catch {
    reject(`cannot copy ${name} bytes`);
  }
}

export function verifyGuardedPdfReferenceProvenance(options) {
  if (!options || typeof options !== 'object' || types.isProxy(options) ||
      (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null)) {
    reject('invalid options record');
  }
  const keys = Reflect.ownKeys(options);
  if (keys.length !== INPUT_FIELDS.length || keys.some(k => typeof k !== 'string' || !INPUT_FIELDS.includes(k))) {
    reject('invalid options fields');
  }
  const values = Object.create(null);
  for (const field of INPUT_FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(options, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) reject(`invalid options field ${field}`);
    values[field] = descriptor.value;
  }
  const payload = safeRecord(values.payload, PAYLOAD_FIELDS, 'payload');
  const trust = safeRecord(values.trust, TRUST_FIELDS, 'trust');
  if (typeof values.signatureBase64 !== 'string') reject('invalid signature');
  const referencePdfBytes = safeBytes(values.referencePdfBytes, 'reference PDF');
  const authoredSourceBytes = safeBytes(values.authoredSourceBytes, 'authored source');
  return verifyPdfReferenceProvenance({
    referencePdfBytes, authoredSourceBytes, payload, trust, signatureBase64: values.signatureBase64,
  });
}
