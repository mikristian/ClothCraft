// Development-only canonical byte gate. Caller SHA pin is not publisher authentication.
import { resolvePdfTrustRegistry } from './factoryZipPdfTrustRegistry20261024_2258.mjs';

const MAX_BYTES = 128 * 1024;
const REGISTRY_FIELDS = ['schemaVersion', 'keys'];
const KEY_FIELDS = ['keyId', 'publicKeyPem', 'status', 'validFrom', 'validUntil', 'garmentId', 'revision', 'size', 'documentRole', 'units'];
const fail = reason => { throw new Error(`PDF trust registry canonical: ${reason}`); };

function orderedFields(value, expected) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((field, index) => Object.keys(value)[index] === field);
}

// JSON round-trip equality enforces byte-level canonical spelling and rejects duplicate
// properties, escaped aliases, whitespace, byte order marks and reordered members.
export function resolveCanonicalPdfTrustRegistry({ registryBytes, ...rest } = {}) {
  if (!(registryBytes instanceof Uint8Array) || registryBytes.byteLength < 1 || registryBytes.byteLength > MAX_BYTES) fail('invalid registry bytes');
  const snapshot = Buffer.from(registryBytes);
  let source;
  let parsed;
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(snapshot);
    parsed = JSON.parse(source);
  } catch { fail('invalid UTF-8 or JSON'); }
  if (!orderedFields(parsed, REGISTRY_FIELDS) || !Array.isArray(parsed.keys) ||
      parsed.keys.some(key => !orderedFields(key, KEY_FIELDS))) fail('invalid canonical structure or field order');
  if (source !== JSON.stringify(parsed) || !snapshot.equals(Buffer.from(source, 'utf8'))) fail('noncanonical JSON bytes');
  return resolvePdfTrustRegistry({ ...rest, registryBytes: snapshot });
}
