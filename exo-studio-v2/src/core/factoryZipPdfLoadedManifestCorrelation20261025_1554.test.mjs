import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { correlateLoadedImagesWithPinnedManifest as correlate } from './factoryZipPdfLoadedManifestCorrelation20261025_1554.mjs'

const fixture = realpathSync.native(mkdtempSync(join(tmpdir(), 'exo-correlation-')))
const root = join(fixture, 'pymupdf')
mkdirSync(join(root, 'lib'), { recursive: true })
const native = root + '/_extra.so'
const alternate = root + '/lib/mupdf.dylib'
writeFileSync(native, 'native test bytes')
writeFileSync(alternate, 'alternate native test bytes')
writeFileSync(root + '/__init__.py', 'synthetic module')
const digest = createHash('sha256').update('native test bytes').digest('hex')
const alternateDigest = createHash('sha256').update('alternate native test bytes').digest('hex')
const bytes = Buffer.from(JSON.stringify({ '_extra.so': digest, 'lib/mupdf.dylib': alternateDigest }))
const pin = createHash('sha256').update(bytes).digest('hex')
const observed = () => ({ observed: true, expectedPackageRoot: root, modulePath: root + '/__init__.py',
  packageImages: [native], allImages: ['/usr/lib/libSystem.B.dylib', native], imageCount: 2,
  untrustedTestPathInjection: true, manufacturingApproved: false,
  runtimeExecutionAuthorized: false, publisherAuthenticated: false, atomicLoaderBindingProven: false })
const input = () => ({ packageRoot: root, manifestBytes: bytes, pinnedSha256: pin,
  observed: observed(), expectedLoadedImages: [native] })
const reject = (mutate, pattern) => { const value = input(); mutate(value); assert.throws(() => correlate(value), pattern) }

test('safe pinned native image correlation remains development only', () => {
  const result = correlate(input())
  assert.equal(result.correlated, true)
  assert.equal(result.matchedPackageImageCount, 1)
  for (const key of ['manufacturingApproved', 'runtimeExecutionAuthorized', 'publisherAuthenticated', 'atomicLoaderBindingProven', 'observationAuthenticated']) assert.equal(result[key], false)
})
test('forged pin and observation provenance rejected', () => {
  reject(x => { x.pinnedSha256 = '0'.repeat(64) }, /PIN_MISMATCH/)
  reject(x => { x.observed.expectedPackageRoot = '/other/pymupdf' }, /UNSAFE_OBSERVATION/)
  reject(x => { x.observed.manufacturingApproved = true }, /UNSAFE_OBSERVATION/)
  reject(x => { x.observed.atomicLoaderBindingProven = true }, /UNSAFE_OBSERVATION/)
  reject(x => { x.observed.modulePath = '/elsewhere/forged.py' }, /EXTERNAL_MODULE_PATH/)
  reject(x => { x.observed.modulePath = root + '/missing.py' }, /INVALID_MODULE_PATH/)
})
test('missing and extra loaded images rejected', () => {
  reject(x => { x.expectedLoadedImages = [alternate] }, /LOADED_IMAGE_SET_MISMATCH/)
  reject(x => { x.expectedLoadedImages.push(alternate) }, /LOADED_IMAGE_SET_MISMATCH/)
  reject(x => { x.observed.packageImages = [alternate]; x.observed.allImages[1] = alternate }, /LOADED_IMAGE_SET_MISMATCH/)
  reject(x => { x.observed.packageImages.push(alternate); x.observed.allImages.push(alternate); x.observed.imageCount++ }, /LOADED_IMAGE_SET_MISMATCH/)
})
test('duplicate images and inconsistent observation rejected', () => {
  reject(x => { x.expectedLoadedImages.push(native) }, /DUPLICATE_EXPECTED_IMAGE/)
  reject(x => { x.observed.packageImages.push(native) }, /DUPLICATE_PACKAGE_IMAGE/)
  reject(x => { x.observed.allImages.push(native); x.observed.imageCount++ }, /DUPLICATE_OBSERVED_IMAGE/)
  reject(x => { x.observed.allImages.pop(); x.observed.imageCount-- }, /PACKAGE_IMAGE_NOT_OBSERVED/)
  reject(x => { x.observed.packageImages = [alternate] }, /PACKAGE_IMAGE_NOT_OBSERVED/)
  reject(x => { x.observed.allImages.push(alternate); x.observed.imageCount++ }, /OMITTED_PACKAGE_IMAGE/)
})
test('external, traversing, unsafe suffix and unpinned paths rejected', () => {
  for (const image of [root + '-evil/_extra.so', root + '/../evil.so', root + '//_extra.so', root + '/bad.py', root + '/unknown.so']) {
    reject(x => { x.observed.packageImages = [image]; x.observed.allImages[1] = image; x.expectedLoadedImages = [image] }, /EXTERNAL_PACKAGE_IMAGE|UNSAFE_ABSOLUTE_PATH|UNEXPECTED_NATIVE_SUFFIX|UNPINNED_PACKAGE_IMAGE/)
  }
  reject(x => { x.observed.allImages[0] = '/tmp/fitz/evil.so' }, /EXTERNAL_PACKAGE_IMAGE/)
})
test('native bytes must equal manifest digest', () => {
  const value = input()
  const changed = Buffer.from(JSON.stringify({ '_extra.so': '0'.repeat(64), 'lib/mupdf.dylib': alternateDigest }))
  value.manifestBytes = changed
  value.pinnedSha256 = createHash('sha256').update(changed).digest('hex')
  assert.throws(() => correlate(value), /DIGEST_MISMATCH/)
})
process.on('exit', () => rmSync(fixture, { recursive: true, force: true }))
test('unsafe option objects, getters and proxies rejected without invoking getters', () => {
  let reads = 0
  const getter = { get expectedLoadedImages() { reads++; return [native] } }
  reject(x => Object.defineProperty(x, 'expectedLoadedImages', Object.getOwnPropertyDescriptor(getter, 'expectedLoadedImages')), /UNSAFE_OBJECT/)
  assert.equal(reads, 0)
  assert.throws(() => correlate(new Proxy(input(), {})), /UNSAFE_OBJECT/)
  reject(x => { x.observed = new Proxy(x.observed, {}) }, /UNSAFE_OBJECT/)
  reject(x => { Object.defineProperty(x.observed, 'packageImages', { get() { reads++; return [native] } }) }, /UNSAFE_OBJECT/)
  assert.equal(reads, 0)
})
test('unsafe arrays, proxies, sparse indices and additional own keys rejected', () => {
  reject(x => { x.observed.packageImages = new Proxy([native], {}) }, /UNSAFE_IMAGE_ARRAY/)
  reject(x => { x.expectedLoadedImages = new Proxy([native], {}) }, /UNSAFE_IMAGE_ARRAY/)
  reject(x => { x.observed.allImages = ['/usr/lib/libSystem.B.dylib', , native]; x.observed.imageCount = 3 }, /UNSAFE_IMAGE_ARRAY/)
  reject(x => { x.expectedLoadedImages.meta = 'extra' }, /UNSAFE_IMAGE_ARRAY/)
  let reads = 0
  reject(x => { Object.defineProperty(x.expectedLoadedImages, '0', { get() { reads++; return native } }) }, /UNSAFE_IMAGE_ARRAY/)
  assert.equal(reads, 0)
})
