// Development-only observation. Caller owns trust in the supplied digest.
// These sequential observations do not guarantee atomic binding by dyld.
import { types } from 'node:util'
import { comparePinnedPythonPackageManifest } from './factoryZipPdfPinnedDependencyManifest20261025_0854.mjs'
import { auditObservedNativeDependencyClosure } from './factoryZipPdfObservedNativeClosure20261025_1100.mjs'

const allowed = ['packageRoot', 'entryPath', 'manifestBytes', 'pinnedSha256', 'maxFiles', 'maxBytes', 'maxFileBytes', 'maxDepth']

function ownOptions(options) {
  if (!options || typeof options !== 'object' || types.isProxy(options)) throw Error('UNSAFE_OPTIONS')
  const proto = Object.getPrototypeOf(options)
  if (proto !== Object.prototype && proto !== null) throw Error('UNSAFE_OPTIONS')
  const descriptors = Object.getOwnPropertyDescriptors(options)
  const copy = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !allowed.includes(key) || !Object.hasOwn(descriptors[key], 'value')) throw Error('UNSAFE_OPTIONS')
    copy[key] = descriptors[key].value
  }
  if (typeof copy.packageRoot !== 'string' || typeof copy.entryPath !== 'string') throw Error('INVALID_PATH')
  return copy
}

export async function auditPinnedObservedNativeClosure(options) {
  const o = ownOptions(options)
  // Copy ordinary bytes so later caller mutation cannot silently change the pin input.
  const bytes = o.manifestBytes
  if (!bytes || typeof bytes !== 'object' || types.isProxy(bytes) ||
      !(Buffer.isBuffer(bytes) ? Object.getPrototypeOf(bytes) === Buffer.prototype : Object.getPrototypeOf(bytes) === Uint8Array.prototype) ||
      Object.hasOwn(bytes, 'buffer') || Object.hasOwn(bytes, 'byteLength') || Object.hasOwn(bytes, 'byteOffset')) throw Error('UNSAFE_MANIFEST_BYTES')
  if (bytes.buffer instanceof SharedArrayBuffer) throw Error('UNSAFE_SHARED_MANIFEST_BYTES')
  if (bytes.byteLength > 128 * 1024) throw Error('MANIFEST_SIZE_LIMIT')
  const manifestBytes = Buffer.from(bytes)
  const compareOptions = {
    directory: o.packageRoot, manifestBytes, pinnedSha256: o.pinnedSha256,
    maxFiles: o.maxFiles, maxBytes: o.maxBytes, maxFileBytes: o.maxFileBytes, maxDepth: o.maxDepth
  }
  const before = await comparePinnedPythonPackageManifest(compareOptions)
  if (before.ok !== true) throw Error('PINNED_MANIFEST_MISMATCH_BEFORE')
  const closure = auditObservedNativeDependencyClosure({ packageRoot: o.packageRoot, entryPath: o.entryPath })
  if (closure.ok !== true || !Number.isSafeInteger(closure.inspectedNodes) || closure.inspectedNodes < 1) throw Error('NATIVE_CLOSURE_FAILED')
  const after = await comparePinnedPythonPackageManifest(compareOptions)
  if (after.ok !== true) throw Error('PINNED_MANIFEST_MISMATCH_AFTER')
  return Object.freeze({ ok: true, inspectedNodes: closure.inspectedNodes,
    osDependencies: Object.freeze([...closure.osDependencies]), manufacturingApproved: false })
}
