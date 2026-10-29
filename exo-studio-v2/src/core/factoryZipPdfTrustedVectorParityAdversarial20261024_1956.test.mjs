import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./factoryZipPdfTrustedVectorParity20261024_1956.py', import.meta.url))
const contour = [[10, 10], [21, 11], [22, 17], [19, 21], [9, 20]]
const expected = { pages: 1, width: 50, length: 50, contours: [contour] }

// Build PDFs independently in memory. Neither specimen derives from an EXO archive.
const fixtures = String.raw`
import sys, json, base64, fitz
variant = sys.argv[1]
s = 72 / 2.54
def specimen(alter=False):
    doc = fitz.open()
    p = doc.new_page(width=50*s, height=50*s)
    doc.xref_set_key(p.xref, 'EXOStartCm', '0')
    doc.xref_set_key(p.xref, 'EXOEndCm', '50')
    def line(a,b,color=(0,0,0),opacity=1,width=.8):
        p.draw_line(fitz.Point(a[0]*s,a[1]*s), fitz.Point(b[0]*s,b[1]*s), color=color, stroke_opacity=opacity, width=width)
    shape = p.new_shape()
    pts = [[10,10],[21,11],[22,17],[19,21],[9,20]]
    for a,b in zip(pts,pts[1:]+pts[:1]):
        shape.draw_line(fitz.Point(a[0]*s,a[1]*s),fitz.Point(b[0]*s,b[1]*s))
    color = (1,0,0) if alter and variant=='color' else (0,0,0)
    opacity = .3 if alter and variant=='opacity' else 1
    shape.finish(color=color, stroke_opacity=opacity, width=.8)
    shape.commit()
    # Realistic independent calibration ticks and grainline, intentionally preserved.
    line((2,40),(7,40),width=.5)
    for x in (2,3,4,5,6,7):
        line((x,39.8),(x,40.2),width=.5)
    line((15,25),(15,36),width=.5)
    if alter and variant=='split-u':
        # Three independent draw operations, each a single segment.
        line((28,10),(28,30))
        line((28,30),(40,30))
        line((40,30),(40,10))
    if alter and variant=='extra-closed':
        shape = p.new_shape()
        corners = [[28,10],[40,10],[40,20],[28,20]]
        for a,b in zip(corners,corners[1:]+corners[:1]):
            shape.draw_line(fitz.Point(a[0]*s,a[1]*s), fitz.Point(b[0]*s,b[1]*s))
        shape.finish(color=(0,0,0),width=.8)
        shape.commit()
    return base64.b64encode(doc.tobytes()).decode('ascii')
print(json.dumps({'referencePdf': specimen(False), 'candidatePdf': specimen(True)}))
`

function execute(program, args, input = '') {
  const child = spawnSync(program, args, {
    input, encoding: 'utf8', timeout: 9000, maxBuffer: 2_500_000,
    env: { PATH: process.env.PATH || '/usr/bin:/bin' },
  })
  assert.ifError(child.error)
  assert.equal(child.signal, null)
  return child
}

function specimen(variant) {
  const child = execute('python3', ['-c', fixtures, variant])
  assert.equal(child.status, 0, child.stderr)
  return JSON.parse(child.stdout)
}

function inspect(payload) {
  const child = execute('python3', [checker], JSON.stringify(payload))
  assert.ok(child.stdout.trim(), `Missing checker JSON: ${child.stderr}`)
  return { status: child.status, data: JSON.parse(child.stdout) }
}

function reject(variant) {
  const verdict = inspect({ ...expected, ...specimen(variant) })
  assert.equal(verdict.status, 1, JSON.stringify(verdict.data))
  assert.equal(verdict.data.ok, false)
  assert.equal(typeof verdict.data.reason, 'string')
  assert.ok(verdict.data.reason.length > 0)
}

test('trusted vector parity accepts identical CUT with ruler ticks and grainline', { timeout: 15000 }, () => {
  const verdict = inspect({ ...expected, ...specimen('baseline') })
  assert.equal(verdict.status, 0, JSON.stringify(verdict.data))
  assert.equal(verdict.data.ok, true)
})

