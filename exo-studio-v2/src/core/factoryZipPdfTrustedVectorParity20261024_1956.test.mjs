import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { markerToPdf } from './markerArtifacts.js'

const checker = fileURLToPath(new URL('./factoryZipPdfTrustedVectorParity20261024_1956.py', import.meta.url))
const contour = [[10, 10], [21, 11], [22, 17], [19, 21], [9, 20]]
const baseline = { pages: 1, width: 50, length: 50, contours: [contour] }
const fixture = String.raw`
import fitz,sys,base64
s=72/2.54
d=fitz.open();p=d.new_page(width=50*s,height=50*s)
d.xref_set_key(p.xref,'EXOStartCm','0');d.xref_set_key(p.xref,'EXOEndCm','50')
v=sys.argv[1]
shape=p.new_shape()
q=[fitz.Point(x*s,y*s) for x,y in [[10,10],[21,11],[22,17],[19,21],[9,20]]]
for a,b in zip(q,q[1:]+q[:1]):shape.draw_line(a,b)
shape.finish(color=(0,0,0),width=.8);shape.commit()
for x in (2,3,4,5):p.draw_line((x*s,39*s),(x*s,41*s),color=(0,0,0),width=.5)
if v=='split-u':
 for a,b in [((28,10),(28,30)),((28,30),(40,30)),((40,30),(40,10))]:
  p.draw_line((a[0]*s,a[1]*s),(b[0]*s,b[1]*s),color=(0,0,0),width=.5)
if v=='style':p.draw_line((4*s,12*s),(6*s,12*s),color=(1,0,0),width=.5)
sys.stdout.write(base64.b64encode(d.tobytes()).decode())
`

function run(cmd, args, input) {
  const p = spawnSync(cmd, args, { input, encoding: 'utf8', timeout: 15000,
    maxBuffer: 2_500_000, env: { PATH: process.env.PATH || '/usr/bin:/bin' } })
  assert.ifError(p.error)
  assert.equal(p.signal, null)
  return p
}
function synthetic(variant) {
  const p = run('python3', ['-c', fixture, variant])
  assert.equal(p.status, 0, p.stderr)
  return Buffer.from(p.stdout, 'base64')
}
function check(reference, candidate, expected = baseline) {
  const p = run('python3', [checker], JSON.stringify({ ...expected,
    referencePdf: Buffer.from(reference).toString('base64'),
    candidatePdf: Buffer.from(candidate).toString('base64'),
  }))
  assert.ok(p.stdout.trim(), p.stderr)
  return { code: p.status, ...JSON.parse(p.stdout) }
}

test('trusted parity accepts equal baseline with independent ruler strokes', () => {
  const pdf = synthetic('baseline')
  const r = check(pdf, pdf)
  assert.equal(r.code, 0, JSON.stringify(r))
  assert.equal(r.ok, true)
  assert.ok(r.drawings >= 5)
})

test('trusted parity rejects split U drawn as three independent annotation-like strokes', () => {
  const r = check(synthetic('baseline'), synthetic('split-u'))
  assert.equal(r.code, 1, JSON.stringify(r))
  assert.match(r.reason, /vector\/text parity mismatch/)
})

test('trusted parity rejects added unrelated single-stroke path', () => {
  const r = check(synthetic('baseline'), synthetic('style'))
  assert.equal(r.code, 1, JSON.stringify(r))
  assert.match(r.reason, /vector\/text parity mismatch/)
})

test('trusted parity fails closed on missing independent reference', () => {
  const p = run('python3', [checker], JSON.stringify({ ...baseline,
    candidatePdf: synthetic('baseline').toString('base64') }))
  assert.equal(p.status, 1)
  assert.equal(JSON.parse(p.stdout).ok, false)
})

test('trusted parity accepts actual EXO generated PDF with its own trusted reference copy', { timeout: 30000 }, () => {
  const project = gradeProject(createTeeTemplate(), 'M')
  const marker = Object.values(buildFabricMarkers(project))[0]
  const pdf = markerToPdf(marker, { size: 'M', project, calibration: true })
  const r = check(pdf, pdf, { pages: Math.ceil(marker.length / 400),
    width: marker.width, length: marker.length,
    contours: marker.placements.map(p => p.outline.map(q => [q.x, q.y])) })
  assert.equal(r.code, 0, JSON.stringify(r))
  assert.equal(r.ok, true)
})
