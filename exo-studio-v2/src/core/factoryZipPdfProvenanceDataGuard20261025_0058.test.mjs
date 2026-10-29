import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { canonicalPdfReferenceProvenance, PDF_REFERENCE_PROVENANCE_SCHEMA } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';
import { verifyGuardedPdfReferenceProvenance } from './factoryZipPdfProvenanceDataGuard20261025_0058.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const referencePdfBytes = Buffer.from('%PDF-1.7\nreference');
const authoredSourceBytes = Uint8Array.from(Buffer.from('source text'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const trust = {
  publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }), keyId: 'key-1',
  garmentId: 'garment-1', revision: 'r1', size: 'M', units: 'cm', documentRole: 'factory-reference',
};
const payload = {
  schemaVersion: PDF_REFERENCE_PROVENANCE_SCHEMA, keyId: trust.keyId,
  referencePdfSha256: digest(referencePdfBytes), authoredSourceSha256: digest(authoredSourceBytes),
  garmentId: trust.garmentId, revision: trust.revision, size: trust.size,
  units: trust.units, documentRole: trust.documentRole,
};
const signatureBase64 = sign(null, canonicalPdfReferenceProvenance(payload), privateKey).toString('base64');
const valid = () => ({ referencePdfBytes, authoredSourceBytes, payload, signatureBase64, trust });
const rejection = candidate => assert.throws(() => verifyGuardedPdfReferenceProvenance(candidate), /PDF provenance data guard:|PDF reference provenance:/);

test('valid real Ed25519 signature remains development-only and unapproved', () => {
  assert.deepEqual(verifyGuardedPdfReferenceProvenance(valid()), {
    verified: true, scope: 'caller-configured trust anchor', manufacturingApproved: false,
  });
});

test('wrong signature and changed bytes fail closed', () => {
  rejection({ ...valid(), signatureBase64: Buffer.alloc(64).toString('base64') });
  rejection({ ...valid(), referencePdfBytes: Buffer.from('changed') });
  rejection({ ...valid(), authoredSourceBytes: Buffer.from('changed') });
  const edited = Buffer.from(referencePdfBytes);
  edited[0] ^= 1;
  rejection({ ...valid(), referencePdfBytes: edited });
});

test('getters on options, payload and trust are never invoked', () => {
  for (const location of ['options', 'payload', 'trust']) {
    let calls = 0;
    const candidate = valid();
    const target = location === 'options' ? candidate : { ...candidate[location] };
    const field = location === 'options' ? 'payload' : 'keyId';
    Object.defineProperty(target, field, { enumerable: true, configurable: true, get() { calls++; throw Error('getter ran'); } });
    if (location !== 'options') candidate[location] = target;
    rejection(candidate);
    assert.equal(calls, 0, location);
  }
});

test('Proxy traps are never invoked on options, payload, trust, or byte arrays', () => {
  for (const field of ['options', 'payload', 'trust', 'referencePdfBytes', 'authoredSourceBytes']) {
    let traps = 0;
    const target = field === 'options' ? valid() : valid()[field];
    const proxy = new Proxy(target, {
      get() { traps++; throw Error('proxy get'); },
      ownKeys() { traps++; throw Error('proxy ownKeys'); },
      getPrototypeOf() { traps++; throw Error('proxy prototype'); },
      getOwnPropertyDescriptor() { traps++; throw Error('proxy descriptor'); },
    });
    rejection(field === 'options' ? proxy : { ...valid(), [field]: proxy });
    assert.equal(traps, 0, field);
  }
});

test('rejects inherited, class, symbol-keyed and unexpected records', () => {
  class TrustRecord { constructor() { Object.assign(this, trust); } }
  rejection({ ...valid(), trust: new TrustRecord() });
  rejection({ ...valid(), payload: Object.assign(Object.create({ inherited: 1 }), payload) });
  rejection({ ...valid(), trust: { ...trust, [Symbol('hidden')]: 1 } });
  rejection({ ...valid(), payload: { ...payload, unexpected: 'x' } });
  rejection({ ...valid(), unexpected: 'x' });
  rejection({ ...valid(), payload: { ...payload, keyId: undefined } });
  rejection({ ...valid(), trust: { ...trust, manufacturingApproved: false } });
});

test('rejects shadowed byte objects and oversized input', () => {
  rejection({ ...valid(), referencePdfBytes: { ...referencePdfBytes } });
  rejection({ ...valid(), authoredSourceBytes: new Uint8Array(32 * 1024 * 1024 + 1) });
  const subclass = class extends Uint8Array {};
  rejection({ ...valid(), authoredSourceBytes: new subclass([1, 2]) });
});

test('byte snapshot avoids constructor and Symbol.species accessors', () => {
  for (const field of ['referencePdfBytes', 'authoredSourceBytes']) {
    for (const sourceKind of ['constructor', 'species']) {
      let constructorHits = 0;
      let speciesHits = 0;
      const source = Uint8Array.from(valid()[field]);
      const hostileConstructor = {};
      Object.defineProperty(hostileConstructor, Symbol.species, {
        get() { speciesHits++; throw Error('species getter executed'); },
      });
      Object.defineProperty(source, 'constructor', {
        get() {
          constructorHits++;
          if (sourceKind === 'constructor') throw Error('constructor getter executed');
          return hostileConstructor;
        },
      });
      const result = verifyGuardedPdfReferenceProvenance({ ...valid(), [field]: source });
      assert.equal(result.verified, true);
      assert.equal(result.manufacturingApproved, false);
      assert.equal(constructorHits, 0, `${field}: constructor getter`);
      assert.equal(speciesHits, 0, `${field}: species getter`);
    }
  }
});
