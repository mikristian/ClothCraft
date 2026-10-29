import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {inspectIndustrialAamaAllowanceOffset20261028 as inspectOuter} from './industrialAamaAllowanceOffset20261028.mjs'
import {inspectIndustrialAamaStitchHoleClearance20261028 as inspect} from './industrialAamaStitchHoleClearance20261028.mjs'

const sizes = ['48', '52']
const names = ['FRONT', 'BACK']
const rect = (x, y, w, h) => [{x, y}, {x: x + w, y}, {x: x + w, y: y + h}, {x, y: y + h}]
const poly = (layer, points, closed = true) => `0\nLWPOLYLINE\n8\n${layer}\n90\n${points.length}\n70\n${closed ? 1 : 0}\n` +
  points.map(p => `10\n${p.x}\n20\n${p.y}\n`).join('')
const cut = (size, name) => rect(0, 0, name === 'FRONT' ? 100 + (size === '52' ? 20 : 0) : 110,
  140 + (size === '52' ? 20 : 0))
const defaultHole = (size, name) => name === 'FRONT' ? rect(40, 60, 10, 10) : rect(50, 60, 10, 10)
const fixture = (override = () => null) => {
  const holes = {}, wires = {}, allowancesBySize = {}, holesBySize = {}
  for (const size of sizes) {
    allowancesBySize[size] = {}
    holesBySize[size] = {}
    const blocks = names.map(name => {
      const outer = cut(size, name), hole = override(size, name) ?? {points: defaultHole(size, name), closed: true}
      holes[`${size}:${name}`] = hole
      const w = outer[1].x - outer[0].x, h = outer[2].y - outer[1].y
      allowancesBySize[size][name] = {expectedAllowanceMm: 10,
        stitchOutlineMm: rect(10, 10, w - 20, h - 20),
        stitchSource: 'separately-supplied-manufacturing-sewline'}
      holesBySize[size][name] = hole.closed ? [{
        centerUv: {u: (hole.points[0].x + hole.points[2].x) / (2 * w),
          v: (hole.points[0].y + hole.points[2].y) / (2 * h)},
        areaMm2: Math.abs((hole.points[1].x - hole.points[0].x) *
          (hole.points[2].y - hole.points[1].y)),
        perimeterMm: 2 * (Math.abs(hole.points[1].x - hole.points[0].x) +
          Math.abs(hole.points[2].y - hole.points[1].y)),
      }] : []
      return `0\nBLOCK\n8\n1\n2\n${name}\n` + poly('1', outer) +
        poly('11', hole.points, hole.closed) + '0\nENDBLK\n'
    }).join('')
    const inserts = names.map(name => `0\nINSERT\n8\n1\n2\n${name}\n`).join('')
    wires[size] = `0\nSECTION\n2\nBLOCKS\n${blocks}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${inserts}0\nENDSEC\n0\nEOF\n`
  }
  return {wires, opts: {unit: 'mm', allowancesBySize, holesBySize,
    minStitchToHoleMm: 3, centerToleranceMm: 0.1, areaToleranceMm2: 0.1,
    perimeterToleranceMm: 0.1}}
}
const blocked = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.receiverCadVerified, false)
}

test('two-size two-piece disposable CUT/STITCH plus layer-11 holes pass clearance inspection only', () => {
  const {wires, opts} = fixture()
  const result = inspect(wires, opts)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.sizeCount, 2)
  assert.equal(result.rows.length, 4)
  assert.equal(result.rows.reduce((n, row) => n + row.internalCuts, 0), 4)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.independentSewlineAuthenticated, false)
})

test('existing outer seam allowance check misses a layer-11 hole intersecting the STITCH line', () => {
  const {wires, opts} = fixture((size, name) => size === '48' && name === 'FRONT'
    ? {points: rect(8, 60, 6, 10), closed: true} : null)
  assert.equal(inspectOuter(wires, opts).ok, true)
  blocked(inspect(wires, opts), 'AAMA_STITCH_INTERNAL_CUT_CLEARANCE_DRIFT')
})

test('nearby but nonintersecting internal cut still violates declared minimum sewing clearance', () => {
  const {wires, opts} = fixture((size, name) => size === '52' && name === 'FRONT'
    ? {points: rect(12, 60, 4, 10), closed: true} : null)
  assert.equal(inspectOuter(wires, opts).ok, true)
  blocked(inspect(wires, opts), 'AAMA_STITCH_INTERNAL_CUT_CLEARANCE_DRIFT')
})

test('hole entirely enclosing a stitch loop is rejected even without edge intersections', () => {
  const {wires, opts} = fixture((size, name) => size === '48' && name === 'FRONT'
    ? {points: rect(5, 5, 90, 130), closed: true} : null)
  assert.equal(inspectOuter(wires, opts).ok, true)
  blocked(inspect(wires, opts), 'AAMA_STITCH_INSIDE_INTERNAL_CUT')
})

test('open internal slit fails closed even when outer allowance geometry passes', () => {
  const {wires, opts} = fixture((size, name) => size === '48' && name === 'BACK'
    ? {points: rect(50, 60, 10, 10), closed: false} : null)
  assert.equal(inspectOuter(wires, opts).ok, true)
  blocked(inspect(wires, opts), 'AAMA_INTERNAL_CUT_INVENTORY_NOT_VERIFIED')
})

test('missing all-size hole policy and forged zero-hole inventory are rejected', () => {
  const a = fixture()
  delete a.opts.holesBySize['52']
  blocked(inspect(a.wires, a.opts), 'AAMA_INTERNAL_CUT_INVENTORY_NOT_VERIFIED')
  const b = fixture()
  b.opts.holesBySize['48'].FRONT = []
  blocked(inspect(b.wires, b.opts), 'AAMA_INTERNAL_CUT_INVENTORY_NOT_VERIFIED')
})

test('invalid clearance requirement and missing separate STITCH evidence are rejected', () => {
  const a = fixture()
  a.opts.minStitchToHoleMm = -1
  blocked(inspect(a.wires, a.opts), 'INVALID_AAMA_STITCH_HOLE_CLEARANCE_POLICY')
  const b = fixture()
  delete b.opts.allowancesBySize['52'].BACK
  blocked(inspect(b.wires, b.opts), 'AAMA_OUTER_ALLOWANCE_NOT_VERIFIED')
})

test('independent Seamly2D source cannot be promoted to manufacturing approval without stitch evidence', () => {
  const zip = unzipSync(readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
  const wires = Object.fromEntries(sizes.map(size => [size, strFromU8(zip[`graded-aama/seamly-size-${size}.dxf`])]))
  blocked(inspect(wires, {unit: 'mm', minStitchToHoleMm: 3}),
    'AAMA_OUTER_ALLOWANCE_NOT_VERIFIED')
})
