import test from 'node:test';import assert from 'node:assert/strict';import {createFactoryReview,startFactorySampleRound,updateFactorySampleEntry,approveFactorySampleEntry} from './factoryReview.js';import {renderFactorySampleReviewPrint}from './printFactoryReview.js'
const table={id:'pom',sourceRevision:8,columns:[{id:'label',label:'POM'},{id:'size',label:'M (cm)',type:'number'},{id:'tol',label:'TOL. (cm)',type:'number'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{label:{value:'Chest'},size:{value:55},tol:{value:1}}}]}
test('factory sample print masks stale approvals, escapes issues and preserves source',()=>{
 let review=startFactorySampleRound(createFactoryReview(table),table,{id:'PPS-1'})
 review=updateFactorySampleEntry(review,'PPS-1','chest:size',{actual:55.5,issueNote:'<img onerror=attack>'})
 review=approveFactorySampleEntry(review,'PPS-1','chest:size',table,'QC-Reviewer')
 const html=renderFactorySampleReviewPrint(review,table)
 assert.match(html,/APPROVED/);assert.match(html,/QC-Reviewer/);assert.match(html,/&lt;img/)
 const stale=renderFactorySampleReviewPrint(review,{...table,sourceRevision:9})
 assert.match(stale,/BLOCKED/);assert.match(stale,/UNAPPROVED/);assert.doesNotMatch(stale,/QC-Reviewer/)
})
