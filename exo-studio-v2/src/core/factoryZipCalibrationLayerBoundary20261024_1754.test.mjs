import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryPackageManifestBrowser20261024_0053 as auditManifest } from './factoryPackageManifestBrowser20261024_0053.mjs'
import { auditFactoryZipCalibrationEvidence20261024_1052 as auditCalibration } from './factoryZipCalibrationEvidence20261024_1052.mjs'
import { auditFactoryZipMarkerPhysicalParity20261024_1202 as auditSourceParity } from './factoryZipMarkerPhysicalParity20261024_1202.mjs'

// Regression for the intentional trust boundary: the calibration-only audit
// validates ruler/sheet inventory, NOT cutting geometry or PDF registration.
// Never treat its `ok` result as a manufacturing or cutting-room approval.
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const project = createTeeTemplate()
project.grading.sizes = [project.grading.baseSize]
let original
const freshFiles = () => ({ ...(original ??= buildFactoryPackageFiles(project)) })

function rehashManifest(files) {
  const manifest = JSON.parse(decoder.decode(files['manifest.json']))
  const paths = Object.keys(files).filter(path => path !== 'manifest.json')
  manifest.files = [...paths, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(paths.map(path => [path, sha256Bytes(files[path])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

function mutateMarker(extension, mutate) {
  const files = freshFiles()
  const path = Object.keys(files).find(path => path.startsWith('markers/') && path.endsWith(extension))
  assert.ok(path, `Fixture missing marker ${extension}`)
  const source = decoder.decode(files[path])
  const forged = mutate(source)
  assert.notEqual(forged, source, 'Adversarial mutation must alter the archived bytes')
  files[path] = encoder.encode(forged)
  rehashManifest(files)
  assert.equal(auditManifest(files, project).ok, true, 'Forged artifact must pass rehashed manifest audit')
  return files
}

function assertLayerBoundary(files, expectedCode) {
  const calibration = auditCalibration(files, project)
  assert.equal(calibration.ok, true, JSON.stringify(calibration.diagnostics))
  assert.equal(calibration.manufacturingApproved, false)
  const sourceParity = auditSourceParity(files, project)
  assert.equal(sourceParity.ok, false, 'Source-derived geometry gate must reject the forgery')
  assert.ok(sourceParity.diagnostics.some(issue => issue.code === expectedCode),
    JSON.stringify(sourceParity.diagnostics))
  assert.equal(sourceParity.manufacturingApproved, false)
  assert.equal(sourceParity.physicalRegistrationVerified, false)
}

test('genuine factory archive passes both digital evidence audits without physical approval', () => {
  const files = freshFiles()
  const calibration = auditCalibration(files, project)
  const parity = auditSourceParity(files, project)
  assert.equal(calibration.ok, true, JSON.stringify(calibration.diagnostics))
  assert.equal(parity.ok, true, JSON.stringify(parity.diagnostics))
  assert.equal(calibration.manufacturingApproved, false)
  assert.equal(parity.manufacturingApproved, false)
  assert.equal(parity.physicalRegistrationVerified, false)
})

test('rehashed SVG cutting vertex can pass sheet-only audit but not source-derived geometry parity', () => {
  const files = mutateMarker('.svg', source => source.replace(
    /(<polygon\s+[^>]*points=")([\d.]+),/,
    (_, prefix, x) => `${prefix}${Number(x) + 0.75},`,
  ))
  assertLayerBoundary(files, 'MARKER_SVG_PARITY')
})

test('rehashed PDF cutting command can pass sheet-only audit but not source-derived PDF parity', () => {
  const files = mutateMarker('.pdf', source => source.replace(
    /(\d+(?:\.\d+)? \d+(?:\.\d+)? m\n)/,
    '123.456 789.012 m\n',
  ))
  assertLayerBoundary(files, 'MARKER_PDF_PARITY')
})

test('rehashed PDF page station can pass sheet-only audit but not source-derived PDF parity', () => {
  const files = mutateMarker('.pdf', source => source.replace(
    /\/EXOStartCm ([\d.]+)/,
    '/EXOStartCm 999',
  ))
  assertLayerBoundary(files, 'MARKER_PDF_PARITY')
})
