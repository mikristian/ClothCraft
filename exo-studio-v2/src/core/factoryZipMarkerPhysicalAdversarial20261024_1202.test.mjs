import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryPackageManifestBrowser20261024_0053 as auditManifest } from './factoryPackageManifestBrowser20261024_0053.mjs'
import { auditFactoryZipMarkerPhysicalParity20261024_1202 as audit } from './factoryZipMarkerPhysicalParity20261024_1202.mjs'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const parse = bytes => JSON.parse(decoder.decode(bytes))

function fixture() {
  const project = createTeeTemplate()
  project.grading.sizes = [project.grading.baseSize]
  return { project, files: buildFactoryPackageFiles(project) }
}

function resign(files) {
  const manifest = parse(files['manifest.json'])
  const paths = Object.keys(files).filter(path => path !== 'manifest.json')
  manifest.files = [...paths, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(paths.map(path => [path, sha256Bytes(files[path])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

function markerPath(files, extension) {
  const found = Object.keys(files).find(path => path.startsWith('markers/') && path.endsWith(extension))
  assert.ok(found, `Missing marker ${extension} fixture`)
  return found
}

function tamper(mutator) {
  const { project, files: original } = fixture()
  const files = { ...original }
  mutator(files)
  resign(files)
  assert.equal(auditManifest(files, project).ok, true, 'forgery must survive fully rehashed manifest')
  const result = audit(files, project)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.ok, false, JSON.stringify(result))
  return result
}

test('genuine marker PDF and SVG accepted as development evidence only', () => {
  const { project, files } = fixture()
  const result = audit(files, project)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
})

test('altered PDF cut path after manifest rehash fails physical evidence audit', () => {
  tamper(files => {
    const path = markerPath(files, '.pdf')
    const original = decoder.decode(files[path])
    const changed = original.replace(/(\d+(?:\.\d+)? \d+(?:\.\d+)? m\n)/, '123.456 789.012 m\n')
    assert.notEqual(changed, original, 'PDF must expose a cut move')
    files[path] = encoder.encode(changed)
  })
})

test('PDF page tree count or page station forgery after rehash fails', () => {
  for (const change of [
    pdf => pdf.replace(/\/Count (\d+) >>/, (_, count) => `/Count ${Number(count) + 1} >>`),
    pdf => pdf.replace(/\/EXOEndCm ([\d.]+)/, '/EXOEndCm 99999'),
  ]) {
    tamper(files => {
      const path = markerPath(files, '.pdf')
      const source = decoder.decode(files[path])
      const changed = change(source)
      assert.notEqual(changed, source, 'PDF mutation must be effective')
      files[path] = encoder.encode(changed)
    })
  }
})

test('forged SVG marker height and viewBox after rehash fails', () => {
  tamper(files => {
    const path = markerPath(files, '.svg')
    const source = decoder.decode(files[path])
    const changed = source.replace(/height="([\d.]+)cm"/, (_, height) => `height="${Number(height) + 10}cm"`)
      .replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (_, width, height) => `viewBox="0 0 ${width} ${Number(height) + 10}"`)
    assert.notEqual(changed, source)
    files[path] = encoder.encode(changed)
  })
})

test('changed SVG cut vertex with intact header after rehash fails', () => {
  tamper(files => {
    const path = markerPath(files, '.svg')
    const source = decoder.decode(files[path])
    const changed = source.replace(/(<polygon\s+[^>]*points=")([\d.]+),([\d.]+)/, (_, prefix, x, y) =>
      `${prefix}${Number(x) + 0.5},${y}`)
    assert.notEqual(changed, source, 'Expected marker cut polygon')
    files[path] = encoder.encode(changed)
  })
})

test('caller input is unchanged and repeated audits return same verdict', () => {
  const { files, project } = fixture()
  const before = Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, sha256Bytes(bytes)]))
  const first = audit(files, project)
  const second = audit(files, project)
  assert.deepEqual(second, first)
  assert.deepEqual(Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, sha256Bytes(bytes)])), before)
})

test('trusted source mismatch fails despite valid self-consistent signed hashes', () => {
  const { files, project } = fixture()
  const trusted = structuredClone(project)
  trusted.markerSettings.fabricWidthCm += 7
  const result = audit(files, trusted)
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
})

