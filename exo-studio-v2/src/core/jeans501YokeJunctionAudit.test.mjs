import test from 'node:test'
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../data/jeans501.js'
import {auditJeans501YokeJunctionConstraints} from './jeans501YokeJunctionAudit.js'

const sizes=['W28','W30','W32','W34','W36','W38']
const deltas=[2.286,1.143,0,-1.143,-2.286,-3.429]
const near=(x,y,tol=1e-8)=>Math.abs(x-y)<=tol

test('twelve original yoke joins carry actual graded endpoint drift despite a clean W32 base',()=>{
 const source=create501JeansTemplate()
 const before=structuredClone(source)
 const audit=auditJeans501YokeJunctionConstraints(source)
 assert.equal(audit.sourcePreserved,true)
 assert.equal(audit.factoryCertified,false)
 assert.equal(audit.installed,false)
 assert.deepEqual(audit.results.map(row=>row.size),sizes)
 for(const [index,row] of audit.results.entries()){
  const authored=row.virtualTrials.find(trial=>trial.strategy==='AS_AUTHORED')
  assert.equal(authored.strictIndustrialBlockers,index===2?0:2)
  assert.equal(authored.strictCutlineBlockers,0)
  for(const yoke of authored.yokeChecks){
   assert(near(yoke.targetBackLegCm-yoke.sourceYokeCm,deltas[index]))
   assert(near(yoke.trialMismatchCm,Math.abs(deltas[index])))
   assert.equal(yoke.movedVertices.length,0)
   assert(yoke.originalEndpointGapsCm.every(gap=>near(gap,Math.abs(deltas[index])/2)))
  }
 }
 assert.deepEqual(source,before,'yoke feasibility audit cannot edit an installed source pattern')
})

test('numeric seam-length pass cannot certify endpoint-junction alignment or neighboring physical edges',()=>{
 const result=auditJeans501YokeJunctionConstraints(create501JeansTemplate())
 for(const row of result.results){
  for(const strategy of ['MOVE_SEAT_CORNER','MOVE_SIDE_CORNER']){
   const trial=row.virtualTrials.find(item=>item.strategy===strategy)
   assert.equal(trial.strictIndustrialBlockers,0)
   assert.equal(trial.strictCutlineBlockers,0)
   assert.equal(trial.factoryCertified,false)
   assert.equal(trial.factoryCuttingAuthorized,false)
   assert(trial.yokeChecks.every(yoke=>yoke.trialMismatchCm<1e-8))
   if(row.size==='W32')continue
   assert(trial.yokeChecks.every(yoke=>yoke.trialEndpointGapsCm.some(gap=>gap>0.1)))
   assert(trial.yokeChecks.every(yoke=>yoke.movedVertices.length===1))
   assert(trial.yokeChecks.every(yoke=>yoke.secondarySeamEffects.some(effect=>
    Math.abs(effect.changeInALengthCm)>1e-6||Math.abs(effect.changeInBLengthCm)>1e-6)))
  }
 }
})

test('the symmetric trial aligns paired lower-yoke endpoints but still alters adjacent side/seat construction',()=>{
 const result=auditJeans501YokeJunctionConstraints(create501JeansTemplate())
 for(const row of result.results){
  const trial=row.virtualTrials.find(item=>item.strategy==='SPLIT_SHARED_CORNERS')
  assert.equal(trial.strictIndustrialBlockers,0)
  assert.equal(trial.strictCutlineBlockers,0)
  for(const yoke of trial.yokeChecks){
   assert(yoke.trialEndpointGapsCm.every(gap=>gap<1e-8))
   assert(yoke.trialMismatchCm<1e-8)
   if(row.size==='W32')assert.equal(yoke.movedVertices.length,0)
   else{
    assert.equal(yoke.movedVertices.length,2)
    assert(yoke.secondarySeamEffects.some(effect=>
      Math.abs(effect.changeInALengthCm)>1e-6||Math.abs(effect.changeInBLengthCm)>1e-6))
   }
  }
 }
})

test('altered source sewing/junction inventory is rejected before presenting fictitious feasibility',()=>{
 const broken=create501JeansTemplate()
 broken.seams=broken.seams.filter(row=>row.id!=='left-yoke-join')
 assert.throws(()=>auditJeans501YokeJunctionConstraints(broken),/Missing or altered sewing references/)
 const corrupt=create501JeansTemplate()
 corrupt.pieces.find(p=>p.id==='right-back-yoke').points[2].x=NaN
 assert.throws(()=>auditJeans501YokeJunctionConstraints(corrupt),/Missing, duplicated or malformed 501 piece/)
})
