import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { buildFactoryPackageZip } from './factoryPackage.js'

const verifier = fileURLToPath(new URL('./factoryZipIndependentRaster20261024_1701.py', import.meta.url))
const decode = bytes => new TextDecoder().decode(bytes)
const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function inspect(marker, pdf) {
  const body = {
    pdf: Buffer.from(pdf).toString('base64'),
    pages: Math.ceil(marker.length / 400),
    width: marker.width,
    length: marker.length,
    contours: marker.placements.map(placement => placement.outline.map(point => [point.x, point.y])),
  }
  const child = spawnSync('python3', [verifier], {
    input: JSON.stringify(body), encoding: 'utf8', timeout: 9000,
    maxBuffer: 32768, env: { PATH: process.env.PATH || '/usr/bin:/bin' },
  })
  assert.ifError(child.error)
  assert.ok(child.stdout.trim(), child.stderr)
  return { status: child.status, result: JSON.parse(child.stdout.trim()) }
}

function assertIdentity(pdf, size, fabricId) {
  // Read the exact page dictionaries in the archived PDF, independently of the
  // JS PDF serializer and its internal identity validator.
  const content = Buffer.from(pdf).toString('latin1')
  const pages = [...content.matchAll(/\/Type \/Page \/Parent 2 0 R[^\r\n]*/g)].map(match => match[0])
  assert.ok(pages.length > 0, 'PDF has no identified pages')
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]
    assert.match(page, new RegExp(`/EXOPageIndex ${index + 1}(?=\\s)`))
    assert.match(page, new RegExp(`/EXOPageCount ${pages.length}(?=\\s)`))
    const identity = page.match(/\/EXOProvenanceHex <([0-9a-f]+)>/)
    assert.ok(identity, 'missing exact UTF-8 size/fabric identity')
    assert.deepEqual(JSON.parse(Buffer.from(identity[1], 'hex').toString('utf8')), [size, fabricId])
  }
  return pages.length
}

test('real ZIP: independent raster, CUT contours, physical extents and archived identity for all six Foundation Tee sizes', { timeout: 100000 }, () => {
  const source = createTeeTemplate()
  assert.deepEqual(source.grading.sizes, sizes, 'fixture must author the complete six-size run')
  const archive = unzipSync(buildFactoryPackageZip(source))
  const manifest = JSON.parse(decode(archive['manifest.json']))
  assert.deepEqual(manifest.grading.sizes, sizes)
  const width = source.markerSettings?.fabricWidthCm ?? 150
  const gap = source.markerSettings?.gapCm ?? 1.5
  let inspected = 0
  for (const size of sizes) {
    const markerSet = buildFabricMarkers(gradeProject(source, size), width, gap)
    for (const [fabricId, marker] of Object.entries(markerSet)) {
      if (!marker.placements.length) continue
      const path = `markers/${slug(source.name)}-${slug(fabricId)}-${slug(size)}.pdf`
      const pdf = archive[path]
      assert.ok(pdf instanceof Uint8Array, `missing real ZIP entry ${path}`)
      assert.equal(manifest.sha256[path], createHash('sha256').update(pdf).digest('hex'), path)
      const count = assertIdentity(pdf, size, marker.fabricId || 'Fabric')
      const audit = inspect(marker, pdf)
      assert.equal(audit.status, 0, `${path}: ${JSON.stringify(audit.result)}`)
      assert.equal(audit.result.matched, marker.placements.length, path)
      assert.equal(audit.result.pages.length, count, path)
      assert.ok(audit.result.pages.every(page => page.ink_pixels > 20), path)
      inspected++
    }
  }
  assert.ok(inspected >= sizes.length, `only ${inspected} six-size marker PDFs inspected`)
})

test('wrong-size identity and source-derived contour tampering are rejected', { timeout: 25000 }, () => {
  const source = createTeeTemplate()
  const archive = unzipSync(buildFactoryPackageZip(source))
  const marker = Object.values(buildFabricMarkers(gradeProject(source, 'M'),
    source.markerSettings?.fabricWidthCm ?? 150, source.markerSettings?.gapCm ?? 1.5))[0]
  const path = `markers/${slug(source.name)}-${slug(marker.fabricId)}-m.pdf`
  const pdf = archive[path]
  assert.ok(pdf, path)
  assert.throws(() => assertIdentity(pdf, 'L', marker.fabricId), /deep-equal|Expected values/)
  const wrongContour = structuredClone(marker)
  wrongContour.placements[0].outline[0].x += 1
  const audit = inspect(wrongContour, pdf)
  assert.equal(audit.status, 1)
  assert.match(audit.result.reason, /CUT geometry mismatch|unexpected extra closed CUT-like paths/)
})
