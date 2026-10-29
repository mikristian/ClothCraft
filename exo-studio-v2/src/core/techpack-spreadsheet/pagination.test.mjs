import test from 'node:test'
import assert from 'node:assert/strict'
import {paginateTechPackTable,enumerateWorkspaceOverflowPages,boxTableRowCapacity,paperRowsPerSheet} from './pagination.js'
const table={id:'pom',columns:[{id:'ref',label:'POM'},{id:'s',label:'S (cm)'}],rows:Array.from({length:99},(_,i)=>({id:`row-${i}`,cells:{ref:{input:`PO-${i+1}`},s:{input:i}}}))}
test('100-row workbook never truncates data in Letter portrait',()=>{
 const parts=paginateTechPackTable(table,{firstRowCapacity:4,pageStyle:'LetterPortrait'})
 assert.equal(parts.flatMap(part=>part.rows).length,99)
 assert.deepEqual(parts.flatMap(part=>part.rows).map(r=>r.id),table.rows.map(r=>r.id))
 assert.equal(parts[0].rows.length,4)
 assert(parts.slice(1).every(part=>part.rows.length<=paperRowsPerSheet('LetterPortrait')))
 assert.equal(parts.at(-1).lastRowIndex,99)
 assert(parts.every(part=>part.total===parts.length))
})
test('letter landscape has stricter row capacity and empty boxes do not hide specifications',()=>{
 assert(paperRowsPerSheet('LetterLandscape')<paperRowsPerSheet('LetterPortrait'))
 const blank=paginateTechPackTable(table,{firstRowCapacity:boxTableRowCapacity(65),pageStyle:'LetterLandscape'})
 assert.equal(blank[0].rows.length,0)
 assert.equal(blank.slice(1).flatMap(s=>s.rows).length,99)
})
test('collects exactly all source-page overflow fragments with traceable page IDs',()=>{
 const document={pageBoxes:{'custom-a':[{id:'pom-box',height:155,slot:{spreadsheetTable:table}}],other:[{id:'no-table',slot:{}}]}}
 const extra=enumerateWorkspaceOverflowPages(document,[{id:'custom-a'},{id:'other'}],()=>({pageStyle:'LetterLandscape'}))
 assert(extra.length>=5)
 assert.deepEqual(extra.flatMap(p=>p.rows.map(row=>row.id)),table.rows.slice(2).map(r=>r.id))
 assert(extra.every(p=>p.sourcePageId==='custom-a'&&p.boxId==='pom-box'))
})
