import test from 'node:test'
import assert from 'node:assert/strict'
import {createTableV3,toLegacyTable} from './schemaV3.js'
import {migrateV2Workspace,migrateWorkspaceTablesV2} from './migrateV2.js'
import {editCell,insertRow,deleteRow,insertColumn,deleteColumn,pasteTSV,tableReducer} from './tableReducer.js'
import {validateTableV3,validateCellType} from './validation.js'

const make=()=>createTableV3({id:'spec',title:'MEASUREMENTS',pageId:'measurements',columns:[{id:'a',label:'POM'},{id:'b',label:'CM',type:'number'}],rows:[{id:'r1',cells:['Chest','58']},{id:'r2',cells:['Waist','50']}]})

test('migrates standalone page tables and positioned box slots without changing V2',()=>{
  const workspace={tables:{measurements:[{id:'t1',title:'Measurements',headers:['POM','Size'],rows:[{id:'r1',cells:['Chest','=B4+2']}]}]},pageBoxes:{'custom-1':[{id:'box-1',x:91,y:42,slot:{category:'tables',title:'Spec',headers:['Item'],rows:[{id:'row',cells:['Trim']}]}},{id:'box-2',slot:{category:'headers',title:'Hero'}}]}}
  const snapshot=structuredClone(workspace)
  const tables=migrateWorkspaceTablesV2(workspace)
  assert.equal(tables.length,2)
  assert.equal(tables[0].rows[0].cells['column-1'].value,'=B4+2')
  assert.equal(tables[1].boxId,'box-1')
  assert.equal(tables[1].pageId,'custom-1')
  assert.deepEqual(workspace,snapshot)
  assert.equal(migrateV2Workspace(workspace).spreadsheetV3.version,3)
  assert.deepEqual(toLegacyTable(tables[0]),workspace.tables.measurements[0])
})

test('stable identifiers survive row and column modifications',()=>{
  let table=make()
  table=insertRow(table,{at:1,id:'r-new',values:['Hip','54']})
  table=insertColumn(table,{at:1,id:'c-new',label:'Tolerance'})
  assert.deepEqual(table.rows.map(r=>r.id),['r1','r-new','r2'])
  assert.deepEqual(table.columns.map(c=>c.id),['a','c-new','b'])
  assert.equal(table.rows[2].cells.b.value,'50')
  table=deleteRow(table,'r-new')
  table=deleteColumn(table,'c-new')
  assert.deepEqual(table,make())
})

test('rectangular paste expands both axes, preserves tabs blanks and formula strings',()=>{
  const original=make()
  const changed=pasteTSV(original,{rowId:'r2',columnId:'b',tsv:'60\t=SUM(B1:B2)\r\n\t9\r\n'})
  assert.equal(changed.columns.length,3)
  assert.equal(changed.rows.length,3)
  assert.equal(changed.rows[1].cells.b.value,'60')
  assert.equal(changed.rows[1].cells[changed.columns[2].id].value,'=SUM(B1:B2)')
  assert.equal(changed.rows[2].cells.b.value,'')
  assert.equal(changed.rows[2].cells[changed.columns[2].id].value,'9')
  assert.equal(original.rows.length,2)
  assert.throws(()=>pasteTSV(original,{rowId:'r2',columnId:'b',tsv:'3\t5',expand:false}),RangeError)
})

test('TSV paste preserves Excel quoted cells with embedded tabs, line breaks and escaped quotes',()=>{
 const original=make()
 const changed=pasteTSV(original,{rowId:'r1',columnId:'a',tsv:'"Cotton\tweight"\t"12"\r\n"Care\n""wash"""\t"15"\r\n'})
 assert.equal(changed.rows[0].cells.a.input,'Cotton\tweight')
 assert.equal(changed.rows[1].cells.a.input,'Care\n"wash"')
 assert.equal(changed.rows[1].cells.b.input,'15')
 assert.deepEqual(pasteTSV(original,{rowId:'r1',columnId:'a',tsv:''}),original)
 assert.deepEqual(original.rows[0].cells.a.input,'Chest')
})

test('source values retain provenance when overridden and source remains unchanged',()=>{
  const source=createTableV3({origin:'source',id:'native',columns:[{id:'p',label:'Panel'}],rows:[{id:'row',cells:['Front']} ]})
  const changed=editCell(source,'row','p','Back')
  assert.equal(source.rows[0].cells.p.value,'Front')
  assert.deepEqual(changed.rows[0].cells.p.provenance,{kind:'override',sourceRef:{rowId:'row',columnId:'p'},originalValue:'Front'})
  assert.equal(editCell(changed,'row','p','Collar').rows[0].cells.p.provenance.originalValue,'Front')
  assert.equal(tableReducer(source,{type:'editCell',rowId:'row',columnId:'p',value:'Sleeve'}).rows[0].cells.p.value,'Sleeve')
})

test('typed validation catches wrong values and malformed identifiers',()=>{
  assert.equal(validateTableV3(make()).valid,true)
  assert.equal(validateTableV3(editCell(make(),'r1','b','abc')).errors[0].code,'cell-type')
  assert.equal(validateCellType('2026-02-30','date'),false)
  assert.equal(validateCellType('2026-02-28','date'),true)
  assert.equal(validateCellType('=SUM(A1:A5)','formula'),true)
  assert.equal(validateCellType('SUM(A1:A5)','formula'),false)
  const duplicate=make();duplicate.rows[1].id='r1'
  assert.equal(validateTableV3(duplicate).errors.some(e=>e.code==='row-id'),true)
})
