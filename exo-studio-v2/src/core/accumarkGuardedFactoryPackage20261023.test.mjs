import test from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync, strFromU8 } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { sha256Bytes } from './sha256Bytes.js'
import { recoverFactorySourceFromZip } from './factorySourceRecovery.js'
import { buildAccuMarkGuardedFactoryPackage20261023 as build } from './accumarkGuardedFactoryPackage20261023.js'

test('six size tee produces only verified DXFs with accurate v2 manifest and identical ZIP contents', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  const result = build(project, { zip: true })
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.manufacturingApproved, false)
  const manifest = JSON.parse(strFromU8(result.files['manifest.json']))
  assert.deepEqual(manifest.grading.sizes, ['XS','S','M','L','XL','XXL'])
  assert.deepEqual(manifest.files, Object.keys(result.files).sort())
  assert.deepEqual(Object.keys(manifest.sha256).sort(), manifest.files.filter(p => p !== 'manifest.json'))
  for (const path of manifest.files) {
    assert.deepEqual(unzipSync(result.zip)[path], result.files[path], path)
    if (path !== 'manifest.json') assert.equal(manifest.sha256[path], sha256Bytes(result.files[path]), path)
  }
  assert.equal(manifest.files.filter(path => path.startsWith('patterns/') && path.endsWith('.dxf')).length, 6)
  const recovered = recoverFactorySourceFromZip(result.zip)
  assert.ok(recovered, 'verified factory ZIP must preserve editable source recovery')
  assert.deepEqual(project, original)
})

test('physical CUT overlap refuses every output including ZIP', () => {
  const base = createTeeTemplate()
  const rectangle = (id, name) => ({ ...structuredClone(base.pieces[0]), id, name,
    points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}], curves:{},
    seamAllowance:6, edgeSeamAllowances:{}, notches:[], internalLines:[], buttonholes:[] })
  const project = {...base, pieces:[rectangle('packing-a','Packing A'),rectangle('packing-b','Packing B')], seams:[]}
  const original = structuredClone(project)
  const result = build(project, { zip:true })
  assert.equal(result.ok, false)
  assert.match(result.reason, /PHYSICAL_CUT_INTERIOR_OVERLAP/)
  assert.equal('files' in result, false)
  assert.equal('zip' in result, false)
  assert.deepEqual(project, original)
})

test('invalid seam and filename collision fail closed without source mutation', () => {
  const broken = createTeeTemplate()
  broken.seams[0].a.edgeIndex = 999
  const snapshot = structuredClone(broken)
  const failure = build(broken, {zip:true})
  assert.equal(failure.ok, false)
  assert.match(failure.reason, /Invalid seam/)
  assert.equal('files' in failure, false)
  assert.deepEqual(broken, snapshot)
  const collision = createTeeTemplate()
  collision.grading.sizes = ['XS','xs','M']
  assert.match(build(collision).reason, /Colliding grading sizes/)
  assert.equal(build(createTeeTemplate(), {zip:'yes'}).ok, false)
})
