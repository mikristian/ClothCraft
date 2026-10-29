import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'

const fixture = readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf', import.meta.url), 'utf8')
const entity = (type, layer, points) => type === 'LINE'
  ? `0\nLINE\n8\n${layer}\n10\n${points[0][0]}\n20\n${points[0][1]}\n11\n${points[1][0]}\n21\n${points[1][1]}\n`
  : `0\nPOLYLINE\n8\n${layer}\n70\n0\n` + points.map(p => `0\nVERTEX\n10\n${p[0]}\n20\n${p[1]}\n30\n0\n`).join('') + '0\nSEQEND\n'

test('real Seamly R12 AAMA gives one physical CUT per inserted pattern, and DRAW is not certified sewline', () => {
  const result = parse(fixture, {unit: 'mm'})
  assert.equal(result.pieces.length, 17)
  assert.ok(result.pieces.every(p => p.cutOutlineMm.closed && p.cutOutlineMm.provenance.sourceLayer === '1'))
  assert.ok(result.pieces.every(p => p.sewingContourMm?.provenance.sourceLayer === '8'))
  assert.ok(result.pieces.every(p => p.manufacturingApproved === false))
  assert.equal(result.factoryExportAllowed, false)
  assert.equal(result.source.originalDxfText, fixture)
  assert.equal(result.upstream.layerRoles['8'], 'draw')
})

test('added Seamly notch, grainline, internal cuts and uncut draw marks preserve numerical layers', () => {
  const extra = entity('LINE', '4', [[1, 2], [3, 4]]) + entity('LINE', '7', [[5, 6], [7, 8]])
    + entity('POLYLINE', '11', [[2, 3], [4, 5]]) + entity('POLYLINE', '8', [[9, 10], [11, 12]])
  const changed = fixture.replace(/  0\nENDBLK\n  8\n1\n/, `${extra}  0\nENDBLK\n  8\n1\n`)
  const result = parse(changed, {unit: 'cm'})
  const p = result.pieces[0]
  assert.equal(p.notches.length, 1)
  assert.equal(p.notches[0].provenance.sourceLayer, '4')
  assert.equal(p.grainline.provenance.sourceLayer, '7')
  assert.equal(p.internalCuts[0].provenance.sourceLayer, '11')
  assert.equal(p.drawPaths[0].provenance.sourceLayer, '8')
  assert.deepEqual(p.notches[0].points.map(pt => [pt.x, pt.y]), [[10, 20], [30, 40]])
})

test('fail closed without unit, on wrong declaration, unknown layer, duplicate CUT or invalid INSERT', () => {
  assert.throws(() => parse(fixture), /Explicit source unit/)
  assert.throws(() => parse(fixture.replace(/\nINSERT\n/, '\nCIRCLE\n'), {unit: 'mm'}), /Unsupported top-level/)
  assert.throws(() => parse(fixture.replace(/\nFULLSLEEVE\n/, '\nUNKNOWN_BLOCK\n'), {unit: 'mm'}), /Missing DXF block/)
  assert.throws(() => parse(fixture.replace(/\nINSERT\n/, '\nINSERT\n8\n13\n'), {unit: 'mm'}), /Unsupported INSERT layer/)
  const base = fixture.replace(/  0\nENDBLK\n  8\n1\n/, `${entity('POLYLINE', '1', [[0,0], [1,0], [1,1]])}  0\nENDBLK\n  8\n1\n`)
  assert.throws(() => parse(base, {unit: 'mm'}), /Ambiguous physical CUT/)
  const inserted = fixture.replace(/0\nINSERT\n/, '0\nINSERT\n70\n2\n')
  assert.throws(() => parse(inserted, {unit: 'mm'}), /Unsupported INSERT array/)
})
