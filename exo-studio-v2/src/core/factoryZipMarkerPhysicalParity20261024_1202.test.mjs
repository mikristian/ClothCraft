import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryZipMarkerPhysicalParity20261024_1202 as audit } from './factoryZipMarkerPhysicalParity20261024_1202.mjs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
let original
const files = () => structuredClone(original ??= buildFactoryPackageFiles(createTeeTemplate()))
const rehash = files => {
  const manifest = JSON.parse(decoder.decode(files['manifest.json']))
  const names = Object.keys(files).filter(name => name !== 'manifest.json')
  manifest.files = [...names, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(names.map(name => [name, sha256Bytes(files[name])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}
const marker = (files, extension) => Object.keys(files).find(key => key.startsWith('markers/') && key.endsWith(extension))
const errors = result => result.diagnostics.map(d => d.code)

test('six-size tee passes and archive is not mutated', () => {
  const map = files(), before = structuredClone(map)
  assert.deepEqual(audit(map), { ok: true, diagnostics: [], manufacturingApproved: false, physicalRegistrationVerified: false })
  assert.deepEqual(map, before)
})

test('narrow separate-sheet marker passes with trusted project', () => {
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
  const map = buildFactoryPackageFiles(project), before = structuredClone(map)
  assert.equal(audit(map, project).ok, true, JSON.stringify(audit(map, project).diagnostics))
  assert.deepEqual(map, before)
})

test('trusted project mismatch fails', () => {
  const project = createTeeTemplate()
  project.markerSettings.fabricWidthCm = 160
  assert.equal(audit(files(), project).ok, false)
})

test('accessor-bearing trusted input fails closed without invoking getter or mutating archive', () => {
  const map = files(), before = structuredClone(map)
  const project = createTeeTemplate()
  let invoked = false
  Object.defineProperty(project, 'markerSettings', { enumerable: true, get() { invoked = true; throw Error('accessor invoked') } })
  const result = audit(map, project)
  assert.equal(result.ok, false)
  assert.equal(invoked, false)
  assert.deepEqual(map, before)
})

test('rehashing forged SVG marker height cannot restore parity', () => {
  const map = files(), path = marker(map, '.svg')
  map[path] = encoder.encode(decoder.decode(map[path]).replace(/height="([\d.]+)cm"/, (_, n) => `height="${Number(n) + 1}cm"`))
  rehash(map)
  assert.equal(audit(map).ok, false)
  assert(errors(audit(map)).some(code => code === 'MARKER_SVG_PARITY' || code === 'UNSAFE_CALIBRATION_EVIDENCE' || code === 'CALIBRATION_MODE_MISMATCH'))
})

test('rehashing forged PDF MediaBox cannot restore parity', () => {
  const map = files(), path = marker(map, '.pdf')
  map[path] = encoder.encode(decoder.decode(map[path]).replace(/(\/MediaBox \[0 0 )([\d.]+)/, (_, prefix, n) => prefix + (Number(n) + 1)))
  rehash(map)
  assert.equal(audit(map).ok, false)
  assert(errors(audit(map)).includes('MARKER_PDF_PARITY'))
})

test('rehashing a changed SVG cut contour cannot restore parity', () => {
  const map = files(), path = marker(map, '.svg')
  const original = decoder.decode(map[path])
  const forged = original.replace(/(<polygon\s+[^>]*points=")([\d.]+),/, (_, prefix, n) => prefix + (Number(n) + 0.25) + ',')
  assert.notEqual(forged, original)
  map[path] = encoder.encode(forged)
  rehash(map)
  assert(errors(audit(map)).includes('MARKER_SVG_PARITY'))
})

test('oversized authored points fail closed with source complexity diagnostic after rehash', () => {
  const map = files(), beforeSource = JSON.parse(decoder.decode(map['garment-source.json']))
  beforeSource.pieces[0].points = Array.from({ length: 4097 }, (_, i) => ({
    ...beforeSource.pieces[0].points[i % beforeSource.pieces[0].points.length],
  }))
  map['garment-source.json'] = encoder.encode(JSON.stringify(beforeSource))
  rehash(map)
  const result = audit(map)
  assert.equal(result.ok, false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
  assert(errors(result).includes('SOURCE_COMPLEXITY_BUDGET'), JSON.stringify(result.diagnostics))
})
