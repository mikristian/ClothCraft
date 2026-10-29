import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { auditMarkerPdfPageIdentity20261024 as identity } from './accumarkMarkerPdfPageIdentity20261024.mjs'
import { auditMarkerPlotParity20261024 as plotAudit } from './accumarkMarkerPlotParity20261024.mjs'

const text = bytes => new TextDecoder().decode(bytes)
function fixture() {
  const rect = (name, y) => ({ pieceId: name, name, instance: 0, x: 2, y, width: 8, height: 5,
    outline: [{ x: 2, y }, { x: 10, y }, { x: 10, y: y + 5 }, { x: 2, y: y + 5 }] })
  const marker = { width: 50, length: 800, fabricId: 'main', unusedPieces: 0,
    placements: [rect('Front', 20), rect('Back', 420)] }
  const options = { size: 'M', fabricName: 'main' }
  const pages = planSafeMarkerPdfPages20261024(marker, 400, { calibration: true })
  const pdf = text(markerToPdf(marker, { ...options, calibration: true }))
  const svg = markerToSvg(marker, { ...options, calibration: true })
  return { marker, options, pages, pdf, svg }
}

test('two equal-height pages carry independently parseable ordered global stations and viewer labels', () => {
  const f = fixture()
  const before = structuredClone(f.marker)
  assert.deepEqual(f.pages.map(p => [p.startCm, p.endCm]), [[0, 400], [400, 800]])
  assert.match(f.pdf, /\/PageLabels << \/Nums \[0 << \/S \/D \/St 1 \/P \(EXO Page \) >>\] >>/)
  assert.match(f.pdf, /\/EXOPageIndex 1 \/EXOPageCount 2 \/EXOStartCm 0 \/EXOEndCm 400 \/EXOSize \(M\) \/EXOFabric \(main\)/)
  assert.match(f.pdf, /\/EXOPageIndex 2 \/EXOPageCount 2 \/EXOStartCm 400 \/EXOEndCm 800 \/EXOSize \(M\) \/EXOFabric \(main\)/)
  const checked = identity(f.pdf, f.pages, { size: 'M', fabricId: 'main' })
  assert.equal(checked.ok, true, JSON.stringify(checked.issues))
  assert.equal(checked.inspectedPages, 2)
  assert.equal(checked.physicalRegistrationVerified, false)
  const plot = plotAudit(f.marker, { ...f.options, svg: f.svg, pdf: f.pdf })
  assert.equal(plot.ok, true, JSON.stringify(plot.issues))
  assert.equal(plot.digitalPageIdentityVerified, true)
  assert.equal(plot.physicalRegistrationVerified, false)
  assert.deepEqual(f.marker, before)
})

test('page swap, station drift, provenance change, duplicate metadata and missing labels fail closed', () => {
  const f = fixture()
  const mutations = [
    pdf => pdf.replace('/EXOPageIndex 1', '/EXOPageIndex 2'),
    pdf => pdf.replace('/EXOEndCm 400', '/EXOEndCm 399.999'),
    pdf => pdf.replace('/EXOPageCount 2', '/EXOPageCount 3'),
    pdf => pdf.replace('/EXOSize (M)', '/EXOSize (L)'),
    pdf => pdf.replace('/EXOFabric (main)', '/EXOFabric (lining)'),
    pdf => pdf.replace('/PageLabels ', '/NoPageLabels '),
    pdf => pdf.replace(' /PageLabels << /Nums [0 << /S /D /St 1 /P (EXO Page ) >>] >>', '')
      .replace('%Garment Studio marker plot', '%Garment Studio marker plot /PageLabels << /Nums [0 << /S /D /St 1 /P (EXO Page ) >>] >>'),
    pdf => pdf.replace('/Kids [4 0 R 6 0 R]', '/Kids [6 0 R 4 0 R]'),
    pdf => pdf.replace('/EXOPageIndex 1', '/EXOPageIndex 1 /EXOPageIndex 1'),
  ]
  for (const mutate of mutations) {
    const pdf = mutate(f.pdf)
    assert.notEqual(pdf, f.pdf, 'mutation must change the PDF')
    const checked = identity(pdf, f.pages, { size: 'M', fabricId: 'main' })
    assert.equal(checked.ok, false, `standalone identity accepted ${pdf.slice(0, 100)}`)
    assert.ok(checked.issues.some(issue => issue.code === 'PDF_PAGE_IDENTITY_INVALID'))
    const plot = plotAudit(f.marker, { ...f.options, svg: f.svg, pdf })
    assert.equal(plot.ok, false)
    assert.ok(plot.issues.some(issue => issue.code === 'PDF_PARITY'))
  }
})

