import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryEnvelopeZip20261024_0300 as build} from './guardedFactoryEnvelopeZip20261024_0300.mjs'
import {auditFactoryZipEnvelope20261024_0154} from './factoryZipEnvelope20261024_0154.mjs'

test('six graded Foundation Tee sizes pass both factory ZIP guards without source mutation or approval', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  const result = build(project)
  assert.equal(result.ok, true, result.reason || JSON.stringify(result.diagnostics))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  assert.ok(result.bytes instanceof Uint8Array)
  assert.equal(auditFactoryZipEnvelope20261024_0154(result.bytes).ok, true)
  const extracted = unzipSync(result.bytes)
  assert.equal(Object.keys(extracted).length, result.fileCount)
  assert.equal(Object.keys(extracted).filter(path => /^patterns\/.*\.dxf$/.test(path)).length, 6)
  const manifest = JSON.parse(new TextDecoder().decode(extracted['manifest.json']))
  assert.deepEqual(manifest.grading.sizes, ['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  assert.deepEqual(project, original)
})

test('overlapping physical CUT outlines refuse ZIP bytes without project mutation', () => {
  const base = createTeeTemplate()
  const rectangle = id => ({...structuredClone(base.pieces[0]), id, name: id,
    points: [{x: 0, y: 0}, {x: 20, y: 0}, {x: 20, y: 20}, {x: 0, y: 20}],
    curves: {}, seamAllowance: 6, edgeSeamAllowances: {}, notches: [], internalLines: [], buttonholes: []})
  const project = {...base, pieces: [rectangle('cut-a'), rectangle('cut-b')], seams: []}
  const original = structuredClone(project)
  const result = build(project)
  assert.equal(result.ok, false)
  assert.match(result.reason, /PHYSICAL_CUT_INTERIOR_OVERLAP/)
  assert.equal(Object.hasOwn(result, 'bytes'), false)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  assert.deepEqual(project, original)
})

test('invalid project and missing grading sizes fail closed without ZIP bytes', () => {
  const invalidProjects = [null, {}, (() => {
    const project = createTeeTemplate()
    project.grading = {...project.grading, sizes: []}
    return project
  })()]
  for (const project of invalidProjects) {
    const original = structuredClone(project)
    const result = build(project)
    assert.equal(result.ok, false)
    assert.equal(Object.hasOwn(result, 'bytes'), false)
    assert.equal(result.manufacturingApproved, false)
    assert.equal(result.factoryCertified, false)
    assert.deepEqual(project, original)
  }
})

test('real envelope scanner rejects malformed bytes and truncated ZIP', () => {
  const invalid = [
    'not ZIP bytes',
    new Uint8Array(),
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  ]
  for (const bytes of invalid) {
    const result = auditFactoryZipEnvelope20261024_0154(bytes)
    assert.equal(result.ok, false)
    assert.equal(result.manufacturingApproved, false)
  }
  const valid = build(createTeeTemplate())
  assert.equal(valid.ok, true, valid.reason)
  const truncated = valid.bytes.subarray(0, valid.bytes.length - 1)
  assert.equal(auditFactoryZipEnvelope20261024_0154(truncated).ok, false)
})

test('caller supplied second argument cannot replace mandatory envelope scanner', () => {
  const result = build(createTeeTemplate(), () => { throw new Error('injected audit was called') })
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  assert.equal(auditFactoryZipEnvelope20261024_0154(result.bytes).ok, true)
})