test('trusted vector parity rejects an open U split across three single-stroke operations', { timeout: 15000 }, () => {
  reject('split-u')
})

test('trusted vector parity rejects changed CUT stroke color', { timeout: 15000 }, () => {
  reject('color')
})

test('trusted vector parity rejects changed CUT stroke opacity', { timeout: 15000 }, () => {
  reject('opacity')
})

test('trusted vector parity rejects extra closed contour', { timeout: 15000 }, () => {
  reject('extra-closed')
})

test('trusted vector parity fails closed on malformed and missing inputs', { timeout: 15000 }, () => {
  const valid = { ...expected, ...specimen('baseline') }
  for (const payload of [null, {}, { ...valid, referencePdf: '@@@' }, { ...valid, candidatePdf: '' }, { ...valid, contours: [] }, { ...valid, pages: 4 }]) {
    const verdict = inspect(payload)
    assert.equal(verdict.status, 1, JSON.stringify({ payload: payload && Object.keys(payload), verdict }))
    assert.equal(verdict.data.ok, false)
  }
})

test('trusted vector parity rejects clipping that hides a ruler while keeping extracted drawings identical', { timeout: 15000 }, () => {
  const clippingFixture = String.raw`
import fitz,base64,json
s=72/2.54
d=fitz.open()
p=d.new_page(width=50*s,height=50*s)
d.xref_set_key(p.xref,'EXOStartCm','0')
d.xref_set_key(p.xref,'EXOEndCm','50')
pts=[[10,10],[21,11],[22,17],[19,21],[9,20]]
sh=p.new_shape()
for a,b in zip(pts,pts[1:]+pts[:1]):
    sh.draw_line(fitz.Point(a[0]*s,a[1]*s),fitz.Point(b[0]*s,b[1]*s))
sh.finish(color=(0,0,0),width=.8)
sh.commit()
p.draw_line(fitz.Point(2*s,40*s),fitz.Point(7*s,40*s),color=(0,0,0),width=.8)
reference=d.tobytes()
first,last=p.get_contents()[0],p.get_contents()[-1]
# PDF clipping restricts all strokes to x=8..28 cm, y=27..47 cm.
# Ruler at x=2..7 cm disappears while the CUT contour remains visible.
d.update_stream(first,f'q {8*s:.3f} {27*s:.3f} {20*s:.3f} {20*s:.3f} re W n\n'.encode()+d.xref_stream(first))
d.update_stream(last,d.xref_stream(last)+b'\nQ\n')
candidate=d.tobytes()
ref_page=fitz.open(stream=reference,filetype='pdf')[0]
candidate_page=fitz.open(stream=candidate,filetype='pdf')[0]
clip=fitz.Rect(s,38*s,8*s,42*s)
ref_ink=sum(v<225 for v in ref_page.get_pixmap(colorspace=fitz.csGRAY,clip=clip).samples)
candidate_ink=sum(v<225 for v in candidate_page.get_pixmap(colorspace=fitz.csGRAY,clip=clip).samples)
assert ref_page.get_drawings()==candidate_page.get_drawings()
assert ref_ink>0 and candidate_ink==0,(ref_ink,candidate_ink)
print(json.dumps({'referencePdf':base64.b64encode(reference).decode(),'candidatePdf':base64.b64encode(candidate).decode(),'refInk':ref_ink,'candidateInk':candidate_ink}))
`
  const child = execute('python3', ['-c', clippingFixture])
  assert.equal(child.status, 0, child.stderr)
  const { referencePdf, candidatePdf, refInk, candidateInk } = JSON.parse(child.stdout)
  assert.ok(refInk > 0)
  assert.equal(candidateInk, 0)
  const positive = inspect({ ...expected, referencePdf, candidatePdf: referencePdf })
  assert.equal(positive.status, 0, JSON.stringify(positive.data))
  assert.equal(positive.data.ok, true)
  const negative = inspect({ ...expected, referencePdf, candidatePdf })
  assert.equal(negative.status, 1, JSON.stringify(negative.data))
  assert.equal(negative.data.ok, false)
})
