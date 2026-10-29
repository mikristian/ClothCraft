import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'

const project=()=>({
  grading:{sizes:['S'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'panel',cutQuantity:1,grainAngleDeg:0,
    points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}],
})
const roll=(override={})=>({rollId:'roll-A',batchId:'batch-1',fabricId:'main',
  shade:'blue',dyeLotId:'lot-A',nap:true,usableLengthCm:65,costPerMeter:10,
  widthCm:30,...override})
const plan=(rolls,quantity=3,overrides={})=>buildAccuMarkCutRoomPlan(project(),{
  quantitiesBySize:{S:quantity},rolls,fabricWidthCm:30,spacingCm:1,
  maxPlyCount:5,nap:true,...overrides,
})
test('physical cutting offsets skip defective roll segment and never bridge it',()=>{
  const options=[roll({defectRangesCm:[{startCm:13,endCm:22}],maxPlyCount:2})]
  const before=structuredClone(options)
  const a=plan(options),b=plan(options)
  assert.equal(a.ok,true,JSON.stringify(a.issues))
  assert.deepEqual(a,b)
  assert.deepEqual(options,before)
  assert.equal(a.totals.garments,3)
  assert(a.lays.every(l=>l.plyCount<=2))
  assert(a.lays.every(l=>l.endOffsetCm<=13||l.startOffsetCm>=22))
  const unused=a.rollAllocation[0].skippedUnusableCm
  assert(unused>0)
  assert(a.rollAllocation[0].cleanRemainingCm<=a.rollAllocation[0].remainingCm)
  assert.equal(a.rollAllocation[0].lastLayEndCm,
    a.rollAllocation[0].consumedCm+a.rollAllocation[0].skippedUnusableCm)
  assert.equal(a.totals.unusableMaterialMeters,unused/100)
  assert.equal(a.totals.materialMeters,a.totals.cutMaterialMeters+a.totals.unusableMaterialMeters)
  assert.equal(a.manifest.dyeLotId,'lot-A')
  assert.equal(a.cutTickets.every(t=>t.dyeLotId==='lot-A'&&!t.factoryApproved),true)
  assert.equal(a.factoryApproved,false)
  assert.equal(a.cuttingAuthorized,false)
})

test('fails closed when remaining total stock exceeds demand but no contiguous clean segment fits',()=>{
  const result=plan([roll({usableLengthCm:25,
    defectRangesCm:[{startCm:6,endCm:9},{startCm:14,endCm:17},{startCm:22,endCm:25}]})],1)
  assert.equal(result.ok,false)
  assert(result.issues.some(v=>v.code==='INSUFFICIENT_FABRIC'))
  assert.equal(result.manifest,null)
  assert.deepEqual(result.cutTickets,[])
})

test('rejects malformed defects, unsafe roll ply limits, and mixed dye lots',()=>{
  for(const [overrides,code] of [
    [{defectRangesCm:[{startCm:-1,endCm:4}]},'INVALID_ROLL_DEFECT_RANGES'],
    [{defectRangesCm:[{startCm:2,endCm:7},{startCm:6,endCm:8}]},'INVALID_ROLL_DEFECT_RANGES'],
    [{defectRangesCm:[{startCm:55,endCm:66}]},'INVALID_ROLL_DEFECT_RANGES'],
    [{defectRangesCm:[{startCm:5,endCm:5}]},'INVALID_ROLL_DEFECT_RANGES'],
    [{maxPlyCount:0},'INVALID_ROLL_PLY_LIMIT'],
    [{maxPlyCount:1.5},'INVALID_ROLL_PLY_LIMIT'],
  ])assert(plan([roll(overrides)]).issues.some(v=>v.code===code),code)
  assert(plan([roll(),roll({rollId:'roll-B',dyeLotId:'lot-B'})]).issues
    .some(v=>v.code==='MIXED_DYE_LOTS'))
  assert(plan([roll(),roll({rollId:'roll-B',dyeLotId:undefined})]).issues
    .some(v=>v.code==='INVALID_DYE_LOT'))
})

test('zero-defect legacy rolls keep original material length and estimated cost',()=>{
  const legacy=[roll({dyeLotId:undefined,maxPlyCount:undefined,defectRangesCm:undefined})]
  const result=plan(legacy,2)
  assert(result.ok,JSON.stringify(result.issues))
  assert.equal(result.totals.materialMeters,result.totals.cutMaterialMeters)
  assert.equal(result.totals.unusableMaterialMeters,0)
  assert.equal(result.rollAllocation[0].skippedUnusableCm,0)
  assert(!Object.hasOwn(result.manifest,'dyeLotId'))
})
