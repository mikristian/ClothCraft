import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { buildAccuMarkGuardedFactoryPackage20261023 } from './accumarkGuardedFactoryPackage20261023.js'
import { auditFactoryPackageManifestBrowser20261024_0053 } from './factoryPackageManifestBrowser20261024_0053.mjs'
import { auditFactoryZipCalibrationEvidence20261024_1052 } from './factoryZipCalibrationEvidence20261024_1052.mjs'
import { requireAccuMarkGuardedFactoryMarkerParity20261024 as requireParity } from './accumarkGuardedFactoryMarkerGate20261024.mjs'
import { sha256Bytes } from './sha256Bytes.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const project = createTeeTemplate()
project.grading.sizes = [project.grading.baseSize]
let original
const files = () => ({ ...(original ??= buildFactoryPackageFiles(project)) })

function rehash(map) {
  const manifest = JSON.parse(decoder.decode(map['manifest.json']))
  const paths = Object.keys(map).filter(path => path !== 'manifest.json')
  manifest.files = [...paths, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(paths.map(path => [path, sha256Bytes(map[path])]))
  map['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

function forge(extension, change) {
  const map = files()
  const path = Object.keys(map).find(name => name.startsWith('markers/') && name.endsWith(extension))
  assert.ok(path)
  const before = decoder.decode(map[path])
  const after = change(before)
  assert.notEqual(after, before, 'Test must actually forge archived geometry')
  map[path] = encoder.encode(after)
  rehash(map)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(map, project).ok, true)
  assert.equal(auditFactoryZipCalibrationEvidence20261024_1052(map, project).ok, true)
  return map
}

test('download package builder requires source-derived parity on the final six-size file map', () => {
  const live = createTeeTemplate()
  const before = structuredClone(live)
  const built = buildAccuMarkGuardedFactoryPackage20261023(live, { zip: true })
  assert.equal(built.ok, true, built.reason)
  assert.ok(built.zip instanceof Uint8Array)
  assert.deepEqual(requireParity(built.files, live), {
    ok: true, manufacturingApproved: false, physicalRegistrationVerified: false,
  })
  assert.equal(built.manufacturingApproved, false)
  assert.deepEqual(live, before)
})

test('a forged, rehashed SVG cutting vertex cannot pass the download geometry gate', () => {
  const map = forge('.svg', source => source.replace(
    /(<polygon\s+[^>]*points=")([\d.]+),/,
    (_, prefix, x) => `${prefix}${Number(x) + 0.75},`,
  ))
  assert.throws(() => requireParity(map, project), /Factory marker source-derived parity refused: MARKER_SVG_PARITY/)
})

test('a forged, rehashed PDF cutting command cannot pass the download geometry gate', () => {
  const map = forge('.pdf', source => source.replace(
    /(\d+(?:\.\d+)? \d+(?:\.\d+)? m\n)/,
    '123.456 789.012 m\n',
  ))
  assert.throws(() => requireParity(map, project), /Factory marker source-derived parity refused: MARKER_PDF_PARITY/)
})

test('a forged, rehashed PDF page station cannot pass the download geometry gate', () => {
  const map = forge('.pdf', source => source.replace(/\/EXOStartCm ([\d.]+)/, '/EXOStartCm 999'))
  assert.throws(() => requireParity(map, project), /Factory marker source-derived parity refused: MARKER_PDF_PARITY/)
})

test('trusted project mismatch and missing marker fail closed without granting factory approval', () => {
  const map = files()
  const changed = structuredClone(project)
  changed.markerSettings.fabricWidthCm = 175
  assert.throws(() => requireParity(map, changed), /Factory marker source-derived parity refused/)
  const path = Object.keys(map).find(name => name.startsWith('markers/') && name.endsWith('.svg'))
  delete map[path]
  assert.throws(() => requireParity(map, project), /Factory marker source-derived parity refused/)
})
