import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {unzipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {buildGuardedFactoryManifestZip20261024_0053 as build} from './guardedFactoryManifestZip20261024_0053.mjs'

test('six graded sizes survive guarded ZIP extraction with independent SHA-256 and no approval', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  const result = build(project)
  assert.equal(result.ok, true, result.reason || JSON.stringify(result.diagnostics))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  assert.ok(result.bytes instanceof Uint8Array)
  const extracted = unzipSync(result.bytes)
  assert.equal(Object.keys(extracted).length, result.fileCount)
  const manifest = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(extracted['manifest.json']))
  assert.deepEqual(manifest.grading.sizes, ['XS','S','M','L','XL','XXL'])
  assert.deepEqual(manifest.files, Object.keys(extracted).sort())
  assert.equal(Object.keys(extracted).filter(path => /^patterns\/.*\.dxf$/.test(path)).length, 6)
  for (const [path, bytes] of Object.entries(extracted)) {
    if (path !== 'manifest.json') assert.equal(manifest.sha256[path], createHash('sha256').update(bytes).digest('hex'), path)
  }
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(extracted, project).ok, true)
  assert.deepEqual(project, original)
})

test('overlapping physical CUT outlines are rejected before returning ZIP bytes', () => {
  const base = createTeeTemplate()
  const rectangle = id => ({...structuredClone(base.pieces[0]), id, name:id,
    points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
    curves:{}, seamAllowance:6, edgeSeamAllowances:{}, notches:[], internalLines:[], buttonholes:[]})
  const project = {...base, pieces:[rectangle('cut-a'),rectangle('cut-b')], seams:[]}
  const original = structuredClone(project)
  const result = build(project)
  assert.equal(result.ok, false)
  assert.match(result.reason, /PHYSICAL_CUT_INTERIOR_OVERLAP/)
  assert.equal(Object.hasOwn(result, 'bytes'), false)
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(project, original)
})

test('invalid source sewing reference is rejected without returning ZIP bytes', () => {
  const project = createTeeTemplate()
  project.seams[0].a.edgeIndex = 999
  const original = structuredClone(project)
  const result = build(project)
  assert.equal(result.ok, false)
  assert.match(result.reason, /Invalid seam/)
  assert.equal(Object.hasOwn(result, 'bytes'), false)
  assert.deepEqual(project, original)
})
