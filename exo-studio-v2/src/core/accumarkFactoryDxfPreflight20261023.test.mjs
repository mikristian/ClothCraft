import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { exportAccuMarkVerifiedSizeDxf20261023 as exportSize } from './accumarkFactoryDxfPreflight20261023.js'

test('grades a six-size tee and exports physical CUT/STITCH with immutable source', () => {
  const source = createTeeTemplate()
  const snapshot = structuredClone(source)
  for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) {
    const result = exportSize(source, size)
    assert.equal(result.ok, true, `${size}: ${result.reason}`)
    assert.equal(result.size, size)
    assert.equal(result.manufacturingApproved, false)
    assert.match(result.dxf, new RegExp(`CUT_FRONT_${size}`))
    assert.match(result.dxf, /STITCH_FRONT/)
  }
  assert.deepEqual(source, snapshot)
})

test('rejects invalid seams, duplicate identities, stale size, NaN and references', () => {
  for (const [label, mutate, expected] of [
    ['invalid seam edge', p => { p.seams[0].a.edgeIndex = 999 }, /Invalid seam/],
    ['duplicate seam', p => { p.seams[1].id = p.seams[0].id }, /Duplicate.*seam ID/],
    ['duplicate piece', p => { p.pieces[1].id = p.pieces[0].id }, /Duplicate.*piece ID/],
    ['NaN point', p => { p.pieces[0].points[0].x = NaN }, /nonfinite points/],
    ['NaN curve', p => { p.pieces[0].curves[1].cx = NaN }, /nonfinite curve/],
    ['same sew side', p => { p.seams[0].b = { ...p.seams[0].a } }, /Identical sew sides/],
    ['reference import', p => { p.patternSource = { referenceOnly: true } }, /Reference-only/],
    ['invalid notch', p => { p.pieces[0].notches[0].edgeIndex = 999 }, /Invalid explicit notch/],
    ['duplicate size', p => { p.grading.sizes[1] = 'XS' }, /grading sizes/],
  ]) {
    const source = createTeeTemplate()
    mutate(source)
    const snapshot = structuredClone(source)
    const result = exportSize(source, 'M')
    assert.equal(result.ok, false, label)
    assert.match(result.reason, expected, label)
    assert.equal(result.manufacturingApproved, false)
    assert.equal('dxf' in result, false)
    assert.deepEqual(source, snapshot)
  }
  const stale = exportSize(createTeeTemplate(), 'XXXL')
  assert.equal(stale.ok, false)
  assert.match(stale.reason, /stale grading size/)
})

test('factory preflight refuses valid geometry when physical CUT allowances overlap', () => {
  const base = createTeeTemplate()
  const rectangle = (id, name) => ({
    ...structuredClone(base.pieces[0]), id, name,
    points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
    curves: {}, seamAllowance:6, edgeSeamAllowances:{},
    notches:[], internalLines:[], buttonholes:[],
  })
  const source = {
    ...base,
    pieces:[rectangle('packing-a','Packing A'),rectangle('packing-b','Packing B')],
    seams:[],
  }
  const original = structuredClone(source)
  const result = exportSize(source, 'M')
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.match(result.reason, /Unsafe physical CUT packing.*PHYSICAL_CUT_INTERIOR_OVERLAP/)
  assert.equal('dxf' in result, false, 'must not expose unsafe DXF bytes')
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(source, original)
})

test('factory preflight rejects duplicate physical CUT layer names', () => {
  const source = createTeeTemplate()
  source.pieces[1].name = source.pieces[0].name
  const original = structuredClone(source)
  const result = exportSize(source, 'M')
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.match(result.reason, /Unsafe physical CUT packing.*duplicate physical CUT layer/)
  assert.equal('dxf' in result, false)
  assert.deepEqual(source, original)
})
