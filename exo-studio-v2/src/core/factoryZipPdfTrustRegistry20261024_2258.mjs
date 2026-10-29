// Development-only caller-pinned registry. Digest equality does not authenticate the caller or publisher.
import { createHash, createPublicKey } from 'node:crypto';

export const PDF_TRUST_REGISTRY_SCHEMA = 'exo.pdf-trust-registry.v1';
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/;
const HEX = /^[a-f0-9]{64}$/;
const MAX_BYTES = 128 * 1024;
const KEY_FIELDS = ['keyId', 'publicKeyPem', 'status', 'validFrom', 'validUntil', 'garmentId', 'revision', 'size', 'documentRole', 'units'];
const IDENTITY = ['garmentId', 'revision', 'size', 'documentRole', 'units'];
const fail = message => { throw new Error(`PDF trust registry: ${message}`); };

function exact(value, fields, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== fields.length ||
      fields.some(field => !Object.hasOwn(value, field)) ||
      Object.keys(value).some(field => !fields.includes(field) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, field), 'value'))) fail(`invalid ${name} fields`);
}

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) fail('invalid UTC timestamp');
  const millis = Date.parse(value);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== value) fail('invalid UTC timestamp');
  return millis;
}

// The bytes and SHA-256 pin must be provided separately from the PDF and its metadata.
// Return shape is accepted directly by verifyPdfReferenceProvenance({ trust }).
export function resolvePdfTrustRegistry({ registryBytes, pinnedSha256, asOf, identity } = {}) {
  if (!(registryBytes instanceof Uint8Array) || registryBytes.byteLength < 1 || registryBytes.byteLength > MAX_BYTES) fail('invalid registry bytes');
  if (typeof pinnedSha256 !== 'string' || !HEX.test(pinnedSha256)) fail('invalid caller pin');
  const snapshot = Buffer.from(registryBytes);
  const digest = createHash('sha256').update(snapshot).digest('hex');
  if (digest !== pinnedSha256) fail('registry digest mismatch');
  const at = timestamp(asOf);
  exact(identity, IDENTITY, 'caller identity');
  identity = Object.fromEntries(IDENTITY.map(field => [field, identity[field]]));
  for (const field of IDENTITY) {
    if (field === 'units' ? identity[field] !== 'cm' : typeof identity[field] !== 'string' || !IDENTIFIER.test(identity[field])) fail(`invalid caller ${field}`);
  }
  let registry;
  try { registry = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(snapshot)); }
  catch { fail('invalid registry JSON'); }
  exact(registry, ['schemaVersion', 'keys'], 'registry');
  if (registry.schemaVersion !== PDF_TRUST_REGISTRY_SCHEMA || !Array.isArray(registry.keys) || registry.keys.length < 1 || registry.keys.length > 32) fail('invalid registry schema or key count');
  const seen = new Set();
  let matches = [];
  for (const key of registry.keys) {
    exact(key, KEY_FIELDS, 'key record');
    for (const field of ['keyId', ...IDENTITY.filter(f => f !== 'units')]) {
      if (typeof key[field] !== 'string' || !IDENTIFIER.test(key[field])) fail(`invalid ${field}`);
    }
    if (seen.has(key.keyId)) fail('ambiguous duplicate keyId');
    seen.add(key.keyId);
    if (key.units !== 'cm' || !['active', 'revoked'].includes(key.status)) fail('invalid key units or status');
    const from = timestamp(key.validFrom);
    const until = timestamp(key.validUntil);
    if (from >= until) fail('invalid key validity interval');
    if (typeof key.publicKeyPem !== 'string' || key.publicKeyPem.length > 4096 || !key.publicKeyPem.includes('BEGIN PUBLIC KEY')) fail('invalid PEM');
    let publicKey;
    try { publicKey = createPublicKey(key.publicKeyPem); } catch { fail('invalid PEM'); }
    if (publicKey.asymmetricKeyType !== 'ed25519' || publicKey.type !== 'public') fail('key must be Ed25519 public key');
    if (IDENTITY.every(field => key[field] === identity[field])) matches.push({ key, from, until });
  }
  if (matches.length !== 1) fail(matches.length ? 'ambiguous identity matches' : 'no matching key');
  const { key, from, until } = matches[0];
  if (key.status !== 'active') fail('key revoked');
  if (at < from) fail('key not yet valid');
  if (at >= until) fail('key expired');
  return Object.freeze({ publicKeyPem: key.publicKeyPem, keyId: key.keyId, ...Object.fromEntries(IDENTITY.map(field => [field, key[field]])) });
}
