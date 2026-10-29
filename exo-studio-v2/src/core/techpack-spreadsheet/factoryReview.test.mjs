import test from 'node:test'
import assert from 'node:assert/strict'
import {createFactoryReview,startFactorySampleRound,updateFactorySampleEntry,approveFactorySampleEntry,factoryEntryStatus,factoryRoundStatus,compareFactorySampleRounds} from './factoryReview.js'

const table={id:'pom',sourceRevision:7,columns:[{id:'name',label:'POM'},{id:'size',label:'M (cm)',type:'number'},{id:'tol',label:'Tol. (cm)',type:'number'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{name:{value:'Chest'},size:{value:52},tol:{value:1}}}]}
test('revision bound sample requires explicit approval',()=>{
  const original=structuredClone(table)
  let review=startFactorySampleRound(createFactoryReview(table),table,{id:'first'})
  assert.equal(factoryRoundStatus(review.rounds[0],table),'BLOCKED')
  review=updateFactorySampleEntry(review,'first','chest:size',{actual:52.8,toleranceMinus:0.5,tolerancePlus:1})
  assert.equal(factoryEntryStatus(review.rounds[0].entries[0]),'PASS')
  assert.equal(factoryRoundStatus(review.rounds[0],table),'PENDING_APPROVAL')
  assert.throws(()=>approveFactorySampleEntry(review,'first','chest:size',table,''),/Reviewer/)
  review=approveFactorySampleEntry(review,'first','chest:size',table,'Factory QA')
  assert.equal(factoryRoundStatus(review.rounds[0],table),'APPROVED')
  assert.equal(factoryRoundStatus(review.rounds[0],{...table,sourceRevision:8}),'BLOCKED')
  assert.deepEqual(table,original)
})
test('asymmetric bounds, issue edits invalidate approval and comparisons retain history',()=>{
  let review=startFactorySampleRound(createFactoryReview(table),table,{id:'a'})
  review=updateFactorySampleEntry(review,'a','chest:size',{actual:51.4,toleranceMinus:.5,tolerancePlus:1})
  assert.equal(factoryEntryStatus(review.rounds[0].entries[0]),'FAIL')
  assert.throws(()=>approveFactorySampleEntry(review,'a','chest:size',table,'QA'),/outside tolerance/)
  review=updateFactorySampleEntry(review,'a','chest:size',{actual:52})
  review=approveFactorySampleEntry(review,'a','chest:size',table,'QA')
  review=updateFactorySampleEntry(review,'a','chest:size',{issueNote:'Recheck seam'})
  assert.equal(factoryRoundStatus(review.rounds[0],table),'PENDING_APPROVAL')
  review=startFactorySampleRound(review,{...table,sourceRevision:8},{id:'b'})
  review=updateFactorySampleEntry(review,'b','chest:size',{actual:53})
  const diff=compareFactorySampleRounds(review,'a','b')
  assert.equal(diff.entries[0].delta,1)
  assert.equal(diff.toRevision,'8')
})
