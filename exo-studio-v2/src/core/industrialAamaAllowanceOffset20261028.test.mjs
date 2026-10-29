import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaAllowanceOffset20261028 as inspect} from './industrialAamaAllowanceOffset20261028.mjs'

const sizes = ['48', '52']
const rect = (x, y, w, h) => [{x, y}, {x: x + w, y}, {x: x + w, y: y + h}, {x, y: y + h}]
const poly = (layer, points) => `0\nLWPOLYLINE\n8\n${layer}\n90\n${points.length}\n70\n1\n` +
  points.map(p => `10\n${p.x}\n20\n${p.y}\n`).join('')
const pieceRect = (size, name) => {
  const wide = size === '52' ? 20 : 0
  return name === 'FRONT' ? rect(0, 0, 100 + wide, 140 + wide) :
    rect(0, 0, 110 + wide, 130 + wide)
}
const wire = (size, {fakeDraw = false} = {}) => {
  const blocks = ['FRONT', 'BACK'].map(name =>
    `0\nBLOCK\n8\n1\n2\n${name}\n` +
    poly('1', pieceRect(size, name)) +
    (fakeDraw ? poly('8', rect(10, 10, 20, 20)) : '') +
    '0\nENDBLK\n').join('')
  const inserts = ['FRONT', 'BACK'].map(name => `0\nINSERT\n8\n1\n2\n${name}\n`).join('')
  return `0\nSECTION\n2\nBLOCKS\n${blocks}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${inserts}0\nENDSEC\n0\nEOF\n`
}
const wires = Object.fromEntries(sizes.map(size => [size, wire(size)]))
const options = () => ({unit: 'mm', allowancesBySize: Object.fromEntries(sizes.map(size => [
  size, Object.fromEntries(['FRONT', 'BACK'].map(name => {
    const [a, , c] = pieceRect(size, name)
    return [name, {expectedAllowanceMm: 10,
      stitchOutlineMm: rect(10, 10, c.x - a.x - 20, c.y - a.y - 20),
      stitchSource: 'separately-supplied-manufacturing-sewline'}]
  }))
]))})
const blocked = (r, code) => {
  assert.equal(r.ok, false, JSON.stringify(r))
  assert(r.issues.some(issue => issue.code === code), JSON.stringify(r.issues))
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.factoryApproved, false)
  assert.equal(r.receiverCadVerified, false)
}

test('two-size, two-piece disposable garment verifies explicit CUT-to-STITCH offset, not release', () => {
  const r = inspect(wires, options())
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.rows.length, 4)
  assert.equal(r.sizeCount, 2)
  assert.equal(r.allowanceGeometryInspected, true)
  assert.equal(r.independentSewlineAuthenticated, false)
  assert.equal(r.cuttingAuthorized, false)
  assert.equal(r.factoryApproved, false)
})

test('real independent Seamly2D AAMA source has no authenticated sewline; missing evidence blocks', () => {
  const zip = unzipSync(readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip'))
  const source = Object.fromEntries(sizes.map(s => [s, strFromU8(zip[`graded-aama/seamly-size-${s}.dxf`])]))
  assert.equal(parse(source['48'], {unit: 'mm'}).pieces.length, 5)
  blocked(inspect(source, {unit: 'mm'}), 'INVALID_AAMA_ALLOWANCE_POLICY')
})

test('Seamly layer-8 DRAW cannot substitute for separately supplied manufacturing STITCH', () => {
  const altered = Object.fromEntries(sizes.map(size => [size, wire(size, {fakeDraw: true})]))
  assert.equal(parse(altered['48'], {unit: 'mm'}).pieces[0].sewingContourMm !== null, true)
  blocked(inspect(altered, {unit: 'mm'}), 'INVALID_AAMA_ALLOWANCE_POLICY')
  const r = inspect(altered, options())
  assert.equal(r.ok, true, JSON.stringify(r.issues))
  assert.equal(r.independentSewlineAuthenticated, false)
})

test('missing size and missing piece manufacturing policies fail closed', () => {
  const p = options()
  delete p.allowancesBySize['52']
  blocked(inspect(wires, p), 'INVALID_AAMA_ALLOWANCE_POLICY')
  const q = options()
  delete q.allowancesBySize['48'].BACK
  blocked(inspect(wires, q), 'AAMA_ALLOWANCE_PIECE_IDENTITY_DRIFT')
})

test('invalid sewline provenance and malformed stitch topology fail closed', () => {
  const p = options()
  p.allowancesBySize['48'].FRONT.stitchSource = 'Seamly-layer-8-DRAW'
  blocked(inspect(wires, p), 'INVALID_AAMA_STITCH_EVIDENCE')
  const q = options()
  q.allowancesBySize['52'].BACK.stitchOutlineMm = rect(10, 10, 20, 20)
  q.allowancesBySize['52'].BACK.stitchOutlineMm[2] = q.allowancesBySize['52'].BACK.stitchOutlineMm[0]
  blocked(inspect(wires, q), 'INVALID_AAMA_STITCH_EVIDENCE')
})

test('wrong nominal allowance, shifted stitch, and stitch outside CUT are rejected', () => {
  const p = options()
  p.allowancesBySize['52'].FRONT.expectedAllowanceMm = 5
  blocked(inspect(wires, p), 'AAMA_ALLOWANCE_OFFSET_DRIFT')
  const q = options()
  q.allowancesBySize['48'].BACK.stitchOutlineMm = q.allowancesBySize['48'].BACK.stitchOutlineMm.map(p => ({x: p.x + 4, y: p.y}))
  blocked(inspect(wires, q), 'AAMA_ALLOWANCE_OFFSET_DRIFT')
  const t = options()
  t.allowancesBySize['48'].FRONT.stitchOutlineMm = rect(-5, -5, 60, 70)
  blocked(inspect(wires, t), 'AAMA_STITCH_OUTSIDE_CUT')
})

test('swapped receiving size CUT, and a shortened stitch contour, cannot pass', () => {
  blocked(inspect({...wires, '52': wires['48']}, options()), 'AAMA_STITCH_OUTSIDE_CUT')
  const p = options()
  p.allowancesBySize['52'].BACK.stitchOutlineMm = rect(10, 10, 30, 30)
  blocked(inspect(wires, p), 'AAMA_ALLOWANCE_OFFSET_DRIFT')
})
