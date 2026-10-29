// DEVELOPMENT-ONLY DIAGNOSTIC. An explicitly injected user-site fitz is untrusted;
// passing these tests never authenticates a Python runtime or approves production.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const python = '/usr/bin/python3'
const checker = fileURLToPath(new URL('./factoryZipPdfTrustedVectorParity20261024_1956.py', import.meta.url))
const options = { encoding: 'utf8', timeout: 12_000, maxBuffer: 1_000_000,
  env: { PATH: '/usr/bin:/bin' } }

function run(args, input) {
  const result = spawnSync(python, args, { ...options, input })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return result
}

// This path is deliberately discovered outside isolation and is NOT trusted.
const probe = run(['-c', 'import site; print(site.getusersitepackages())'])
const userSite = probe.status === 0 ? probe.stdout.trim() : ''
let hasUserFitz = false
if (userSite) {
  try { accessSync(join(userSite, 'fitz', '__init__.py'), constants.R_OK); hasUserFitz = true } catch {}
}

const diagnostic = String.raw`
import runpy,sys
sys.path.insert(0,sys.argv[1])  # UNTRUSTED diagnostic user site, never production
sys.argv=[sys.argv[2],*sys.argv[3:]]
runpy.run_path(sys.argv[0],run_name='__main__')
`
const fixtureDiagnostic = String.raw`
import sys
sys.path.insert(0,sys.argv[1])  # UNTRUSTED diagnostic user site
source,variant=sys.argv[2:4]
sys.argv=['fixture',variant]
exec(source)
`

const fixture = String.raw`
import base64,fitz,sys
s=72/2.54
d=fitz.open(); p=d.new_page(width=50*s,height=50*s)
d.xref_set_key(p.xref,'EXOStartCm','0'); d.xref_set_key(p.xref,'EXOEndCm','50')
q=[fitz.Point(x*s,y*s) for x,y in ((10,10),(21,11),(22,17),(19,21),(9,20))]
shape=p.new_shape()
for a,b in zip(q,q[1:]+q[:1]): shape.draw_line(a,b)
shape.finish(color=(0,0,0),width=.8); shape.commit()
for x in (2,3,4,5): p.draw_line((x*s,39*s),(x*s,41*s),color=(0,0,0),width=.5)
if sys.argv[1]=='changed': p.draw_line((4*s,12*s),(6*s,12*s),color=(1,0,0),width=.5)
sys.stdout.write(base64.b64encode(d.tobytes()).decode('ascii'))
`

function pdf(variant) {
  const source = run(['-I', '-c', fixtureDiagnostic, userSite, fixture, variant])
  assert.equal(source.status, 0, source.stderr)
  assert.match(source.stdout, /^[A-Za-z0-9+/]+={0,2}$/)
  return source.stdout
}

function verify(referencePdf, candidatePdf) {
  const body = JSON.stringify({ pages: 1, width: 50, length: 50,
    contours: [[[10,10],[21,11],[22,17],[19,21],[9,20]]], referencePdf, candidatePdf })
  const result = run(['-I', '-c', diagnostic, userSite, checker], body)
  assert.ok(result.stdout.trim(), result.stderr)
  return { status: result.status, output: JSON.parse(result.stdout) }
}

test('fixed isolated interpreter excludes user-site fitz', () => {
  const p = run(['-I', '-c', 'import fitz; print(fitz.__file__)'])
  assert.notEqual(p.status, 0, `unexpected fitz import: ${p.stdout}`)
  assert.match(p.stderr, /ModuleNotFoundError: No module named 'fitz'/)
})

test('UNTRUSTED DIAGNOSTIC: explicitly injected user-site fitz passes valid vector/raster parity',
  { skip: !hasUserFitz && 'user-site fitz absent', timeout: 30_000 }, () => {
    const original = pdf('same')
    const checked = verify(original, original)
    assert.equal(checked.status, 0, JSON.stringify(checked))
    assert.equal(checked.output.ok, true)
    assert.ok(checked.output.drawings >= 5)
  })

test('UNTRUSTED DIAGNOSTIC: changed PDF is rejected by the same verifier',
  { skip: !hasUserFitz && 'user-site fitz absent', timeout: 30_000 }, () => {
    const checked = verify(pdf('same'), pdf('changed'))
    assert.equal(checked.status, 1, JSON.stringify(checked))
    assert.equal(checked.output.ok, false)
    assert.match(checked.output.reason, /vector\/text parity mismatch/)
  })