test('page provenance escapes literal PDF metacharacters and binds size/fabric without printing registration claims', () => {
  const f = fixture()
  f.marker.fabricId = 'main (A)\\B'
  const size = 'M (tall)\\2'
  const pdf = markerToPdf(f.marker, { size, calibration: true })
  const checked = identity(pdf, f.pages, { size, fabricId: f.marker.fabricId })
  assert.equal(checked.ok, true, JSON.stringify(checked.issues))
  assert.equal(identity(pdf, f.pages, { size: 'M', fabricId: f.marker.fabricId }).ok, false)
  assert.equal(identity(pdf, f.pages, { size, fabricId: 'main' }).ok, false)
})

test('lossy PDF display fallback cannot alias distinct Unicode size or fabric provenance', () => {
  const f = fixture()
  f.marker.fabricId = 'coté'
  const size = 'M 🌿'
  const pdf = markerToPdf(f.marker, { size, calibration: true })
  assert.equal(identity(pdf, f.pages, { size, fabricId: 'coté' }).ok, true)
  for (const other of ['cotè', 'cotê', 'cote', 'cote\u0301', 'cot🌿']) {
    assert.equal(identity(pdf, f.pages, { size, fabricId: other }).ok, false, other)
  }
  for (const other of ['M 🍀', 'M ?', 'M 🌱', 'M']) {
    assert.equal(identity(pdf, f.pages, { size: other, fabricId: 'coté' }).ok, false, other)
  }
})

test('uncalibrated legacy preview remains without new page labels or EXO station metadata', () => {
  const f = fixture()
  const legacy = text(markerToPdf(f.marker, { size: 'M', calibration: false }))
  assert.ok(!legacy.includes('/PageLabels'))
  assert.ok(!legacy.includes('/EXOPageIndex'))
  assert.equal(identity(legacy, f.pages, { size: 'M', fabricId: 'main' }).ok, false)
})

test('actual shared factory package retains audited PDF page identities in SHA-256-pinned bytes', () => {
  const project = createTeeTemplate()
  project.grading.sizes = [project.grading.baseSize]
  const before = structuredClone(project)
  const files = buildFactoryPackageFiles(project)
  const manifest = JSON.parse(text(files['manifest.json']))
  const qa = JSON.parse(text(files['marker-plot-geometry-qa.json']))
  const graded = gradeProject(project, project.grading.baseSize)
  const markers = buildFabricMarkers(graded, project.markerSettings?.fabricWidthCm ?? 150,
    project.markerSettings?.gapCm ?? 1.5)
  const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
  let checked = 0
  for (const [fabricId, marker] of Object.entries(markers)) {
    if (!marker.placements.length) continue
    const filename = `markers/${slug(project.name)}-${slug(fabricId)}-${slug(project.grading.baseSize)}.pdf`
    const pdf = files[filename]
    assert.ok(pdf instanceof Uint8Array, `${filename} is missing`)
    assert.equal(manifest.sha256[filename], createHash('sha256').update(pdf).digest('hex'))
    const pages = planSafeMarkerPdfPages20261024(marker, 400, {
      calibration: marker.width >= 11 && marker.length >= 3,
    })
    assert.equal(identity(pdf, pages, { size: project.grading.baseSize, fabricId: marker.fabricId || 'Fabric' }).ok, true)
    const row = qa.rows.find(row => row.size === project.grading.baseSize && row.fabricId === fabricId)
    assert.equal(row.digitalPageIdentityVerified, true)
    assert.equal(row.physicalRegistrationVerified, false)
    checked++
  }
  assert.ok(checked > 0)
  assert.deepEqual(project, before)
})
