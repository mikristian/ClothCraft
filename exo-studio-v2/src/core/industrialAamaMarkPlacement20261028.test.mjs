import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaMarkingCoverage20261028 as coverage} from './industrialAamaMarkingCoverage20261028.mjs'
import {inspectIndustrialAamaMarkPlacement20261028 as inspect} from './industrialAamaMarkPlacement20261028.mjs'

// Independently generated Seamly2D source; marks are injected ONLY into disposable
// local copies, never represented as vendor-received or factory-approved evidence.
const zip = unzipSync(readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
const sizes = ['48', '52']
const originals = Object.fromEntries(sizes.map(size => [size, strFromU8(zip[`graded-aama/seamly-size-${size}.dxf`])]))
const line = (layer, a, b) => `  0\nLINE\n  8\n${layer}\n 10\n${a.x}\n 20\n${a.y}\n 30\n0\n 11\n${b.x}\n 21\n${b.y}\n 31\n0\n`
function marked(wire, {notchShiftMm = 0, grain = 'baseline'} = {}) {
  const first = parse(wire, {unit: 'mm'}).pieces[0]
  const [a, b] = first.cutOutlineMm.points
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2
  const notchA = {x: x + notchShiftMm, y}, notchB = {x: x + notchShiftMm, y: y + 5}
  let grainA = {x, y: y + 40}, grainB = {x, y: y + 90}
  if (grain === 'rotated') {grainA = {x: x - 25, y: y + 65}; grainB = {x: x + 25, y: y + 65}}
  if (grain === 'shifted') {grainA = {x: x + 30, y: y + 40}; grainB = {x: x + 30, y: y + 90}}
  const begin = wire.indexOf('\n  0\nBLOCK\n  8\n1\n  2\n' + first.name + '\n')
  assert(begin > 0)
  const end = wire.indexOf('\n  0\nENDBLK', begin)
  assert(end > begin)
  const output = wire.slice(0, end + 1) + line('4', notchA, notchB) +
    line('7', grainA, grainB) + wire.slice(end + 1)
  assert.equal(parse(output, {unit: 'mm'}).pieces[0].notches.length, 1)
  return output
}
const baseline = Object.fromEntries(sizes.map(size => [size, marked(originals[size])]))
const requirements = Object.fromEntries(sizes.map(size => [size, Object.fromEntries(
  parse(baseline[size], {unit: 'mm'}).pieces.map(piece => [piece.name, {
    expectedNotches: piece.notches.length, requireGrainline: Boolean(piece.grainline), napDirectionRequired: false,
  }]))]))
const bbox = points => ({minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
  minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y))})
const uv = (p, b) => ({u: (p.x - b.minX) / (b.maxX - b.minX), v: (p.y - b.minY) / (b.maxY - b.minY)})
const placement = Object.fromEntries(sizes.map(size => [size, Object.fromEntries(
  parse(baseline[size], {unit: 'mm'}).pieces.map(piece => {
    const b = bbox(piece.cutOutlineMm.points)
    const grain = piece.grainline?.points
    return [piece.name, {
      notchAnchorsUv: piece.notches.map(notch => uv(notch.points[0], b)),
      grainMidpointUv: grain ? uv({x: (grain[0].x + grain[1].x) / 2,
        y: (grain[0].y + grain[1].y) / 2}, b) : null,
      grainAxisDeg: grain ? ((Math.atan2(grain[1].y - grain[0].y,
        grain[1].x - grain[0].x) * 180 / Math.PI) % 180 + 180) % 180 : null,
    }]
  }))]))
const args = () => ({unit: 'mm', requirementsBySize: structuredClone(requirements),
  placementsBySize: structuredClone(placement)})
const blocked = (result, code) => {
  assert.equal(result.ok, false, JSON.stringify(result))
  assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.receiverCadVerified, false)
}

test('two independent-source sizes and ten pieces pass explicit local mark station and grainline policy', () => {
  const result = inspect(baseline, args())
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.sizeCount, 2)
  assert.equal(result.rows.length, 10)
  assert.equal(result.rows.filter(row => row.notchStationsVerified === 1).length, 2)
  assert.equal(result.rows.filter(row => row.grainAxisAndMidpointVerified).length, 2)
  assert.equal(result.napDirectionVerified, false)
  assert.equal(result.cuttingAuthorized, false)
  assert.equal(result.factoryApproved, false)
  assert.equal(result.receiverCadVerified, false)
})

test('notch relocated 40mm along same valid CUT edge escapes count/anchor guard but is rejected by placement policy', () => {
  const wires = {...baseline, '48': marked(originals['48'], {notchShiftMm: 40})}
  assert.equal(coverage(wires, {unit: 'mm', requirementsBySize: requirements}).ok, true)
  blocked(inspect(wires, args()), 'AAMA_NOTCH_STATION_DRIFT')
})

test('90-degree rotated grainline remains within CUT but violates warp-axis policy', () => {
  const wires = {...baseline, '52': marked(originals['52'], {grain: 'rotated'})}
  assert.equal(coverage(wires, {unit: 'mm', requirementsBySize: requirements}).ok, true)
  blocked(inspect(wires, args()), 'AAMA_GRAINLINE_PLACEMENT_DRIFT')
})

test('parallel grainline shifted 30mm inside CUT is rejected by midpoint policy', () => {
  const wires = {...baseline, '48': marked(originals['48'], {grain: 'shifted'})}
  assert.equal(coverage(wires, {unit: 'mm', requirementsBySize: requirements}).ok, true)
  blocked(inspect(wires, args()), 'AAMA_GRAINLINE_PLACEMENT_DRIFT')
})

test('missing size, missing piece and forged malformed coordinate policy fail closed', () => {
  const p1 = args(); delete p1.placementsBySize['52']
  blocked(inspect(baseline, p1), 'INVALID_AAMA_PLACEMENT_POLICY')
  const p2 = args(); delete p2.placementsBySize['48'][Object.keys(p2.placementsBySize['48'])[0]]
  blocked(inspect(baseline, p2), 'AAMA_PLACEMENT_PIECE_POLICY_DRIFT')
  const p3 = args(); p3.placementsBySize['48'][Object.keys(p3.placementsBySize['48'])[0]].notchAnchorsUv[0].u = 1.5
  blocked(inspect(baseline, p3), 'INVALID_AAMA_PIECE_PLACEMENT_POLICY')
})

test('mark placement cannot bypass baseline notch coverage or imply production authorization', () => {
  const wires = {...baseline, '52': originals['52']}
  blocked(inspect(wires, args()), 'AAMA_REQUIRED_MARKS_MISSING_OR_EXTRA')
  const p = args(); p.grainAxisToleranceDeg = 100
  blocked(inspect(baseline, p), 'INVALID_AAMA_PLACEMENT_POLICY')
})
