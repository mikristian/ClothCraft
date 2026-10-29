import test from 'node:test'
import assert from 'node:assert/strict'
import { planPrintedMarkerPageRegistration20261024 as plan, auditPrintedMarkerPageRegistration20261024 as audit } from './accumarkPrintedPageRegistration20261024.mjs'

const pages = (heights) => { let startCm = 0; return heights.map(heightCm => { const p = { startCm, endCm: startCm + heightCm, heightCm }; startCm += heightCm; return p }) }
const marker = (width, heights, placements = []) => ({ width, length: heights.reduce((a, b) => a + b, 0), placements })
const rect = (x0, y0, x1, y1) => ({ outline: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] })

test('two distinct printable targets per page, station identities, immutable inputs and canonical audit', () => {
  const hs = [12, 14, 10], m = marker(20, hs), p = pages(hs)
  const original = structuredClone({ m, p })
  const result = plan(m, p, { size: 'M', fabricId: 'Cotton' })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.pages.length, 3)
  assert.deepEqual(result.pages.map(x => x.targets.length), [2, 2, 2])
  for (const [i, pg] of result.pages.entries()) {
    assert.equal(pg.startCm, p[i].startCm)
    assert.equal(pg.endCm, p[i].endCm)
    assert.match(pg.targets[0].label.text, new RegExp(`P${i + 1}/3 A M Cotton`))
    assert.match(pg.targets[1].label.text, new RegExp(`P${i + 1}/3 B M Cotton`))
    assert.equal(pg.targets[0].segments.length, 2)
    assert.equal(pg.targets[1].segments.length, 3)
    for (const t of pg.targets) for (const s of t.segments) for (const v of s) {
      assert.ok(v.x >= .5 && v.x <= m.width - .5)
      assert.ok(v.y >= .5 && v.y <= pg.endCm - pg.startCm - .5)
    }
  }
  assert.equal(audit(m, p, result, { size: 'M', fabricId: 'Cotton' }).ok, true)
  assert.deepEqual({ m, p }, original)
  assert.equal(result.physicallyRegistered, false)
})

test('reject narrow multi-page area and accept single-page narrow calibration case', () => {
  const hs = [3, 3], m = marker(2, hs)
  const result = plan(m, pages(hs))
  assert.equal(result.ok, false)
  assert.equal(result.issues[0].code, 'NO_SAFE_REGISTRATION_POSITION')
  const single = plan(marker(1, [2]), pages([2]))
  assert.equal(single.ok, true)
  assert.deepEqual(single.pages[0].targets, [])
})

test('collision blocks all space and safe planner refuses instead of printing over cut ink', () => {
  const hs = [12, 12]
  const m = marker(20, hs, [rect(0, 0, 20, 24)])
  const result = plan(m, pages(hs))
  assert.equal(result.ok, false)
  assert.equal(result.pages.length, 0)
})

test('may relocate targets when near top edge, left side and the ruler are obstructed', () => {
  const hs = [15, 15]
  const m = marker(30, hs, [rect(0, 0, 12, 3), rect(0, 15, 12, 18)])
  const result = plan(m, pages(hs))
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.ok(result.pages[0].targets[0].segments[0][0].x > 11)
  assert.equal(result.pages[1].targets.length, 2)
})

test('fails closed on malformed page stations or outlined geometry and mutated audit', () => {
  const hs = [12, 12], m = marker(20, hs), p = pages(hs)
  assert.equal(plan(m, [p[1], p[0]]).ok, false)
  assert.equal(plan(marker(20, hs, [{ outline: [{ x: 0, y: 0 }] }]), p).ok, false)
  const output = plan(m, p)
  const altered = structuredClone(output)
  altered.pages[0].targets[0].segments[0][0].x = 0
  assert.equal(audit(m, p, altered).ok, false)
})

test('many placements trigger global rectangle work budget deterministically without mutation', () => {
  const hs = [100, 100]
  // Every box overlaps the candidate's label, but is placed behind 6000
  // off-candidate boxes to exercise the actual comparisons, not candidate count.
  const obstacles = Array.from({ length: 6000 }, (_, i) => rect(500 + i * .001, 0, 500.0005 + i * .001, 200))
  obstacles.push(rect(0, 0, 40, 200))
  const m = marker(40, hs, obstacles)
  const p = pages(hs)
  const before = structuredClone({ m, p })
  const first = plan(m, p)
  const second = plan(m, p)
  assert.deepEqual(first, second)
  assert.equal(first.ok, false)
  assert.equal(first.issues[0].code, 'REGISTRATION_WORK_BUDGET')
  assert.equal(first.pages.length, 0)
  assert.deepEqual({ m, p }, before)
})

test('conservative printed W label occupancy does not overlap nearby cut rectangle', () => {
  const hs = [12, 12]
  const m = marker(24, hs, [rect(6, 1.1, 8, 1.6), rect(6, 13.1, 8, 13.6)])
  const result = plan(m, pages(hs), { size: 'WWWW', fabricId: 'WWWW' })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  for (const [index, pg] of result.pages.entries()) for (const target of pg.targets) {
    const label = target.label
    const box = { x0: label.x, x1: label.x + label.text.length * .25, y0: label.y - .34, y1: label.y + .06 }
    const cut = { x0: 6, x1: 8, y0: 1.1, y1: 1.6 }
    assert.ok(box.x0 >= cut.x1 + .1 || box.x1 <= cut.x0 - .1 || box.y0 >= cut.y1 + .1 || box.y1 <= cut.y0 - .1, `Page ${index + 1} overlaps cut ink`)
  }
})
