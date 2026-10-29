import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaMarkingCoverage20261028 as marks} from './industrialAamaMarkingCoverage20261028.mjs'
import {inspectIndustrialAamaInternalCutCoverage20261028 as inspect} from './industrialAamaInternalCutCoverage20261028.mjs'

// Real independent Seamly2D AAMA source, read-only. ALL added layer-11 holes
// are synthetic disposable garment mutations, NOT third-party receiving CAD.
const zip = unzipSync(readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
const sizes = ['48', '52']
const originals = Object.fromEntries(sizes.map(s => [s, strFromU8(zip[`graded-aama/seamly-size-${s}.dxf`])]))
const first = Object.fromEntries(sizes.map(s => [s, parse(originals[s], {unit: 'mm'}).pieces[0]]))
const bounds = pts => ({minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)),
  minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y))})
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const edgeDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0
  return dist(p, {x: a.x + t * dx, y: a.y + t * dy})
}
const inside = (p, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
const safe = (p, poly, margin = 15) => inside(p, poly) && poly.every((a, i) =>
  edgeDistance(p, a, poly[(i + 1) % poly.length]) > margin)
const centers = Object.fromEntries(sizes.map(size => {
  const poly = first[size].cutOutlineMm.points, b = bounds(poly), found = []
  for (let y = b.minY + 20; y < b.maxY - 20; y += 10) for (let x = b.minX + 20; x < b.maxX - 20; x += 10) {
    if (safe({x, y}, poly)) found.push({x, y})
  }
  assert(found.length, `${size} source has space for a disposable internal hole`)
  const second = found.find(p => dist(p, found[0]) > 35)
  assert(second, `${size} source has two separate safe internal hole stations`)
  return [size, [found[0], second]]
}))
const square = (p, half = 5) => [{x: p.x - half, y: p.y - half},
  {x: p.x + half, y: p.y - half}, {x: p.x + half, y: p.y + half}, {x: p.x - half, y: p.y + half}]
const lwpoly = (pts, {closed = true} = {}) => `  0\nLWPOLYLINE\n  8\n11\n 90\n${pts.length}\n 70\n${closed ? 1 : 0}\n` +
  pts.map(p => ` 10\n${p.x}\n 20\n${p.y}\n`).join('')
function injected(size, shapes) {
  const wire = originals[size], piece = first[size]
  const begin = wire.indexOf('\n  0\nBLOCK\n  8\n1\n  2\n' + piece.name + '\n')
  assert(begin > 0)
  const end = wire.indexOf('\n  0\nENDBLK', begin)
  assert(end > begin)
  return wire.slice(0, end + 1) + shapes.map(s => lwpoly(s.points, s)).join('') + wire.slice(end + 1)
}
const baseline = Object.fromEntries(sizes.map(s => [s, injected(s, [{points: square(centers[s][0])}])]))
const policy = () => Object.fromEntries(sizes.map(s => [s, Object.fromEntries(
  parse(baseline[s], {unit: 'mm'}).pieces.map(piece => {
    const b = bounds(piece.cutOutlineMm.points)
    return [piece.name, piece.internalCuts.map(hole => {
      const p = hole.points, center = {x: p.reduce((sum, v) => sum + v.x, 0) / p.length,
        y: p.reduce((sum, v) => sum + v.y, 0) / p.length}
      return {centerUv: {u: (center.x - b.minX) / (b.maxX - b.minX),
        v: (center.y - b.minY) / (b.maxY - b.minY)}, areaMm2: 100, perimeterMm: 40}
    })]
  }))]))
const options = () => ({unit: 'mm', holesBySize: policy()})
const blocked = (r, code) => {
  assert.equal(r.ok, false, JSON.stringify(r))
  assert(r.issues.some(issue => issue.code === code), JSON.stringify(r.issues))
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.factoryApproved, false)
  assert.equal(r.receiverCadVerified, false)
}

