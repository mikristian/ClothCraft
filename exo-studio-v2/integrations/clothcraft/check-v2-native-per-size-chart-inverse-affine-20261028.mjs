// Real-Rust affine inverse acceptance, isolated to a disposable workspace.
// Reuse the established six-size scaled fixture setup and checks with an
// additive saved constant. Reject genuinely nonlinear source formulas.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(new URL('./check-v2-native-per-size-chart-inverse-scaled-20261027.mjs', import.meta.url), 'utf8')
const original = "halfWidth * 2"
const affine = 'halfWidth * 2 + 10'
let fixture = source.replaceAll(original, affine)
assert.notEqual(fixture, source, 'Scaled fixture did not contain expected authored source')
// In this fixture the initial geometry is 400 mm, so using additive 10 mm
// with a 2x coefficient requires the direct baseline of 195 mm.
fixture = fixture.replaceAll('halfWidth:{valueMm:200}', 'halfWidth:{valueMm:195}')
fixture = fixture.replaceAll('const half=200+offsets[size]*500,w=half*2', 'const half=195+offsets[size]*500,w=half*2+10')
fixture = fixture.replaceAll('directPerSizeDeltaMm:5', 'directPerSizeDeltaMm:5')
fixture = fixture.replaceAll("bindings.measurements.width.formula='halfWidth + 200'", "bindings.measurements.width.formula='halfWidth * halfWidth'")
fixture = fixture.replaceAll('non-affine computed formula rejected', 'nonlinear computed formula rejected')
fixture = fixture.replaceAll('/only a direct measurement times a constant|invertible|inverse/i', '/affine|inverse|source|multiplier|nonlinear/i')
fixture = fixture.replaceAll('nonAffineRejected:true', 'nonlinearRejected:true')
assert.match(fixture, /halfWidth \* halfWidth/, 'No nonlinear negative fixture')
assert.match(fixture, /halfWidth \* 2 \+ 10/, 'No affine saved formula')
const {spawnSync} = await import('node:child_process')
// The reused fixture imports local modules relative to its location, so run
// it from a fresh temporary sibling script and clean that script afterward.
const entry = path.join(path.dirname(new URL(import.meta.url).pathname),
  `.tmp-affine-inverse-${process.pid}.mjs`)
try {
  fs.writeFileSync(entry, fixture, {flag:'wx'})
  const result = spawnSync(process.execPath, [entry], {stdio:'inherit'})
  assert.equal(result.status, 0, `Affine real-Rust fixture exited ${result.status}; ${result.error||''}`)
} finally {
  fs.rmSync(entry, {force:true})
}
