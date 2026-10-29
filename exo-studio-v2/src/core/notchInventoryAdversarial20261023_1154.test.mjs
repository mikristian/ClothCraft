import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {createAuthoredNotchInventoryBaseline20261023 as capture,compareAuthoredNotchInventoryBaseline20261023 as compare} from './authoredNotchInventory20261023.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

function fixture() {
  const p=createTeeTemplate()
  for(const piece of p.pieces) piece.notches=[]
  p.pieces[0].notches=[{id:'waist',edgeIndex:0,t:0.25,depthCm:0.3},{id:'side',edgeIndex:1,t:0.5,depthCm:0.3}]
  return p
}
const codes=r=>r.issues.map(x=>x.code)

test('immutable external baseline detects missing source notch and missing entire piece',()=>{
  const p=fixture(), baseline=structuredClone(capture(p).baseline)
  const firstId=p.pieces[0].id
  p.pieces[0].notches=[]
  assert.deepEqual(compare(p,baseline).issues.filter(x=>x.code==='AUTHORED_NOTCH_MISSING').map(x=>x.notchId).sort(),['side','waist'])
  p.pieces=p.pieces.filter(x=>x.id!==firstId)
  assert(codes(compare(p,baseline)).includes('AUTHORED_PIECE_MISSING'))
})

test('tampering with unauthenticated baseline can erase missing notch evidence',()=>{
  const p=fixture(), baseline=capture(p).baseline
  p.pieces[0].notches.pop()
  assert(codes(compare(p,baseline)).includes('AUTHORED_NOTCH_MISSING'))
  const row=baseline.pieces.find(row=>row.pieceId===p.pieces[0].id)
  row.notchIds=row.notchIds.filter(id=>id!=='side')
  const result=compare(p,baseline)
  assert.equal(result.status,'identity_match_only')
  assert.equal(result.factoryCuttingAuthorized,false)
})

test('invalid baseline metadata, duplicates, or empty baseline fail closed',()=>{
  const p=fixture(), baseline=capture(p).baseline
  assert(codes(compare(p,{...baseline,approved:true})).includes('INVALID_OR_UNVERIFIED_BASELINE'))
  assert(codes(compare(p,{...baseline,schema:'invented'})).includes('INVALID_OR_UNVERIFIED_BASELINE'))
  assert(codes(compare(p,{...baseline,pieces:[...baseline.pieces,baseline.pieces[0]]})).includes('INVALID_BASELINE_PIECE'))
  assert(codes(compare(p,{...baseline,pieces:baseline.pieces.map(row=>({...row,notchIds:[]}))})).includes('EMPTY_BASELINE_NOTCH_INVENTORY'))
})

test('zero source inventory cannot be captured or reused against nonempty baseline',()=>{
  const p=fixture(), baseline=capture(p).baseline
  for(const piece of p.pieces) piece.notches=[]
  assert(codes(capture(p)).includes('EMPTY_AUTHORED_NOTCH_INVENTORY'))
  assert.equal(compare(p,baseline).status,'blocked')
  assert.equal(compare(p,baseline).issues.filter(x=>x.code==='AUTHORED_NOTCH_MISSING').length,2)
})

test('size membership changes, reorder, and base size changes are rejected',()=>{
  const p=fixture(), baseline=capture(p).baseline
  const original=[...p.grading.sizes]
  p.grading.sizes=[...original].reverse()
  assert(codes(compare(p,baseline)).includes('SIZE_RUN_CHANGED'))
  p.grading.sizes=[...original,'EXTRA']
  assert(codes(compare(p,baseline)).includes('SIZE_RUN_CHANGED'))
  p.grading.sizes=original.slice(1)
  assert(codes(compare(p,baseline)).includes('SIZE_RUN_CHANGED'))
  p.grading.sizes=original
  p.grading.baseSize=original.find(x=>x!==baseline.baseSize)
  assert(codes(compare(p,baseline)).includes('SIZE_RUN_CHANGED'))
})

test('manufacturing release has no authored baseline input and stays unapproved',()=>{
  const p=fixture()
  const result=inspectManufacturingReleaseReadiness(p)
  assert.equal(result.factoryCertified,false)
  assert.equal(result.factoryCuttingAuthorized,false)
  assert.equal(result.bulkProductionAuthorized,false)
  assert.equal(typeof result.engineeringGeometryPass,'boolean')
  assert(!result.blockers.some(x=>x.code==='AUTHORED_NOTCH_MISSING'),'baseline comparison currently not wired into release')
})