test('independent two-size, ten-piece Seamly source with no internal cuts passes only explicit zero-hole inspection', () => {
  const p = options()
  for (const size of sizes) for (const piece of Object.keys(p.holesBySize[size])) p.holesBySize[size][piece] = []
  const r = inspect(originals, p)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.rows.length, 10)
  assert.equal(r.rows.reduce((n, row) => n + row.closedInternalCutsInspected, 0), 0)
  assert.equal(r.cuttingAuthorized, false)
})

test('disposable two-size layer-11 closed holes are inspected without cutting authorization', () => {
  const r = inspect(baseline, options())
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.sizeCount, 2)
  assert.equal(r.rows.reduce((n, row) => n + row.closedInternalCutsInspected, 0), 2)
  assert.equal(r.factoryApproved, false)
  assert.equal(r.receiverCadVerified, false)
  assert.equal(r.cuttingAuthorized, false)
})

test('missing layer-11 hole in one size passes legacy mark coverage but fails new production requirement', () => {
  const wires = {...baseline, '52': originals['52']}
  const markingPolicy = Object.fromEntries(sizes.map(s => [s, Object.fromEntries(
    parse(wires[s], {unit: 'mm'}).pieces.map(piece => [piece.name,
      {expectedNotches: 0, requireGrainline: false, napDirectionRequired: false}]))]))
  assert.equal(marks(wires, {unit: 'mm', requirementsBySize: markingPolicy}).ok, true)
  blocked(inspect(wires, options()), 'AAMA_INTERNAL_CUT_COUNT_DRIFT')
})

test('closed internal hole moved to a different valid interior station fails placement parity', () => {
  const wires = {...baseline, '48': injected('48', [{points: square(centers['48'][1])}])}
  blocked(inspect(wires, options()), 'AAMA_INTERNAL_CUT_GEOMETRY_DRIFT')
})

test('hole shifted outside CUT, and open slit, are rejected independently of hole count', () => {
  const b = bounds(first['52'].cutOutlineMm.points)
  const outside = {...baseline, '52': injected('52', [{points: square({x: b.maxX + 30, y: b.maxY + 30})}])}
  blocked(inspect(outside, options()), 'AAMA_INTERNAL_CUT_OUTSIDE_CUT')
  const open = {...baseline, '52': injected('52', [{points: square(centers['52'][0]), closed: false}])}
  blocked(inspect(open, options()), 'AAMA_INTERNAL_CUT_UNSUPPORTED_OR_INVALID')
})

test('self-intersecting hole and overlapping duplicate holes fail closed', () => {
  const p = centers['48'][0]
  const bowtie = [{x: p.x - 5, y: p.y - 5}, {x: p.x + 5, y: p.y + 5},
    {x: p.x - 5, y: p.y + 5}, {x: p.x + 5, y: p.y - 5}]
  blocked(inspect({...baseline, '48': injected('48', [{points: bowtie}])}, options()),
    'AAMA_INTERNAL_CUT_UNSUPPORTED_OR_INVALID')
  const dup = {...baseline, '48': injected('48', [
    {points: square(p)}, {points: square({x: p.x + 2, y: p.y + 2})}])}
  const spec = options()
  spec.holesBySize['48'][first['48'].name].push(structuredClone(spec.holesBySize['48'][first['48'].name][0]))
  blocked(inspect(dup, spec), 'AAMA_INTERNAL_CUT_HOLES_OVERLAP')
})

test('changed hole area, missing piece policy, and missing size fail closed', () => {
  const changed = {...baseline, '48': injected('48', [{points: square(centers['48'][0], 8)}])}
  blocked(inspect(changed, options()), 'AAMA_INTERNAL_CUT_GEOMETRY_DRIFT')
  const p = options(); delete p.holesBySize['52'][first['52'].name]
  blocked(inspect(baseline, p), 'AAMA_INTERNAL_CUT_PIECE_IDENTITY_DRIFT')
  const q = options(); delete q.holesBySize['52']
  blocked(inspect(baseline, q), 'INVALID_AAMA_INTERNAL_CUT_POLICY')
})
