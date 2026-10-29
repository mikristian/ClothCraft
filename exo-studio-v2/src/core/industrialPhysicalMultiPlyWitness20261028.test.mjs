import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialPhysicalMultiPlyWitness20261028 as inspect} from './industrialPhysicalMultiPlyWitness20261028.mjs'

const plan=()=>({ok:true,cuttingAuthorized:false,factoryApproved:false,
 lays:[{layId:'LAY-0001',rollId:'R1',size:'M',plyCount:2,markerLengthCm:7}],
 cutTickets:[{layId:'LAY-0001',pieces:[{total:2}]}]})
const observations=()=>({format:'exo.physical-multiply-measurement.v1',factory:'Factory1',operator:'Inspector1',
 calibrationId:'Cal1',signedReportReference:'Report1',lays:[{layId:'LAY-0001',rollId:'R1',size:'M',
 plyCount:2,measuredPieceCount:2,plies:[1,2].map(index=>({index,measuredMarkerLengthMm:70,
 registrationOffsetMm:.2,foldOffsetMm:.1}))}]})
test('complete self-reported per-ply evidence is numerically checked but never factory-approved',()=>{
 const result=inspect(plan(),observations())
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.inspectedPlies,2)
 assert.equal(result.physicallyMeasured,false)
 assert.equal(result.factoryApproved,false)
 assert.equal(result.cuttingAuthorized,false)
})
test('missing plies, registration drift, inaccurate lengths, and invented quantity refuse',()=>{
 for(const mutate of [
  x=>{x.lays[0].plies.pop()},
  x=>{x.lays[0].plies[1].registrationOffsetMm=2},
  x=>{x.lays[0].plies[0].measuredMarkerLengthMm=75},
  x=>{x.lays[0].measuredPieceCount=9},
 ]){const o=observations();mutate(o);const result=inspect(plan(),o)
  assert.equal(result.ok,false)
  assert.equal(result.cuttingAuthorized,false)
 }
})

test('duplicate or mismatched digital lay and CUT-ticket identities cannot pass an observation review',()=>{
 const duplicate=plan();duplicate.lays.push({...duplicate.lays[0]});duplicate.cutTickets.push({...duplicate.cutTickets[0]})
 const observations2=observations();observations2.lays.push(structuredClone(observations2.lays[0]))
 assert.equal(inspect(duplicate,observations2).ok,false)
 const missing=plan();missing.cutTickets[0].layId='LAY-OTHER'
 assert.equal(inspect(missing,observations()).ok,false)
 const negative=plan();negative.cutTickets[0].pieces[0].total=-1
 assert.equal(inspect(negative,observations()).ok,false)
})
