import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryPackageManifestBrowser20261024_0053 } from './factoryPackageManifestBrowser20261024_0053.mjs'
import { auditFactoryZipCalibrationEvidence20261024_1052 as audit } from './factoryZipCalibrationEvidence20261024_1052.mjs'

const encoder = new TextEncoder(), decoder = new TextDecoder()
let base
const files = () => Object.fromEntries(Object.entries(base ??= buildFactoryPackageFiles(createTeeTemplate())).map(([key, value]) => [key, value.slice()]))
const codes = result => result.diagnostics.map(issue => issue.code)
function rehash(map) {
  const manifest = JSON.parse(decoder.decode(map['manifest.json']))
  const keys = Object.keys(map).filter(key => key !== 'manifest.json')
  manifest.files = [...keys, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(keys.map(key => [key, sha256Bytes(map[key])]))
  map['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}
const narrowProject = () => {
  const project = createTeeTemplate()
  project.grading.sizes = [project.grading.baseSize]
  project.markerSettings.fabricWidthCm = 10
  project.markerSettings.gapCm = 0.25
  for (const piece of project.pieces) {
    for (const point of piece.points) { point.x *= 0.1; point.y *= 0.1 }
    for (const curve of Object.values(piece.curves || {})) {
      if ('cx' in curve) curve.cx *= 0.1
      if ('cy' in curve) curve.cy *= 0.1
    }
    piece.seamAllowance *= 0.1
    for (const edge of Object.keys(piece.edgeSeamAllowances || {})) piece.edgeSeamAllowances[edge] *= 0.1
    for (const notch of piece.notches || []) notch.depthCm *= 0.1
  }
  return project
}

test('genuine six-size Foundation Tee passes without mutation or manufacturing approval', () => {
  const map = files(), original = structuredClone(map)
  assert.deepEqual(audit(map), { ok: true, diagnostics: [], manufacturingApproved: false })
  assert.deepEqual(map, original)
})

test('genuine narrow-marker separate-sheet export passes without mutation', () => {
  const project = narrowProject(), before = structuredClone(project)
  const map = buildFactoryPackageFiles(project), original = structuredClone(map)
  const rows = JSON.parse(decoder.decode(map['marker-plot-geometry-qa.json'])).rows
  assert.deepEqual(rows.map(row => row.calibrationMode), ['separate-sheet'])
  assert.equal(Object.keys(map).filter(key => key.startsWith('print-calibration/')).length, 2)
  assert.deepEqual(audit(map, project), { ok: true, diagnostics: [], manufacturingApproved: false })
  assert.deepEqual(map, original)
  assert.deepEqual(project, before)
})

test('project without markerSettings uses factory default 150 cm width', () => {
  const project = createTeeTemplate()
  delete project.markerSettings
  const map = buildFactoryPackageFiles(project)
  assert.equal(audit(map, project).ok, true, JSON.stringify(audit(map, project).diagnostics))
})

test('forged calibration QA mode remains rejected after fully rehashing manifest', () => {
  const map = files()
  const qa = JSON.parse(decoder.decode(map['marker-plot-geometry-qa.json']))
  assert.equal(qa.rows[0].calibrationMode, 'separate-sheet')
  qa.rows[0].calibrationMode = 'on-page'
  map['marker-plot-geometry-qa.json'] = encoder.encode(JSON.stringify(qa))
  rehash(map)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(map).ok, true)
  assert(codes(audit(map)).includes('CALIBRATION_MODE_MISMATCH'))
})

test('rehashing a tampered genuine calibration sheet cannot restore evidence', () => {
  const map = buildFactoryPackageFiles(narrowProject())
  const path = Object.keys(map).find(key => key.startsWith('print-calibration/') && key.endsWith('.svg'))
  assert(path)
  map[path] = encoder.encode(decoder.decode(map[path]).replace('x2="11" y2="11"', 'x2="10" y2="11"'))
  rehash(map)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(map).ok, true)
  assert(codes(audit(map)).includes('INVALID_CALIBRATION_SHEET'))
})

test('forged narrow SVG width and forged on-page QA cannot evade authored fabric width', () => {
  const project = narrowProject()
  const map = buildFactoryPackageFiles(project)
  const markerPath = Object.keys(map).find(key => key.startsWith('markers/') && key.endsWith('.svg'))
  assert(markerPath)
  const svg = decoder.decode(map[markerPath])
  assert.match(svg, /width="10cm"/)
  map[markerPath] = encoder.encode(svg.replace('width="10cm"', 'width="12cm"').replace(/viewBox="0 0 10 ([^"]+)"/, 'viewBox="0 0 12 $1"'))
  const qa = JSON.parse(decoder.decode(map['marker-plot-geometry-qa.json']))
  qa.rows[0].calibrationMode = 'on-page'
  map['marker-plot-geometry-qa.json'] = encoder.encode(JSON.stringify(qa))
  for (const path of Object.keys(map)) if (path.startsWith('print-calibration/')) delete map[path]
  rehash(map)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(map).ok, true)
  const result = audit(map, project)
  assert.equal(result.ok, false)
  assert(codes(result).includes('CALIBRATION_MARKER_WIDTH_MISMATCH'))
})

test('unexpected separate sheet and unsupported marker dimensions reject after rehash', () => {
  const extra = files()
  extra['print-calibration/unexpected.svg'] = encoder.encode('unexpected')
  rehash(extra)
  assert(codes(audit(extra)).includes('UNEXPECTED_CALIBRATION_SHEET'))
  const malformed = files()
  const path = Object.keys(malformed).find(key => key.startsWith('markers/') && key.endsWith('.svg'))
  malformed[path] = encoder.encode(decoder.decode(malformed[path]).replace(/width="[^"]+cm"/, 'width="NaNcm"'))
  rehash(malformed)
  assert(codes(audit(malformed)).includes('UNSAFE_CALIBRATION_EVIDENCE'))
})

test('accessor traps are never invoked and malformed bytes fail closed', () => {
  const map = files()
  let invoked = 0
  Object.defineProperty(map, 'garment-source.json', { enumerable: true, get() { invoked++; throw Error('trap') } })
  const result = audit(map)
  assert.equal(invoked, 0)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  const broken = files()
  broken['marker-plot-geometry-qa.json'] = new Uint8Array([0xff, 0xfe])
  assert.equal(audit(broken).ok, false)
})
