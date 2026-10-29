// Development-only integrity preflight. Trust in the public-key pin is supplied by the caller.
import { createPublicKey, verify } from 'node:crypto'
import { types } from 'node:util'
import { parsePinnedPythonPackageManifest } from './factoryZipPdfPinnedDependencyManifest20261025_0854.mjs'

function optionsOnly(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error('UNSAFE_OPTIONS')
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const allowed = ['manifestBytes', 'pinnedSha256', 'signatureBytes', 'pinnedPublicKeySpkiDer']
  if (Reflect.ownKeys(descriptors).length !== allowed.length) throw Error('UNSAFE_OPTIONS')
  const out = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !allowed.includes(key) || !Object.hasOwn(descriptors[key], 'value')) throw Error('UNSAFE_OPTIONS')
    out[key] = descriptors[key].value
  }
  if (allowed.some(key => !Object.hasOwn(out, key))) throw Error('UNSAFE_OPTIONS')
  return out
}

function safeBytes(value, label, exactLength, maxLength) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error(`UNSAFE_${label}`)
  const proto = Object.getPrototypeOf(value)
  if (proto !== Buffer.prototype && proto !== Uint8Array.prototype) throw Error(`UNSAFE_${label}`)
  if (Object.hasOwn(value, 'buffer') || Object.hasOwn(value, 'byteOffset') || Object.hasOwn(value, 'byteLength')) throw Error(`UNSAFE_${label}`)
  const backing = value.buffer
  if (backing instanceof SharedArrayBuffer) throw Error(`UNSAFE_SHARED_${label}`)
  if (exactLength !== null && value.byteLength !== exactLength) throw Error(`INVALID_${label}`)
  if (value.byteLength === 0 || value.byteLength > maxLength) throw Error(`INVALID_${label}`)
  return value
}

export function preflightSignedPythonPackageManifest(options) {
  const o = optionsOnly(options)
  const manifestBytes = safeBytes(o.manifestBytes, 'MANIFEST_BYTES', null, 128 * 1024)
  const signatureBytes = safeBytes(o.signatureBytes, 'SIGNATURE', 64, 64)
  // Ed25519 SPKI DER is exactly 44 bytes (RFC 8410), without PEM ambiguity.
  const pinnedPublicKeySpkiDer = safeBytes(o.pinnedPublicKeySpkiDer, 'PUBLIC_KEY', 44, 44)
  const overlaps = (a, b) => a.buffer === b.buffer && a.byteOffset < b.byteOffset + b.byteLength && b.byteOffset < a.byteOffset + a.byteLength
  if (overlaps(manifestBytes, signatureBytes) || overlaps(manifestBytes, pinnedPublicKeySpkiDer) || overlaps(signatureBytes, pinnedPublicKeySpkiDer)) throw Error('SHARED_BACKING')

  // Snapshot input data before hashing and verifying. The existing parser enforces the
  // canonical manifest grammar and an independently supplied SHA-256 pin.
  const manifest = Buffer.from(manifestBytes)
  const signature = Buffer.from(signatureBytes)
  const der = Buffer.from(pinnedPublicKeySpkiDer)
  const packages = parsePinnedPythonPackageManifest({ manifestBytes: manifest, pinnedSha256: o.pinnedSha256 })
  let key
  try {
    key = createPublicKey({ key: der, format: 'der', type: 'spki' })
    if (key.asymmetricKeyType !== 'ed25519' || !key.export({ format: 'der', type: 'spki' }).equals(der)) throw Error('INVALID_PUBLIC_KEY')
  } catch { throw Error('INVALID_PUBLIC_KEY') }
  const domainPayload = Buffer.concat([Buffer.from('EXO2D-PY-PACKAGE-MANIFEST-V1\0', 'ascii'), manifest])
  if (!verify(null, domainPayload, key, signature)) throw Error('INVALID_SIGNATURE')
  return Object.freeze({ developmentOnly: true, signatureVerified: true, publisherAuthenticated: false, runtimeExecutionAuthorized: false, manufacturingApproved: false, packages: Object.freeze(packages) })
}
