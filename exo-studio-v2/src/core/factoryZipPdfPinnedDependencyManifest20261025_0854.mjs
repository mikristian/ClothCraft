// Development only. The caller supplies and authenticates its own SHA-256 pin.
import { createHash, timingSafeEqual } from 'node:crypto'
import { types, TextDecoder } from 'node:util'
import { comparePythonPackageManifest } from './factoryZipPdfDependencyInventory20261025_0755.mjs'

const maxManifestBytes = 128 * 1024
const digestPattern = /^[0-9a-f]{64}$/
const pathPattern = /^(?!\.{1,2}$)[A-Za-z0-9_][A-Za-z0-9_.+-]{0,127}(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9_][A-Za-z0-9_.+-]{0,127})*$/
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

function ownOptions(value, allowed) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw Error('UNSAFE_OPTIONS')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const result = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !allowed.includes(key) || !Object.hasOwn(descriptors[key], 'value')) throw Error('UNSAFE_OPTIONS')
    result[key] = descriptors[key].value
  }
  return result
}

export function parsePinnedPythonPackageManifest(options) {
  const o = ownOptions(options, ['manifestBytes', 'pinnedSha256'])
  const bytes = o.manifestBytes
  if (!bytes || typeof bytes !== 'object' || types.isProxy(bytes) ||
      !(Buffer.isBuffer(bytes) ? Object.getPrototypeOf(bytes) === Buffer.prototype : Object.getPrototypeOf(bytes) === Uint8Array.prototype) ||
      Object.hasOwn(bytes, 'byteLength') || Object.hasOwn(bytes, 'buffer') || Object.hasOwn(bytes, 'byteOffset')) throw Error('UNSAFE_MANIFEST_BYTES')
  // Shared backing permits another thread to mutate bytes between digest and decode.
  if (bytes.buffer instanceof SharedArrayBuffer) throw Error('UNSAFE_SHARED_MANIFEST_BYTES')
  if (bytes.byteLength > maxManifestBytes) throw Error('MANIFEST_SIZE_LIMIT')
  if (typeof o.pinnedSha256 !== 'string' || !digestPattern.test(o.pinnedSha256)) throw Error('INVALID_PIN')
  const observed = createHash('sha256').update(bytes).digest()
  if (!timingSafeEqual(observed, Buffer.from(o.pinnedSha256, 'hex'))) throw Error('PIN_MISMATCH')
  let source
  try { source = utf8.decode(bytes) } catch { throw Error('INVALID_UTF8') }
  // A deliberately narrow JSON grammar: no escapes, whitespace, BOM or alternate spellings.
  // This makes the exact pinned bytes the unique representation for this path -> SHA256 map.
  if (!source.startsWith('{') || !source.endsWith('}')) throw Error('NONCANONICAL_MANIFEST')
  const result = Object.create(null)
  const middle = source.slice(1, -1)
  if (!middle) return result
  const entries = middle.split(',')
  let previous = null
  for (const entry of entries) {
    const matched = /^"([^"]+)":"([0-9a-f]{64})"$/.exec(entry)
    if (!matched || !pathPattern.test(matched[1]) || matched[1].split('/').some(part => ['__proto__', 'constructor', 'prototype'].includes(part))) throw Error('NONCANONICAL_MANIFEST')
    const path = matched[1]
    if (previous !== null && path <= previous) throw Error('NONCANONICAL_MANIFEST')
    result[path] = matched[2]
    previous = path
  }
  return result
}

export async function comparePinnedPythonPackageManifest(options) {
  const o = ownOptions(options, ['directory', 'manifestBytes', 'pinnedSha256', 'maxFiles', 'maxBytes', 'maxFileBytes', 'maxDepth'])
  const manifest = parsePinnedPythonPackageManifest({ manifestBytes: o.manifestBytes, pinnedSha256: o.pinnedSha256 })
  return comparePythonPackageManifest({ directory: o.directory, manifest, maxFiles: o.maxFiles, maxBytes: o.maxBytes, maxFileBytes: o.maxFileBytes, maxDepth: o.maxDepth })
}
