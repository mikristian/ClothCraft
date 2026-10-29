// Development-only evidence verification. A valid signature is not manufacturing approval.
import { createHash, createPublicKey, verify } from 'node:crypto';

export const PDF_REFERENCE_PROVENANCE_SCHEMA = 'exo.pdf-reference-provenance.v1';
const MAX_BYTES = 32 * 1024 * 1024;
const FIELDS = ['schemaVersion', 'keyId', 'referencePdfSha256', 'authoredSourceSha256', 'garmentId', 'revision', 'size', 'units', 'documentRole'];
const hex64 = /^[0-9a-f]{64}$/;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/;

function fail(message) { throw new Error(`PDF reference provenance: ${message}`); }
function record(value, fields, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== fields.length ||
      Object.keys(value).some(k => !fields.includes(k)) ||
      fields.some(k => !Object.hasOwn(value, k))) fail(`invalid ${name} fields`);
}
function bytes(value, label) {
  if (!(Buffer.isBuffer(value) || value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > MAX_BYTES) fail(`invalid ${label} bytes`);
  return value;
}
function id(value, name) {
  if (typeof value !== 'string' || !identifier.test(value)) fail(`invalid ${name}`);
}
function sha(value) { return createHash('sha256').update(value).digest('hex'); }

// Fixed field order is part of the signed format. Callers may use this to construct
// detached signatures; they must distribute the trust anchor separately.
export function canonicalPdfReferenceProvenance(payload) {
  record(payload, FIELDS, 'payload');
  for (const field of ['keyId', 'garmentId', 'revision', 'size', 'documentRole']) id(payload[field], field);
  if (payload.schemaVersion !== PDF_REFERENCE_PROVENANCE_SCHEMA || payload.units !== 'cm' ||
      !hex64.test(payload.referencePdfSha256) || !hex64.test(payload.authoredSourceSha256)) fail('invalid payload values');
  return Buffer.from(JSON.stringify(Object.fromEntries(FIELDS.map(field => [field, payload[field]]))), 'utf8');
}

// Fail closed. An out-of-band trust anchor and expected identity are mandatory;
// signatures or keys declared by an untrusted PDF or its metadata are never trusted.
export function verifyPdfReferenceProvenance({ referencePdfBytes, authoredSourceBytes, payload, signatureBase64, trust } = {}) {
  record(trust, ['publicKeyPem', 'keyId', 'garmentId', 'revision', 'size', 'units', 'documentRole'], 'out-of-band trust');
  for (const field of ['keyId', 'garmentId', 'revision', 'size', 'documentRole']) id(trust[field], `trusted ${field}`);
  if (trust.units !== 'cm') fail('trusted units must be cm');
  if (typeof trust.publicKeyPem !== 'string' || trust.publicKeyPem.length > 4096 || !trust.publicKeyPem.includes('BEGIN PUBLIC KEY')) fail('invalid pinned public key');
  bytes(referencePdfBytes, 'reference PDF');
  bytes(authoredSourceBytes, 'authored source');
  const message = canonicalPdfReferenceProvenance(payload);
  for (const field of ['keyId', 'garmentId', 'revision', 'size', 'units', 'documentRole']) {
    if (payload[field] !== trust[field]) fail(`${field} does not match trust anchor`);
  }
  if (payload.referencePdfSha256 !== sha(referencePdfBytes) || payload.authoredSourceSha256 !== sha(authoredSourceBytes)) fail('content hash mismatch');
  if (typeof signatureBase64 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(signatureBase64)) fail('invalid detached signature');
  const signature = Buffer.from(signatureBase64, 'base64');
  if (signature.byteLength !== 64 || signature.toString('base64') !== signatureBase64) fail('invalid detached signature encoding');
  let key;
  try { key = createPublicKey(trust.publicKeyPem); } catch { fail('invalid pinned public key'); }
  if (key.asymmetricKeyType !== 'ed25519') fail('pinned key must be Ed25519');
  if (!verify(null, message, key, signature)) fail('signature verification failed');
  return Object.freeze({ verified: true, scope: 'caller-configured trust anchor', manufacturingApproved: false });
}
