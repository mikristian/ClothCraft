import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { writeSavedProject, readSavedProject } from './projectRestore.js'

function storage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) }
}

test('editable avatar body measurements survive native garment project JSON save and reload exactly', () => {
  const source = createTeeTemplate(), store = storage()
  source.avatar = { ...source.avatar, heightCm: 174.25, chestCm: 105.7, waistCm: 83.35,
    hipCm: 107.2, shoulderWidthCm: 47.8, neckCm: 40.4, bicepCm: 34.2,
    armLengthCm: 69.75, armAngleDeg: -4.5, visibility: .65 }
  const expected = structuredClone(source.avatar)
  writeSavedProject(store, 'garment', 'garment-backup', source)
  const restored = readSavedProject(store, 'garment', 'garment-backup')
  assert.equal(restored.status, 'primary')
  assert.deepEqual(restored.project.avatar, expected)
  assert.deepEqual(restored.project.pieces, source.pieces)
})

test('invalid body measurements cannot silently serialize to null or overwrite valid project saves', () => {
  const source = createTeeTemplate(), store = storage()
  writeSavedProject(store, 'garment', 'garment-backup', source)
  const original = store.getItem('garment')
  for (const bad of [NaN, Infinity, -1, '180']) {
    const invalid = structuredClone(source)
    invalid.avatar.heightCm = bad
    assert.throws(() => writeSavedProject(store, 'garment', 'garment-backup', invalid), /avatar heightCm/)
    assert.equal(store.getItem('garment'), original)
  }
  store.setItem('garment', JSON.stringify({ ...source, avatar: { ...source.avatar, waistCm: null } }))
  // Legacy optional null values are retained without inventing user measurements.
  assert.equal(readSavedProject(store, 'garment', 'garment-backup').status, 'primary')
  store.setItem('garment', JSON.stringify({ ...source, avatar: { ...source.avatar, waistCm: -10 } }))
  const recovered = readSavedProject(store, 'garment', 'garment-backup')
  assert.equal(recovered.status, 'backup')
  assert.deepEqual(recovered.project.avatar, source.avatar)
})

test('custom body measurement annotations survive save and invalid coordinates preserve recovery snapshot', () => {
  const source = createTeeTemplate(), store = storage()
  source.customMeasurements = [{id:'sleeve-check',label:'Sleeve width',pieceId:source.pieces[0].id,
    a:{x:2.125,y:1.5},b:{x:18.4,y:1.5},toleranceCm:.25}]
  writeSavedProject(store,'garment','backup',source)
  assert.deepEqual(readSavedProject(store,'garment','backup').project.customMeasurements,source.customMeasurements)
  const original = store.getItem('garment')
  for (const field of ['x','y']) {
    const invalid = structuredClone(source)
    invalid.customMeasurements[0].a[field] = Infinity
    assert.throws(() => writeSavedProject(store,'garment','backup',invalid),/custom measurement a/)
    assert.equal(store.getItem('garment'),original)
  }
  store.setItem('garment',JSON.stringify({...source,customMeasurements:[{...source.customMeasurements[0],toleranceCm:-1}]}))
  assert.equal(readSavedProject(store,'garment','backup').status,'backup')
})

test('orphaned body measurement references cannot replace a valid garment save and reopen uses recovery',()=>{
  const source=createTeeTemplate(),store=storage()
  source.customMeasurements=[{id:'chest-width',pieceId:source.pieces[0].id,a:{x:0,y:0},b:{x:10,y:0}}]
  writeSavedProject(store,'garment','backup',source)
  const previous=store.getItem('garment')
  const invalid=structuredClone(source)
  invalid.customMeasurements[0].pieceId='deleted-panel'
  assert.throws(()=>writeSavedProject(store,'garment','backup',invalid),/unknown pattern piece/)
  assert.equal(store.getItem('garment'),previous)
  store.setItem('garment',JSON.stringify(invalid))
  const recovered=readSavedProject(store,'garment','backup')
  assert.equal(recovered.status,'backup')
  assert.deepEqual(recovered.project.customMeasurements,source.customMeasurements)
})
