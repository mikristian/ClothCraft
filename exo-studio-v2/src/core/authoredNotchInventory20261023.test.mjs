import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {
  createAuthoredNotchInventoryBaseline20261023 as capture,
  compareAuthoredNotchInventoryBaseline20261023 as compare,
} from './authoredNotchInventory20261023.js'

const make = () => {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches = []
  project.pieces[0].notches = [
    {id:'front-waist',edgeIndex:0,t:0.2,depthCm:0.3},
    {id:'front-side',edgeIndex:1,t:0.7,depthCm:0.3},
  ]
  return project
}
const codes = result => result.issues.map(issue => issue.code)

test('captures an explicit external baseline without approving factory release or mutating garment', () => {
  const garment = make(), before = structuredClone(garment)
  const result = capture(garment)
  assert.equal(result.status,'captured')
  assert.equal(result.baseline.approved,false)
  assert.deepEqual(result.baseline.pieces.find(row=>row.pieceId===garment.pieces[0].id).notchIds,['front-side','front-waist'])
  assert.equal(result.factoryCuttingAuthorized,false)
  assert.deepEqual(garment,before)
})

test('detects a notch deleted from SOURCE after independent baseline capture', () => {
  const garment = make(), baseline = capture(garment).baseline
  garment.pieces[0].notches.pop()
  const before = structuredClone(garment), result = compare(garment,baseline)
  assert(result.issues.some(i=>i.code==='AUTHORED_NOTCH_MISSING' && i.pieceId===garment.pieces[0].id && i.notchId==='front-side'))
  assert.equal(result.status,'blocked')
  assert.deepEqual(garment,before)
})

test('detects unreviewed additions and changed source piece inventory', () => {
  const garment = make(), baseline = capture(garment).baseline
  garment.pieces[0].notches.push({id:'new',edgeIndex:0,t:0.5})
  assert(codes(compare(garment,baseline)).includes('UNREVIEWED_NOTCH_ADDED'))
  garment.pieces.pop()
  assert(codes(compare(garment,baseline)).includes('AUTHORED_PIECE_MISSING'))
})

test('size-run reorder and base-size change cannot silently reuse approved identity inventory', () => {
  const garment = make(), baseline = capture(garment).baseline
  garment.grading.sizes.reverse()
  assert(codes(compare(garment,baseline)).includes('SIZE_RUN_CHANGED'))
  garment.grading.baseSize=garment.grading.sizes[0]
  assert(codes(compare(garment,baseline)).includes('SIZE_RUN_CHANGED'))
})

test('rejects invalid or fabricated baseline and duplicate notch identity', () => {
  const garment = make(), baseline = capture(garment).baseline
  assert(codes(compare(garment,{})).includes('INVALID_OR_UNVERIFIED_BASELINE'))
  assert(codes(compare(garment,{...baseline,approved:true})).includes('INVALID_OR_UNVERIFIED_BASELINE'))
  garment.pieces[0].notches.push({...garment.pieces[0].notches[0]})
  assert(codes(capture(garment)).includes('INVALID_OR_DUPLICATE_NOTCH_ID'))
})

test('identity matching never implies manufacturing or physical geometry approval', () => {
  const garment = make(), baseline = capture(garment).baseline
  const result = compare(garment,baseline)
  assert.equal(result.status,'identity_match_only')
  assert.equal(result.blockers,0)
  assert.equal(result.factoryCertified,false)
  assert.equal(result.factoryCuttingAuthorized,false)
  garment.pieces[0].notches[0].edgeIndex=999
  assert.equal(compare(garment,baseline).status,'identity_match_only','Geometry remains a separate fail-closed gate')
})

test('empty authored inventory is blocked rather than captured as a release baseline', () => {
  const garment = make()
  for (const piece of garment.pieces) piece.notches=[]
  const result = capture(garment)
  assert.equal(result.status,'blocked')
  assert.equal(result.baseline,null)
  assert(codes(result).includes('EMPTY_AUTHORED_NOTCH_INVENTORY'))
  const forgedEmpty = {schema:'exo2d-authored-notch-inventory-study.v1',approved:false,
    baseSize:garment.grading.baseSize,sizes:[...garment.grading.sizes],
    pieces:garment.pieces.map(piece=>({pieceId:piece.id,notchIds:[]}))}
  assert(codes(compare(garment,forgedEmpty)).includes('EMPTY_BASELINE_NOTCH_INVENTORY'))
})

test('forged matching baseline exposes why external immutable approval is required', () => {
  const garment = make()
  const legitimate = capture(garment).baseline
  garment.pieces[0].notches.pop()
  assert(codes(compare(garment,legitimate)).includes('AUTHORED_NOTCH_MISSING'))
  const forged = structuredClone(legitimate)
  const row = forged.pieces.find(p=>p.pieceId===garment.pieces[0].id)
  row.notchIds = row.notchIds.filter(id=>id!=='front-side')
  const result = compare(garment,forged)
  assert.equal(result.status,'identity_match_only','An unauthenticated, matching forgery cannot be detected by an identity-only comparison')
  assert.equal(result.factoryCertified,false)
  assert.equal(result.factoryCuttingAuthorized,false)
})
