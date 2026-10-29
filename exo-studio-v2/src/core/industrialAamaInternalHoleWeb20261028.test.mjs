import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaInternalCutCoverage20261028 as oldInspect} from './industrialAamaInternalCutCoverage20261028.mjs'
import {inspectIndustrialAamaInternalHoleWeb20261028 as inspect} from './industrialAamaInternalHoleWeb20261028.mjs'

// Independently exported Seamly2D 48/52 DXF, never claimed to be received
// by Optitex/Modaris. All injected layer-11 holes are disposable synthetic data.
const zip = unzipSync(readFileSync(
  'research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
const sizes = ['48', '52']
const originals = Object.fromEntries(sizes.map(s =>
  [s, strFromU8(zip[`graded-aama/seamly-size-${s}.dxf`])]))
const parsed = Object.fromEntries(sizes.map(s => [s, parse(originals[s], {unit: 'mm'}).pieces]))
const bounds = pts => ({minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)),
  minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y))})
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const segmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0
  return dist(p, {x: a.x + dx * t, y: a.y + dy * t})
}
const inside = (p, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) &&
        p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
const safe = (p, poly) => inside(p, poly) && poly.every((a, i) =>
  segmentDistance(p, a, poly[(i + 1) % poly.length]) > 22)
const square = (c, half = 5) => [
  {x: c.x - half, y: c.y - half}, {x: c.x + half, y: c.y - half},
  {x: c.x + half, y: c.y + half}, {x: c.x - half, y: c.y + half},
]
const centerBySize = Object.fromEntries(sizes.map(s => {
  const poly = parsed[s][0].cutOutlineMm.points, b = bounds(poly)
  let found = null
  for (let y = b.minY + 30; y < b.maxY - 30 && !found; y += 10)
    for (let x = b.minX + 30; x < b.maxX - 65 && !found; x += 10)
      if (safe({x, y}, poly) && safe({x: x + 32, y}, poly)) found = {x, y}
  assert(found, `${s}: independent CUT piece has two safe disposable hole stations`)
  return [s, found]
}))
const polyline = (points, closed = true) => `  0\nLWPOLYLINE\n  8\n11\n 90\n${points.length}\n 70\n${closed ? 1 : 0}\n` +
  points.map(p => ` 10\n${p.x}\n 20\n${p.y}\n`).join('')
function inject(size, gapMm, {open = false} = {}) {
  const wire = originals[size], piece = parsed[size][0], c = centerBySize[size]
  const block = wire.indexOf('\n  0\nBLOCK\n  8\n1\n  2\n' + piece.name + '\n')
  assert(block > 0)
  const end = wire.indexOf('\n  0\nENDBLK', block)
  assert(end > block)
  const other = {x: c.x + 10 + gapMm, y: c.y}
  return wire.slice(0, end + 1) +
    polyline(square(c)) + polyline(square(other), !open) + wire.slice(end + 1)
}
const makeWires = (gaps = {}) => Object.fromEntries(sizes.map(s =>
  [s, inject(s, gaps[s] ?? 14)]))
function policy(wires) {
  const holesBySize = {}, minimumWebMmBySize = {}
  for (const size of sizes) {
    const pieces = parse(wires[size], {unit: 'mm'}).pieces
    holesBySize[size] = {}
    minimumWebMmBySize[size] = {}
    for (const piece of pieces) {
      const b = bounds(piece.cutOutlineMm.points)
      holesBySize[size][piece.name] = piece.internalCuts.map(h => {
        const p = h.points
        const c = {x: p.reduce((n, q) => n + q.x, 0) / p.length,
          y: p.reduce((n, q) => n + q.y, 0) / p.length}
        return {centerUv: {u: (c.x - b.minX) / (b.maxX - b.minX),
          v: (c.y - b.minY) / (b.maxY - b.minY)},
          areaMm2: 100, perimeterMm: 40}
      })
      minimumWebMmBySize[size][piece.name] = 8
    }
  }
  return {unit: 'mm', holesBySize, minimumWebMmBySize}
}
const blocked = (r, code) => {
  assert.equal(r.ok, false, JSON.stringify(r))
  assert(r.issues.some(i => i.code === code), JSON.stringify(r.issues))
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.factoryApproved, false)
  assert.equal(r.receiverCadVerified, false)
}

test('independent two-size ten-piece source supports explicit zero-hole web inspection only', () => {
  const p = policy(originals), r = inspect(originals, p)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.rows.length, 10)
  assert.equal(r.rows.reduce((n, x) => n + x.pairsInspected, 0), 0)
  assert.equal(r.cuttingAuthorized, false)
})

test('disposable 48/52 garment: 14mm webs pass 8mm all-size inspection, not cutter approval', () => {
  const wires = makeWires(), r = inspect(wires, policy(wires))
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.sizeCount, 2)
  assert.equal(r.rows.reduce((n, x) => n + x.pairsInspected, 0), 2)
  assert.equal(r.rows.filter(x => x.measuredMinimumWebMm !== null).length, 2)
  assert.equal(r.factoryApproved, false)
  assert.equal(r.cuttingAuthorized, false)
})

test('old closed-hole guard accepts nonoverlapping 4mm web; new production guard blocks it', () => {
  const wires = makeWires({'52': 4}), p = policy(wires)
  const old = oldInspect(wires, {unit: p.unit, holesBySize: p.holesBySize})
  assert.equal(old.ok, true, JSON.stringify(old.issues))
  blocked(inspect(wires, p), 'AAMA_INTERNAL_HOLE_WEB_TOO_NARROW')
})

test('exact 8mm gap passes while 7.9mm gap fails, with no silent tolerance widening', () => {
  const exact = makeWires({'48': 8})
  assert.equal(inspect(exact, policy(exact)).ok, true)
  const short = makeWires({'48': 7.9})
  blocked(inspect(short, policy(short)), 'AAMA_INTERNAL_HOLE_WEB_TOO_NARROW')
})

test('one size omitted or piece minimum missing fails closed', () => {
  const wires = makeWires(), p = policy(wires)
  delete p.minimumWebMmBySize['52']
  blocked(inspect(wires, p), 'INVALID_AAMA_HOLE_WEB_POLICY')
  const q = policy(wires)
  delete q.minimumWebMmBySize['48'][parsed['48'][0].name]
  blocked(inspect(wires, q), 'AAMA_HOLE_WEB_PIECE_IDENTITY_DRIFT')
})

test('overlapping and open internal holes cannot bypass existing topology guard', () => {
  const overlapping = makeWires({'48': -2})
  blocked(inspect(overlapping, policy(overlapping)), 'AAMA_HOLE_WEB_BASELINE_BLOCKED')
  const open = {...makeWires(), '52': inject('52', 14, {open: true})}
  blocked(inspect(open, policy(open)), 'AAMA_HOLE_WEB_BASELINE_BLOCKED')
})

test('invalid web minimum, tolerance and missing independent hole inventory fail closed', () => {
  const wires = makeWires(), p = policy(wires)
  p.minimumWebMmBySize['48'][parsed['48'][0].name] = 0
  blocked(inspect(wires, p), 'INVALID_AAMA_HOLE_WEB_PIECE_POLICY')
  blocked(inspect(wires, {...policy(wires), toleranceMm: 1}), 'INVALID_AAMA_HOLE_WEB_POLICY')
  blocked(inspect(wires, {unit: 'mm', minimumWebMmBySize: policy(wires).minimumWebMmBySize}),
    'INVALID_AAMA_HOLE_WEB_POLICY')
})
