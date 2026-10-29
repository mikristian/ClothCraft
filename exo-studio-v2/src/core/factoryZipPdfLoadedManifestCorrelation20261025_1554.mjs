// Development-only correlation of untrusted dyld observations with caller-supplied pins.
import { posix } from 'node:path'
import { lstatSync, realpathSync } from 'node:fs'
import { types } from 'node:util'
import { parsePinnedPythonPackageManifest } from './factoryZipPdfPinnedDependencyManifest20261025_0854.mjs'
import { auditNativeFileIdentity } from './factoryZipPdfNativeFileIdentity20261025_1300.mjs'

function fail(code) { throw Error(code) }
function record(value, keys) {
  if (!value || typeof value !== 'object' || types.isProxy(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('UNSAFE_OBJECT')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const result = Object.create(null)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== 'string' || !keys.includes(key) || !Object.hasOwn(descriptors[key], 'value')) fail('UNSAFE_OBJECT')
    result[key] = descriptors[key].value
  }
  return result
}
function array(value) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      !value.length || value.length > 4096) fail('UNSAFE_IMAGE_ARRAY')
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) fail('UNSAFE_IMAGE_ARRAY')
  const result = []
  for (let index = 0; index < value.length; index++) {
    const item = descriptors[String(index)]
    if (!item || !Object.hasOwn(item, 'value') || typeof item.value !== 'string') fail('UNSAFE_IMAGE_ARRAY')
    result.push(item.value)
  }
  return result
}
function absolute(value, root = false) {
  if (typeof value !== 'string' || value.length > 4096 || !value.startsWith('/') ||
      value === '/' || value.endsWith('/') || value.includes('//') ||
      /[\\\x00-\x1f\x7f]/.test(value) ||
      value.split('/').some(segment => segment === '.' || segment === '..')) fail('UNSAFE_ABSOLUTE_PATH')
  if (root && value.length > 2048) fail('UNSAFE_PACKAGE_ROOT')
  return value
}
function relative(image, root) {
  if (!image.startsWith(root + '/')) fail('EXTERNAL_PACKAGE_IMAGE')
  const name = image.slice(root.length + 1)
  if (!/\.(so|dylib)$/.test(name)) fail('UNEXPECTED_NATIVE_SUFFIX')
  return name
}
function exactSet(values, code) {
  const set = new Set(values)
  if (set.size !== values.length) fail(code)
  return set
}

export function correlateLoadedImagesWithPinnedManifest(options) {
  const o = record(options, ['packageRoot', 'manifestBytes', 'pinnedSha256', 'observed', 'expectedLoadedImages'])
  const root = absolute(o.packageRoot, true)
  if (posix.basename(root) !== 'pymupdf') fail('EXPECTED_PYMUPDF_ROOT')
  const observation = record(o.observed, [
    'observed', 'expectedPackageRoot', 'modulePath', 'packageImages', 'allImages', 'imageCount',
    'untrustedTestPathInjection', 'manufacturingApproved', 'runtimeExecutionAuthorized',
    'publisherAuthenticated', 'atomicLoaderBindingProven'
  ])
  if (observation.observed !== true || observation.expectedPackageRoot !== root ||
      observation.untrustedTestPathInjection !== true ||
      observation.manufacturingApproved !== false || observation.runtimeExecutionAuthorized !== false ||
      observation.publisherAuthenticated !== false || observation.atomicLoaderBindingProven !== false) fail('UNSAFE_OBSERVATION')
  const manifest = parsePinnedPythonPackageManifest({ manifestBytes: o.manifestBytes, pinnedSha256: o.pinnedSha256 })
  const packageImages = array(observation.packageImages).map(image => absolute(image))
  const allImages = array(observation.allImages).map(image => absolute(image))
  const expectedImages = array(o.expectedLoadedImages).map(image => absolute(image))
  absolute(observation.modulePath)
  const shim = posix.join(posix.dirname(root), 'fitz')
  if (!observation.modulePath.startsWith(root + '/') &&
      !observation.modulePath.startsWith(shim + '/')) fail('EXTERNAL_MODULE_PATH')
  let current = '/'
  for (const part of observation.modulePath.slice(1).split('/')) {
    current = posix.join(current, part)
    let info
    try { info = lstatSync(current) } catch { fail('INVALID_MODULE_PATH') }
    if (info.isSymbolicLink() || (current === observation.modulePath ? !info.isFile() : !info.isDirectory())) fail('INVALID_MODULE_PATH')
  }
  if (realpathSync.native(observation.modulePath) !== observation.modulePath) fail('INVALID_MODULE_PATH')
  if (typeof observation.imageCount !== 'number' || !Number.isSafeInteger(observation.imageCount) ||
      observation.imageCount !== allImages.length) fail('IMAGE_COUNT_MISMATCH')
  const packageSet = exactSet(packageImages, 'DUPLICATE_PACKAGE_IMAGE')
  const allSet = exactSet(allImages, 'DUPLICATE_OBSERVED_IMAGE')
  const expectedSet = exactSet(expectedImages, 'DUPLICATE_EXPECTED_IMAGE')
  for (const image of packageImages) {
    const path = relative(image, root)
    if (!Object.hasOwn(manifest, path)) fail('UNPINNED_PACKAGE_IMAGE')
    if (!allSet.has(image)) fail('PACKAGE_IMAGE_NOT_OBSERVED')
  }
  for (const image of allImages) {
    if (image.startsWith(root + '/') && !packageSet.has(image)) fail('OMITTED_PACKAGE_IMAGE')
    if (!image.startsWith(root + '/') && /\/(?:fitz|pymupdf)\//i.test(image)) fail('EXTERNAL_PACKAGE_IMAGE')
  }
  if (packageSet.size !== expectedSet.size || [...packageSet].some(image => !expectedSet.has(image))) fail('LOADED_IMAGE_SET_MISMATCH')
  for (const image of expectedImages) relative(image, root)
  // Native bytes on disk are checked after observation. This cannot attest to loaded bytes.
  if (packageImages.length > 32) fail('IMAGE_AUDIT_LIMIT')
  for (const image of packageImages) {
    auditNativeFileIdentity({ packageRoot: root, entryPath: image,
      expectedSha256: manifest[relative(image, root)] })
  }
  return Object.freeze({ correlated: true, packageRoot: root, matchedPackageImageCount: packageImages.length,
    observedImageCount: allImages.length, developmentOnly: true, observationAuthenticated: false,
    manufacturingApproved: false, runtimeExecutionAuthorized: false,
    publisherAuthenticated: false, atomicLoaderBindingProven: false })
}
