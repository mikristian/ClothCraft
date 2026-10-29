import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryPackageManifestBrowser20261024_0053 as auditManifest } from './factoryPackageManifestBrowser20261024_0053.mjs'
import { auditFactoryZipCalibrationEvidence20261024_1052 as audit } from './factoryZipCalibrationEvidence20261024_1052.mjs'
import { markerToSvg } from './markerArtifacts.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const parse = bytes => JSON.parse(decoder.decode(bytes))
const codes = result => result.diagnostics?.map(issue => issue.code) || []

function narrowProject() {
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

const fixture = narrow => {
  const project = narrow ? narrowProject() : createTeeTemplate()
  const files = buildFactoryPackageFiles(project)
  const rows = parse(files['marker-plot-geometry-qa.json']).rows
  assert.ok(rows.length)
  assert.equal(rows[0].calibrationMode, 'separate-sheet')
  assert.equal(audit(files, project).ok, true, 'genuine calibration evidence')
  return { files, project }
}

function resign(files) {
  const manifest = parse(files['manifest.json'])
  const paths = Object.keys(files).filter(path => path !== 'manifest.json')
  manifest.files = [...paths, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(paths.map(path => [path, sha256Bytes(files[path])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

function tamper(narrow, mutation) {
  const { files: source, project } = fixture(narrow)
  const files = { ...source }
  mutation(files)
  resign(files)
  assert.equal(auditManifest(files, project).ok, true, 'manifest fully rehashed')
  const result = audit(files, project)
  assert.equal(result.manufacturingApproved, false)
  return result
}

function changeRow(files, fn) {
  const qa = parse(files['marker-plot-geometry-qa.json'])
  fn(qa.rows[0], qa)
  files['marker-plot-geometry-qa.json'] = encoder.encode(JSON.stringify(qa))
}
const first = (files, prefix, extension) => {
  const path = Object.keys(files).find(path => path.startsWith(prefix) && path.endsWith(extension))
  assert.ok(path, 'expected file '+prefix+extension)
  return path
}
const reject = result => assert.equal(result.ok, false, JSON.stringify(result.diagnostics))

test('authentic collision-fallback and narrow separate-sheet evidence always remains unapproved', () => {
  for (const narrow of [false, true]) {
    const { files, project } = fixture(narrow)
    assert.equal(audit(files, project).manufacturingApproved, false)
  }
})

test('forged on-page row cannot excuse a separate-sheet witness', () => {
  reject(tamper(true, files => changeRow(files, row => { row.calibrationMode = 'on-page' })))
})

test('plausible forged 12cm marker width and on-page ruler cannot erase narrow-marker calibration witness', () => {
  const result = tamper(true, files => {
    const path = first(files, 'markers/', '.svg')
    const svg = decoder.decode(files[path])
    const match = svg.match(/<svg\s+([^>]+)>/)
    assert.ok(match)
    const width = match[1].match(/width="([\d.]+)cm"/)
    const viewBox = match[1].match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
    assert.ok(width && viewBox)
    const replacement = match[0]
      .replace(/width="[\d.]+cm"/, 'width="12cm"')
      .replace(/viewBox="0 0 [\d.]+ ([\d.]+)"/, 'viewBox="0 0 12 $1"')
    const rulerSvg = markerToSvg({ width: 30, length: 30, fabricId: 'main', unusedPieces: 0,
      placements: [{ x: 18, y: 12, width: 3, height: 4, name: 'Safe', instance: 0,
        outline: [{ x: 18, y: 12 }, { x: 21, y: 12 }, { x: 21, y: 16 }, { x: 18, y: 16 }] }] },
    { calibration: true })
    const ruler = rulerSvg.match(/<g id="print-scale-check"[\s\S]*?<\/g>/)
    assert.ok(ruler, 'authentic ruler group is required for plausible forgery')
    files[path] = encoder.encode(svg.replace(match[0], replacement).replace('</svg>', ruler[0] + '\n</svg>'))
    changeRow(files, row => { row.calibrationMode = 'on-page' })
    for (const candidate of Object.keys(files)) if (candidate.startsWith('print-calibration/')) delete files[candidate]
  })
  reject(result)
  assert.ok(codes(result).some(code => code.startsWith('CALIBRATION') || code === 'UNSAFE_CALIBRATION_EVIDENCE'),
    'narrow marker must fail calibration-specific audit: '+JSON.stringify(result.diagnostics))
})

test('forged on-page row cannot erase required witness on a full-width collision marker', () => {
  reject(tamper(false, files => changeRow(files, row => { row.calibrationMode = 'on-page' })))
})

test('a rehashed damaged 100mm ruler in the narrow sheet SVG is rejected', () => {
  reject(tamper(true, files => {
    const path = first(files, 'print-calibration/', '.svg')
    const source = decoder.decode(files[path])
    assert.match(source, /x2="11"/)
    files[path] = encoder.encode(source.replace('x2="11"', 'x2="10"'))
  }))
})

test('a rehashed damaged 100mm ruler in the narrow sheet PDF is rejected', () => {
  reject(tamper(true, files => {
    const path = first(files, 'print-calibration/', '.pdf')
    const source = decoder.decode(files[path])
    assert.match(source, /311\.811/)
    files[path] = encoder.encode(source.replace('311.811', '310.811'))
  }))
})

test('calibration witness from a different size and fabric is rejected despite valid digests', () => {
  reject(tamper(true, files => {
    const path = first(files, 'print-calibration/', '.svg')
    const source = decoder.decode(files[path])
    assert.match(source, /main/)
    files[path] = encoder.encode(source.replace(/main/g, 'contrast'))
  }))
})

test('unexpected independently rehashed calibration sheet is rejected', () => {
  reject(tamper(false, files => {
    files['print-calibration/forged-extra.svg'] = encoder.encode('<svg/>')
  }))
})

test('invalid full-width marker SVG physical dimensions are rejected', () => {
  reject(tamper(false, files => {
    const path = first(files, 'markers/', '.svg')
    const original = decoder.decode(files[path])
    assert.match(original, /width="[\d.]+cm"/)
    files[path] = encoder.encode(original.replace(/width="[\d.]+cm"/, 'width="0cm"'))
  }))
})

test('invalid narrow marker SVG height is rejected', () => {
  reject(tamper(true, files => {
    const path = first(files, 'markers/', '.svg')
    const original = decoder.decode(files[path])
    assert.match(original, /height="[\d.]+cm"/)
    files[path] = encoder.encode(original.replace(/height="[\d.]+cm"/, 'height="NaNcm"'))
  }))
})

test('empty file maps fail closed without granting manufacturing approval', () => {
  const result = audit({}, createTeeTemplate())
  reject(result)
  assert.equal(result.manufacturingApproved, false)
})

test('accessor-trap file maps fail closed without running getters', () => {
  let reads = 0
  const files = Object.create(null)
  Object.defineProperty(files, 'garment-source.json', { enumerable: true, get() { reads++; throw Error('must not read') } })
  const result = audit(files, createTeeTemplate())
  reject(result)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(reads, 0)
})
