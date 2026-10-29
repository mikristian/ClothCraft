import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync,strToU8,unzipSync,strFromU8} from 'fflate'
import {createFactoryReview,startFactorySampleRound,updateFactorySampleEntry,approveFactorySampleEntry,factoryEntryStatus,factoryRoundStatus,compareFactorySampleRounds} from '../src/core/techpack-spreadsheet/factoryReview.js'
import {renderFactorySampleReviewPrint} from '../src/core/techpack-spreadsheet/printFactoryReview.js'
import {paginateTechPackTable,enumerateWorkspaceOverflowPages} from '../src/core/techpack-spreadsheet/pagination.js'
import {exportTechPackXlsx,importTechPackXlsx} from '../src/core/techpack-spreadsheet/exporterXlsx.js'

const table={id:'pom',sourceRevision:12,columns:[{id:'name',label:'POM'},{id:'m',label:'M (cm)',type:'number'},{id:'tol',label:'Tolerance (cm)',type:'number'}],rows:[{id:'chest',sourceRef:'source:chest',cells:{name:{value:'Chest'},m:{value:55},tol:{value:1}}},{id:'sleeve',sourceRef:'source:sleeve',cells:{name:{value:'Sleeve'},m:{value:24},tol:{value:0.5}}}]}
test('sample measurements require PASS and individual reviewer approvals',()=>{
 let review=startFactorySampleRound(createFactoryReview(table),table,{id:'fit-A'})
 let round=review.rounds[0]
 assert.equal(round.entries.length,2)
 assert.equal(factoryEntryStatus(round.entries[0]),'PENDING')
 assert.equal(factoryRoundStatus(round,table),'BLOCKED')
 review=updateFactorySampleEntry(review,'fit-A','chest:m',{actual:56})
 assert.equal(factoryEntryStatus(review.rounds[0].entries[0]),'PASS')
 assert.throws(()=>approveFactorySampleEntry(review,'fit-A','chest:m',table,' '),/Reviewer identity/)
 review=approveFactorySampleEntry(review,'fit-A','chest:m',table,'QA reviewer')
 assert.equal(review.rounds[0].entries[0].reviewerApproval.reviewer,'QA reviewer')
 review=updateFactorySampleEntry(review,'fit-A','sleeve:m',{actual:25})
 assert.equal(factoryEntryStatus(review.rounds[0].entries[1]),'FAIL')
 assert.throws(()=>approveFactorySampleEntry(review,'fit-A','sleeve:m',table,'QA reviewer'),/outside tolerance/)
 review=updateFactorySampleEntry(review,'fit-A','sleeve:m',{actual:24.4})
 assert.equal(factoryRoundStatus(review.rounds[0],table),'PENDING_APPROVAL')
 review=approveFactorySampleEntry(review,'fit-A','sleeve:m',table,'Factory reviewer')
 assert.equal(factoryRoundStatus(review.rounds[0],table),'APPROVED')
 review=updateFactorySampleEntry(review,'fit-A','chest:m',{actual:54.8})
 assert.equal(review.rounds[0].entries[0].reviewerApproval,null)
 assert.equal(factoryRoundStatus(review.rounds[0],table),'PENDING_APPROVAL')
})
test('source revision and changed target block previous approvals and print release',()=>{
 let review=startFactorySampleRound(createFactoryReview(table),table)
 for(const entry of review.rounds[0].entries){
  review=updateFactorySampleEntry(review,'sample-1',entry.id,{actual:entry.target})
  review=approveFactorySampleEntry(review,'sample-1',entry.id,table,'Test inspector')
 }
 const stale={...table,sourceRevision:13}
 assert.equal(factoryRoundStatus(review.rounds[0],stale),'BLOCKED')
 assert.throws(()=>approveFactorySampleEntry(review,'sample-1','chest:m',stale,'Inspector'),/revision mismatch/i)
 const print=renderFactorySampleReviewPrint(review,stale)
 assert.match(print,/BLOCKED/)
 assert.match(print,/UNAPPROVED/)
 const changed={...table,rows:table.rows.map((r,i)=>i? r:{...r,cells:{...r.cells,m:{value:57}}})}
 assert.equal(factoryRoundStatus(review.rounds[0],changed),'BLOCKED')
 assert.throws(()=>approveFactorySampleEntry(review,'sample-1','chest:m',changed,'Inspector'),/mismatched/)
 const newRound=startFactorySampleRound(review,stale)
 assert.equal(compareFactorySampleRounds(newRound,'sample-1','sample-2').toRevision,'13')
 assert.equal(factoryRoundStatus(newRound.rounds[1],stale),'BLOCKED')
})
test('factory print escapes user notes and displays actual measured outcomes',()=>{
 let review=startFactorySampleRound(createFactoryReview(table),table)
 review=updateFactorySampleEntry(review,'sample-1','chest:m',{actual:58,issueNote:'<script>alert(1)</script>'})
 const html=renderFactorySampleReviewPrint(review,table)
 assert.match(html,/58/)
 assert.match(html,/FAIL/)
 assert.match(html,/&lt;script&gt;/)
 assert.doesNotMatch(html,/<script>/)
})
test('print pagination retains every spreadsheet row exactly once with correct ranges',()=>{
 const sourceRows=Array.from({length:64},(_,i)=>({id:'r'+i,cells:['SKU-'+String(i).padStart(3,'0'),i]}))
 const sourceTable={columns:[{id:'sku',label:'SKU'},{id:'n',label:'N'}],rows:sourceRows}
 const pieces=paginateTechPackTable(sourceTable,{firstRowCapacity:2,pageStyle:'LetterPortrait'})
 assert.deepEqual(pieces.flatMap(x=>x.table.rows.map(r=>r.id)),sourceRows.map(r=>r.id))
 for(const piece of pieces){if(piece.rows.length){assert.equal(piece.firstRowIndex,piece.offset+1);assert.equal(piece.lastRowIndex,piece.offset+piece.rows.length)}}
 const ws={pageBoxes:{'custom-QA':[{id:'box1',height:155,slot:{spreadsheetTable:sourceTable}}]}}
 const appendix=enumerateWorkspaceOverflowPages(ws,[{id:'custom-QA'}],()=>({pageStyle:'LetterPortrait'}))
 assert.equal(appendix.length,pieces.length-1)
 assert.equal(appendix.reduce((n,p)=>n+p.rows.length,0),sourceRows.length-pieces[0].rows.length)
})
test('real worksheet XML fixture parses out-of-order relationship, rich strings, cached formula and typed values',()=>{
 const base=exportTechPackXlsx([{name:'QA',headers:['Item','Value'],rows:[{cells:['one',1]}]},{name:'Other',headers:['X'],rows:[{cells:['two']}]}])
 const zip=unzipSync(base)
 const rel=strFromU8(zip['xl/_rels/workbook.xml.rels'])
 zip['xl/_rels/workbook.xml.rels']=strToU8(rel.replace('Target="worksheets/sheet1.xml"','Target="worksheets/sheet9.xml"'))
 zip['xl/worksheets/sheet9.xml']=strToU8('<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><r><t>Item</t></r><r><t> Code</t></r></is></c><c r="B1" t="inlineStr"><is><t>Measured</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>0012</t></is></c><c r="B3"><f>2+3</f><v>5</v></c></row></sheetData></worksheet>')
 delete zip['xl/worksheets/sheet1.xml']
 const result=importTechPackXlsx(zipSync(zip))[0]
 assert.deepEqual(result.headers,['Item Code','Measured'])
 assert.deepEqual(result.rows[0].cells,['',''])
 assert.deepEqual(result.rows[1].cells,['0012','=2+3'])
 assert.deepEqual(result.rows[1].formulaCachedValues['1'],{value:'5',type:'n'})
 const exported=exportTechPackXlsx([result])
 assert.doesNotMatch(strFromU8(unzipSync(exported)['xl/worksheets/sheet1.xml']),/<f>2\+3<\/f>/)
})
