import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { markerToPdf } from './markerArtifacts.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'

const script = fileURLToPath(new URL('./factoryZipIndependentRaster20261024_1701.py', import.meta.url))

function inspect(marker, pdf, pages = 1) {
  const request = {
    pdf: Buffer.from(pdf).toString('base64'),
    pages, width: marker.width, length: marker.length,
    contours: marker.placements.map(p => p.outline.map(q => [q.x, q.y])),
  }
  const process = spawnSync('python3', [script], {
    input: JSON.stringify(request), encoding: 'utf8', timeout: 9000,
    maxBuffer: 32768, env: { PATH: processEnvPath() },
  })
  assert.notEqual(process.error?.code, 'ETIMEDOUT', 'PyMuPDF time budget exceeded')
  assert.ok(process.stdout.trim(), `Python produced no JSON: ${process.stderr.slice(0, 600)}`)
  return { status: process.status, result: JSON.parse(process.stdout.trim()) }
}

function processEnvPath() { return process.env.PATH || '/usr/bin:/bin' }

test('independent PyMuPDF geometry and visible raster of actual graded tee marker', { timeout: 12000 }, () => {
  const project = gradeProject(createTeeTemplate(), 'M')
  const marker = Object.values(buildFabricMarkers(project))[0]
  assert.ok(marker.placements.length > 0)
  const pdf = markerToPdf(marker, { size: 'M', project, calibration: true })
  const audit = inspect(marker, pdf)
  assert.equal(audit.status, 0, JSON.stringify(audit.result))
  assert.equal(audit.result.matched, marker.placements.length)
  assert.ok(audit.result.pages[0].ink_pixels > 20)
  const altered = structuredClone(marker)
  altered.placements[0].outline[0].x += 1
  const negative = inspect(altered, pdf)
  assert.equal(negative.status, 1)
  assert.match(negative.result.reason, /CUT geometry mismatch|unexpected extra closed CUT-like paths/)
})

test('extra closed CUT contour and duplicated expected contour both fail closed', { timeout: 12000 }, () => {
  const rectangle = x => ({ x, y: 15, width: 5, height: 5, name: 'Panel', instance: 0,
    outline: [{ x, y: 15 }, { x: x + 5, y: 15 }, { x: x + 5, y: 20 }, { x, y: 20 }] })
  const marker = { width: 50, length: 50, fabricId: 'main', placements: [rectangle(20), rectangle(30)] }
  const pdf = markerToPdf(marker, { size: 'M', calibration: true })
  const omitted = inspect({ ...marker, placements: [marker.placements[0]] }, pdf)
  assert.equal(omitted.status, 1)
  assert.match(omitted.result.reason, /unexpected extra closed CUT-like paths/)
  const duplicateExpected = inspect({ ...marker, placements: [marker.placements[0], marker.placements[0]] }, markerToPdf({ ...marker, placements: [marker.placements[0]] }, { size: 'M', calibration: true }))
  assert.equal(duplicateExpected.status, 1)
  assert.match(duplicateExpected.result.reason, /CUT geometry mismatch/)
})

test('independent PyMuPDF two-page physical geometry and blank-PDF rejection', { timeout: 12000 }, () => {
  const rectangle = (x, y) => ({ x, y, width: 12, height: 8, name: 'Panel', instance: 0,
    outline: [{ x, y }, { x: x + 12, y }, { x: x + 12, y: y + 8 }, { x, y: y + 8 }] })
  const marker = { width: 50, length: 600, fabricId: 'main', unusedPieces: 0, placements: [rectangle(20, 15), rectangle(20, 455)] }
  const pdf = markerToPdf(marker, { size: 'M', calibration: true })
  const audit = inspect(marker, pdf, 2)
  assert.equal(audit.status, 0, JSON.stringify(audit.result))
  assert.equal(audit.result.matched, 2)
  assert.ok(audit.result.pages.every(p => p.ink_pixels > 20))
  const blank = inspect(marker, new TextEncoder().encode('%PDF-1.4\n%%EOF\n'), 2)
  assert.equal(blank.status, 1)
  assert.equal(blank.result.ok, false)
})

test('independent PDF inspection of actual six-size factory package M marker bytes', { timeout: 15000 }, () => {
  const source = createTeeTemplate()
  const entries = buildFactoryPackageFiles(source)
  const entry = Object.entries(entries).find(([path]) => /^markers\/.*-m\.pdf$/.test(path))
  assert.ok(entry, 'six-size factory package must contain size M marker PDF')
  const project = gradeProject(source, 'M')
  const marker = Object.values(buildFabricMarkers(project, source.markerSettings?.fabricWidthCm ?? 150, source.markerSettings?.gapCm ?? 1.5))[0]
  const audit = inspect(marker, entry[1])
  assert.equal(audit.status, 0, JSON.stringify(audit.result))
  assert.equal(audit.result.matched, marker.placements.length)
})
