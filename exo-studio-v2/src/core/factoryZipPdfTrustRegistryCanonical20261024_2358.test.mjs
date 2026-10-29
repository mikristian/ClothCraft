import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { resolveCanonicalPdfTrustRegistry } from './factoryZipPdfTrustRegistryCanonical20261024_2358.mjs';

const { publicKey } = generateKeyPairSync('ed25519');
const identity = { garmentId: 'g1', revision: 'r1', size: 'M', documentRole: 'reference-pattern', units: 'cm' };
const key = { keyId: 'key1', publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }), status: 'active', validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2027-01-01T00:00:00.000Z', ...identity };
const registry = { schemaVersion: 'exo.pdf-trust-registry.v1', keys: [key] };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (bytes, overrides = {}) => resolveCanonicalPdfTrustRegistry({ registryBytes: bytes, pinnedSha256: sha(bytes), asOf: '2026-10-24T00:00:00.000Z', identity, ...overrides });
const bytes = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));

test('accepts canonical pinned Ed25519 registry and retains frozen trust shape', () => {
  const trust = check(bytes(registry));
  assert.equal(trust.keyId, 'key1');
  assert.equal(trust.publicKeyPem, key.publicKeyPem);
  assert.equal(Object.isFrozen(trust), true);
  assert.equal(Object.hasOwn(trust, 'manufacturingApproved'), false);
});

test('rejects duplicated status or keyId JSON property', () => {
  const canonical = JSON.stringify(registry);
  assert.throws(() => check(bytes(canonical.replace('"schemaVersion":"exo.pdf-trust-registry.v1"', '"schemaVersion":"exo.pdf-trust-registry.v1","schemaVersion":"exo.pdf-trust-registry.v1"'))), /canonical/);
  assert.throws(() => check(bytes(canonical.replace('"status":"active"', '"status":"active","status":"revoked"'))), /canonical/);
  assert.throws(() => check(bytes(canonical.replace('"keyId":"key1"', '"keyId":"key1","keyId":"key2"'))), /canonical/);
});

test('rejects aliases, whitespace, member order and alternate string escaping', () => {
  const canonical = JSON.stringify(registry);
  for (const variant of [
    canonical.replace('"status"', '"st\\u0061tus"'),
    canonical.replace('"key1"', '"\\u006bey1"'),
    canonical.replace(',', ', '),
    JSON.stringify({ keys: [key], schemaVersion: registry.schemaVersion }),
    JSON.stringify({ ...registry, keys: [{ status: key.status, ...key }] }),
    canonical.replace('"key1"', '"key\\/1"')
  ]) assert.throws(() => check(bytes(variant)), /canonical/);
});

test('rejects malformed, BOM, invalid UTF8, and excessive input', () => {
  for (const variant of [bytes('{'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes(registry)]), Buffer.from([0xff]), Buffer.alloc(128 * 1024 + 1)]) {
    assert.throws(() => check(variant), /canonical/);
  }
});

test('preserves caller SHA pin, key status, time and identity checks', () => {
  assert.throws(() => check(bytes(registry), { pinnedSha256: '0'.repeat(64) }), /digest mismatch/);
  assert.throws(() => check(bytes({ ...registry, keys: [{ ...key, status: 'revoked' }] })), /revoked/);
  assert.throws(() => check(bytes(registry), { asOf: '2027-01-01T00:00:00.000Z' }), /expired/);
  assert.throws(() => check(bytes(registry), { identity: { ...identity, revision: 'r2' } }), /no matching key/);
});
