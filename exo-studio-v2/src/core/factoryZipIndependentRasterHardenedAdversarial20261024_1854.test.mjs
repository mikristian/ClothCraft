import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { markerToPdf } from './markerArtifacts.js'

// Independent, in-memory PyMuPDF construction: no dependency on EXO PDF rendering.
const checker = fileURLToPath(new URL('./factoryZipIndependentRasterHardened20261024_1854.py', import.meta.url))
const scale = 72 / 2.54
const contour = [[10, 10], [21, 11], [22, 17], [19, 21], [9, 20]]
const baseline = { pages: 1, width: 50, length: 50, contours: [contour] }
const fixtureScript = String.raw`
import sys, json, base64, fitz
variant = sys.argv[1]
s = 72 / 2.54
doc = fitz.open()
p = doc.new_page(width=50*s, height=50*s)
doc.xref_set_key(p.xref, 'EXOStartCm', '0')
doc.xref_set_key(p.xref, 'EXOEndCm', '50')
def poly(points, color=(0,0,0), close=True):
    shape = p.new_shape()
    pts = [fitz.Point(x*s,y*s) for x,y in points]
    for a,b in zip(pts, pts[1:] + ([pts[0]] if close else [])):
        shape.draw_line(a,b)
    shape.finish(color=color, width=0.8)
    shape.commit()
poly([[10,10],[21,11],[22,17],[19,21],[9,20]], (1,1,1) if variant == 'white-cut' else (0,0,0))
if variant == 'overpaint-cut':
    # Keep the vector CUT in the PDF but conceal all its pixels under white paint.
    p.draw_rect(fitz.Rect(9*s,9*s,21*s,21*s), color=None, fill=(1,1,1), overlay=True)
if variant == 'open-u':
    poly([[28,10],[28,30],[40,30],[40,10]], close=False)
if variant == 'extra-closed':
    poly([[28,10],[40,10],[40,20],[28,20]])
if variant in ('white-cut', 'overpaint-cut'):
    # A visible black line must not make a separate white CUT contour acceptable.
    p.draw_line(fitz.Point(26*s,35*s),fitz.Point(38*s,35*s),color=(0,0,0),width=1)
if variant == 'ruler':
    # Thin registration/ruler marks are annotation, not additional closed panels.
    p.draw_line(fitz.Point(2*s,40*s),fitz.Point(7*s,40*s),color=(0,0,0),width=.5)
    for x in (2,3,4,5,6,7):
        p.draw_line(fitz.Point(x*s,39.8*s),fitz.Point(x*s,40.2*s),color=(0,0,0),width=.5)
sys.stdout.write(base64.b64encode(doc.tobytes()).decode('ascii'))
`

function execute(program, args, input) {
  const child = spawnSync(program, args, {
    input, encoding: 'utf8', timeout: 9000, maxBuffer: 2_500_000,
    env: { PATH: process.env.PATH || '/usr/bin:/bin' },
  })
  assert.notEqual(child.error?.code, 'ETIMEDOUT', `${program} subprocess timeout`)
  assert.ifError(child.error)
  assert.equal(child.signal, null, `${program} killed by ${child.signal}`)
  return child
}

function synthetic(variant) {
  const child = execute('python3', ['-c', fixtureScript, variant])
  assert.equal(child.status, 0, child.stderr.slice(0, 600))
  assert.ok(child.stdout.length > 100)
  return Buffer.from(child.stdout, 'base64')
}

function inspect(pdf, expected = baseline) {
  const child = execute('python3', [checker], JSON.stringify({
    ...expected, pdf: Buffer.from(pdf).toString('base64'),
  }))
  assert.ok(child.stdout.trim(), `checker produced no JSON: ${child.stderr.slice(0, 600)}`)
  return { status: child.status, result: JSON.parse(child.stdout.trim()) }
}

function reject(pdf, reason, expected) {
  const verdict = inspect(pdf, expected)
  assert.equal(verdict.status, 1, JSON.stringify(verdict.result))
  assert.equal(verdict.result.ok, false)
  assert.match(verdict.result.reason, reason)
}

test('hardened checker accepts only expected visible black CUT contour', { timeout: 15000 }, () => {
  const verdict = inspect(synthetic('baseline'))
  assert.equal(verdict.status, 0, JSON.stringify(verdict.result))
  assert.equal(verdict.result.ok, true)
  assert.equal(verdict.result.matched, 1)
})

test('hardened checker rejects an additional open U-shaped vector path', { timeout: 15000 }, () => {
  reject(synthetic('open-u'), /unexpected|unmatched|open|CUT|path|geometry/i)
})

test('hardened checker rejects invisible white CUT with visible black annotation', { timeout: 15000 }, () => {
  reject(synthetic('white-cut'), /invisible|white|CUT|color|geometry|mismatch/i)
})

test('hardened checker rejects black vector CUT hidden under opaque white paint', { timeout: 15000 }, () => {
  reject(synthetic('overpaint-cut'), /invisible|white|CUT|paint|occlu|raster|visible|geometry|mismatch/i)
})

test('hardened checker allows independent ruler annotations near valid CUT', { timeout: 15000 }, () => {
  const verdict = inspect(synthetic('ruler'))
  assert.equal(verdict.status, 0, JSON.stringify(verdict.result))
  assert.equal(verdict.result.matched, 1)
})

test('hardened checker rejects an additional closed contour', { timeout: 15000 }, () => {
  reject(synthetic('extra-closed'), /unexpected|unmatched|extra|CUT|contour|geometry/i)
})

test('hardened checker accepts EXO graded tee PDF with notches, grainlines and calibration ruler', { timeout: 25000 }, () => {
  const project = gradeProject(createTeeTemplate(), 'M')
  const marker = Object.values(buildFabricMarkers(project))[0]
  assert.ok(marker.placements.length > 0)
  const pdf = markerToPdf(marker, { size: 'M', project, calibration: true })
  const verdict = inspect(pdf, {
    pages: Math.ceil(marker.length / 400), width: marker.width, length: marker.length,
    contours: marker.placements.map(p => p.outline.map(q => [q.x, q.y])),
  })
  assert.equal(verdict.status, 0, JSON.stringify(verdict.result))
  assert.equal(verdict.result.matched, marker.placements.length)
})
