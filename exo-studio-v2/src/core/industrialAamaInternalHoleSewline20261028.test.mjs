import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {inspectIndustrialAamaStitchHoleClearance20261028 as inspectPrior} from './industrialAamaStitchHoleClearance20261028.mjs'
import {inspectIndustrialAamaInternalHoleSewline20261028 as inspect} from './industrialAamaInternalHoleSewline20261028.mjs'

const sizes = ['48', '52'], names = ['FRONT', 'BACK']
const rect = (x, y, w, h) => [{x, y}, {x: x + w, y},
  {x: x + w, y: y + h}, {x, y: y + h}]
const poly = (layer, points) => `0\nLWPOLYLINE\n8\n${layer}\n90\n${points.length}\n70\n1\n` +
  points.map(p => `10\n${p.x}\n20\n${p.y}\n`).join('')
const sew = points => ({expectedAllowanceMm: 5, stitchOutlineMm: points,
  stitchSource: 'separately-supplied-manufacturing-sewline'})
const fixture = ({twoHoles = false} = {}) => {
  const wires = {}, allowancesBySize = {}, holesBySize = {}, holeSewlinesBySize = {}
  for (const size of sizes) {
    allowancesBySize[size] = {}
    holesBySize[size] = {}
    holeSewlinesBySize[size] = {}
    const blocks = names.map(name => {
      const width = name === 'FRONT' ? 120 : 130
      const height = size === '48' ? 160 : 180
      const cut = rect(0, 0, width, height)
      const positions = twoHoles ? [rect(35, 65, 20, 20), rect(61, 65, 20, 20)] :
        [rect(45, 65, 20, 20)]
      allowancesBySize[size][name] = {expectedAllowanceMm: 10,
        stitchOutlineMm: rect(10, 10, width - 20, height - 20),
        stitchSource: 'separately-supplied-manufacturing-sewline'}
      holesBySize[size][name] = positions.map(h => ({
        centerUv: {u: (h[0].x + h[2].x) / (2 * width),
          v: (h[0].y + h[2].y) / (2 * height)},
        areaMm2: 400, perimeterMm: 80,
      }))
      holeSewlinesBySize[size][name] = positions.map(h =>
        sew(rect(h[0].x - 5, h[0].y - 5, 30, 30)))
      return `0\nBLOCK\n8\n1\n2\n${name}\n` + poly('1', cut) +
        positions.map(h => poly('11', h)).join('') + '0\nENDBLK\n'
    }).join('')
    const inserts = names.map(name => `0\nINSERT\n8\n1\n2\n${name}\n`).join('')
    wires[size] = `0\nSECTION\n2\nBLOCKS\n${blocks}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${inserts}0\nENDSEC\n0\nEOF\n`
  }
  return {wires, opts: {unit: 'mm', allowancesBySize, holesBySize,
    holeSewlinesBySize, minStitchToHoleMm: 3}}
}
const blocked = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(i => i.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.receiverCadVerified, false)
}

test('two-size two-piece garment inspects four explicit hole sewlines without authorizing cutting', () => {
  const {wires, opts} = fixture()
  const result = inspect(wires, opts)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.sizeCount, 2)
  assert.equal(result.rows.length, 4)
  assert.equal(result.internalHoleSewlinesInspected, true)
  assert.equal(result.independentSewlineAuthenticated, false)
  assert.equal(result.cuttingAuthorized, false)
})

test('prior outer allowance/hole clearance accepted missing hole sewlines; new gate blocks them', () => {
  const {wires, opts} = fixture()
  assert.equal(inspectPrior(wires, opts).ok, true)
  delete opts.holeSewlinesBySize['48'].FRONT
  blocked(inspect(wires, opts), 'AAMA_HOLE_SEWLINE_PIECE_IDENTITY_DRIFT')
})

test('hole sewline shifted 3 mm while still enclosing hole is rejected', () => {
  const {wires, opts} = fixture()
  opts.holeSewlinesBySize['48'].FRONT[0].stitchOutlineMm =
    rect(43, 60, 30, 30)
  blocked(inspect(wires, opts), 'AAMA_HOLE_SEWLINE_OFFSET_DRIFT')
})

test('undersized or overwide hole allowances are rejected', () => {
  for (const [x, w] of [[43, 24], [35, 40]]) {
    const {wires, opts} = fixture()
    opts.holeSewlinesBySize['52'].BACK[0].stitchOutlineMm =
      rect(x, x === 43 ? 63 : 55, w, w)
    blocked(inspect(wires, opts), 'AAMA_HOLE_SEWLINE_OFFSET_DRIFT')
  }
})

test('hole sewline crossing the CUT hole or the outer STITCH is rejected', () => {
  const a = fixture()
  a.opts.holeSewlinesBySize['48'].FRONT[0].stitchOutlineMm =
    rect(50, 60, 30, 30)
  blocked(inspect(a.wires, a.opts), 'AAMA_HOLE_SEWLINE_TOPOLOGY_DRIFT')
  const b = fixture()
  b.opts.holeSewlinesBySize['52'].BACK[0].stitchOutlineMm =
    rect(5, 60, 65, 30)
  blocked(inspect(b.wires, b.opts), 'AAMA_HOLE_SEWLINE_TOPOLOGY_DRIFT')
})

test('two individually valid hole sewlines collide and are blocked', () => {
  const {wires, opts} = fixture({twoHoles: true})
  assert.equal(inspectPrior(wires, opts).ok, true)
  blocked(inspect(wires, opts), 'AAMA_HOLE_SEWLINE_COLLISION')
})

test('invalid sewline topology, untrusted source claim, and missing size are blocked', () => {
  const a = fixture()
  a.opts.holeSewlinesBySize['48'].FRONT[0].stitchOutlineMm =
    [{x: 40, y: 60}, {x: 70, y: 90}, {x: 40, y: 90}, {x: 70, y: 60}]
  blocked(inspect(a.wires, a.opts), 'INVALID_AAMA_HOLE_SEWLINE_EVIDENCE')
  const b = fixture()
  b.opts.holeSewlinesBySize['48'].FRONT[0].stitchSource = 'aama-layer-8-draw'
  blocked(inspect(b.wires, b.opts), 'INVALID_AAMA_HOLE_SEWLINE_EVIDENCE')
  const c = fixture()
  delete c.opts.holeSewlinesBySize['52']
  blocked(inspect(c.wires, c.opts), 'INVALID_AAMA_HOLE_SEWLINE_POLICY')
})

test('missing hole sewline and missing hole inventory both fail closed', () => {
  const a = fixture()
  a.opts.holeSewlinesBySize['48'].FRONT = []
  blocked(inspect(a.wires, a.opts), 'AAMA_HOLE_SEWLINE_COUNT_DRIFT')
  const b = fixture()
  b.opts.holesBySize['52'].BACK = []
  blocked(inspect(b.wires, b.opts), 'AAMA_HOLE_SEWLINE_PREREQUISITE_BLOCKED')
})

test('independent Seamly2D sizes 48 and 52 remain blocked without manufacturing sewlines', () => {
  const zip = unzipSync(readFileSync(
    'research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
  const wires = Object.fromEntries(sizes.map(size =>
    [size, strFromU8(zip[`graded-aama/seamly-size-${size}.dxf`])]))
  blocked(inspect(wires, {unit: 'mm', minStitchToHoleMm: 3,
    allowancesBySize: {'48': {}, '52': {}},
    holesBySize: {'48': {}, '52': {}},
    holeSewlinesBySize: {'48': {}, '52': {}}}),
  'AAMA_HOLE_SEWLINE_PREREQUISITE_BLOCKED')
})
