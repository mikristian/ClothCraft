import test from 'node:test'
import assert from 'node:assert/strict'
import {createReferenceImageImportGate20261029 as gate} from './referenceImageImportGate20261029.js'

test('slow photo import cannot overwrite a newly opened native or draft garment',async()=>{
  const selected=gate('garment-A')
  const stale=selected.begin()
  let resolveImage
  const conversion=new Promise(resolve=>{resolveImage=resolve})
  const pending=conversion.then(image=>selected.isCurrent(stale)?image:null)
  selected.setDocumentKey('garment-B')
  resolveImage({name:'wrong-garment-photo'})
  assert.equal(await pending,null)
  const current=selected.begin()
  assert.equal(selected.isCurrent(current),true)
  assert.equal(selected.isCurrent(stale),false)
})

test('later same-document upload wins regardless of decode completion order',()=>{
  const selected=gate('garment-A')
  const older=selected.begin()
  const newer=selected.begin()
  assert.equal(selected.isCurrent(older),false)
  assert.equal(selected.isCurrent(newer),true)
  selected.setDocumentKey('garment-A')
  assert.equal(selected.isCurrent(newer),true)
  selected.invalidate()
  assert.equal(selected.isCurrent(newer),false)
})

test('stale errors and unmounted asynchronous imports cannot report as current',()=>{
  const selected=gate('garment-A')
  const ticket=selected.begin()
  selected.setDocumentKey('garment-B')
  assert.equal(selected.isCurrent(ticket),false)
  const newer=selected.begin()
  selected.invalidate()
  assert.equal(selected.isCurrent(newer),false)
  assert.equal(selected.isCurrent(null),false)
})
