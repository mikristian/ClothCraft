import test from 'node:test';import assert from 'node:assert/strict'
import {renderTechPackSpreadsheetTable,listSpreadsheetTablesFromWorkspace} from './printProjection.js'
import {createBoundTechPackTable} from './sourceBindings.js'
import {toGridTable,fromGridTable} from './tableAdapter.js'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'
test('escaped printable table includes authored contents and repeats headers',()=>{
 const table={id:'sample',headers:['ITEM','NOTE'],rows:[{id:'r',cells:['Needle','<img onerror="attack" src=x>']}]} 
 const html=renderTechPackSpreadsheetTable(table)
 assert.match(html,/<thead>/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img onerror/)
})
test('workspace embedded spreadsheet table can be discovered without changing external tables',()=>{
 const source={s:{id:'s',headers:['A'],rows:[]}}
 const workspace={pageBoxes:{'custom-page':[{id:'b1',slot:{spreadsheetTable:{id:'b-table',headers:['B'],rows:[]}}}]}}
 assert.deepEqual(listSpreadsheetTablesFromWorkspace(workspace,source).map(t=>t.id).sort(),['b-table','s'])
 assert.deepEqual(Object.keys(source),['s'])
})
test('printed cells retain editor styling with stable row identity and relative column widths',()=>{
 const table={id:'spec',columns:[{id:'name',label:'NAME',width:210},{id:'value',label:'QTY',width:105}],
   rows:[{id:'stable-r1',cells:{name:{input:'Rib'},value:{input:'6'}}},{id:'stable-r2',cells:{name:{input:'Label'},value:{input:'3'}}}],
   cellStyles:{'stable-r1:1':{bold:true,align:'right',background:'#ffeeaa'},'1:1':{underline:true}},
   tableStyle:{theme:'custom',header:'#123456',stripe:'#eeeeee'}}
 const html=renderTechPackSpreadsheetTable(table)
 assert.match(html,/<colgroup><col style="width:66\.667%"\/><col style="width:33\.333%"\/><\/colgroup>/)
 assert.match(html,/font-weight:800;text-align:right;background:#ffeeaa/)
 assert.match(html,/text-decoration:underline/)
 assert.match(html,/--exo-table-header:#123456/)
 assert.doesNotMatch(html,/origin="native"/)
})

test('saved linked trim blocks keep independent overrides through reopen and Excel export',()=>{
 const garment={kind:'native',ready:true,revision:11,name:'Jacket',panels:[],seams:[],fabrics:[],pom:{},pomTargets:{},grading:{sizes:[]}}
 const generated=createBoundTechPackTable('labels',garment)
 const [first,second]=[1,2].map(index=>({ ...generated,
   rows:[{id:'zipper-trim',sourceRef:'labels:zipper-trim',cells:{[generated.columns[0]?.id||'column-0']:{input:`Zipper trim ${index}`,origin:'authored',override:true,sourceRef:'labels:zipper-trim'}}}],
   columns:generated.columns.length?generated.columns:[{id:'column-0',label:'TRIM'}],name:`Trim specification ${index}`}))
 const page='custom-trims'
 const workspace={pageBoxes:{[page]:[
   {id:'trim-a',slot:{category:'tables',sourceLinked:true,spreadsheetTable:first}},
   {id:'trim-b',slot:{category:'tables',sourceLinked:true,spreadsheetTable:second}}
 ]}}
 const reopened=JSON.parse(JSON.stringify(workspace))
 const gathered=listSpreadsheetTablesFromWorkspace(reopened,{[generated.id]:generated})
 assert.equal(gathered.length,3)
 assert.equal(gathered[1].rows[0].cells[first.columns[0].id].input,'Zipper trim 1')
 assert.equal(gathered[2].rows[0].cells[second.columns[0].id].input,'Zipper trim 2')
 const workbook=importTechPackXlsx(exportTechPackXlsx(gathered))
 assert.equal(workbook.length,3)
 assert.equal(workbook[1].rows[0].cells[0],'Zipper trim 1')
 assert.equal(workbook[2].rows[0].cells[0],'Zipper trim 2')
 assert.deepEqual(toGridTable(fromGridTable(first,toGridTable(first))).headers,first.columns.map(column=>column.label))
})

test('positioned edited spreadsheet supersedes stale registry duplicate during XLSX roundtrip',()=>{
 const old={id:'bom',name:'BOM',headers:['TRIM','QTY'],rows:[{id:'zipper',cells:['Original zipper','1']}]}
 const edited={...old,rows:[{id:'zipper',cells:['Edited waterproof zipper','2']}]}
 const workspace=JSON.parse(JSON.stringify({spreadsheetTables:{bom:old},pageBoxes:{materials:[
   {id:'board-bom',slot:{category:'tables',spreadsheetTable:edited}}
 ]}}))
 const gathered=listSpreadsheetTablesFromWorkspace(workspace)
 assert.equal(gathered.length,1)
 assert.equal(gathered[0].rows[0].cells[0],'Edited waterproof zipper')
 const imported=importTechPackXlsx(exportTechPackXlsx(gathered))
 assert.equal(imported.length,1)
 assert.deepEqual(imported[0].rows[0].cells,['Edited waterproof zipper','2'])
})
