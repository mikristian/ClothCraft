import test from 'node:test'
import assert from 'node:assert/strict'
import {importedSheetToWorkspaceTable} from './importIntoWorkspace.js'
import {toGridTable,fromGridTable} from './tableAdapter.js'
import {evaluateTableFormulas} from './formulas.js'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'

test('Excel workbook imports to editable workspace retaining styles, dimensions and formula input',()=>{
  const authored={name:'Production details',columns:[{id:'item',label:'ITEM',width:224},{id:'quantity',label:'QTY',width:140}],
    rows:[{id:'a',cells:{item:{input:7},quantity:{input:'=A1+2'}}},{id:'b',cells:{item:{input:10},quantity:{input:'=A2+2'}}}],
    cellStyles:{'a:1':{bold:true,color:'#114488',background:'#ffff00',align:'right'}}}
  const imported=importTechPackXlsx(exportTechPackXlsx([authored]))[0]
  const table=importedSheetToWorkspaceTable(imported,{id:'sheet1',pageId:'custom-import',boxId:'box1'})
  assert.equal(table.columns[0].width,224)
  assert.equal(table.columns[1].width,140)
  assert.deepEqual(table.cellStyles['import-row-1:1'],{bold:true,align:'right',color:'#114488',background:'#ffff00'})
  assert.equal(table.rows[1].cells['col-1'].input,'=A2+2')
  assert.equal(evaluateTableFormulas(table).getCell(1,1).value,12)
  assert.equal(table.rows[0].cells['col-0'].origin,'authored')
  assert.equal(table.rows[0].cells['col-0'].sourceRef,undefined)
  assert.equal(table.imported,true)
  assert.equal(table.needsReview,true)
  const grid=toGridTable(table)
  grid.rows[1].cells[0]='12'
  const edited=fromGridTable(table,grid)
  assert.equal(edited.rows[1].cells['col-0'].input,'12')
  assert.equal(edited.rows[1].cells['col-0'].override,undefined)
  assert.deepEqual(edited.cellStyles,table.cellStyles)
})

test('importer ignores malformed formatting selectors and strips spoofed origin',()=>{
  const sheet={name:'Sheet',headers:['One'],columnWidths:[9999],rows:[{id:'native-row',cells:['=1+2']}],
    cellStyles:{'0:0':{bold:true,color:'red',background:'#123456',align:'justify'},'999:0':{bold:true},'0:999':{bold:true}},origin:'native',sourceRef:'native:old',needsReview:false}
  const table=importedSheetToWorkspaceTable(sheet,{id:'imported'})
  assert.equal(table.columns[0].width,700)
  assert.deepEqual(table.cellStyles,{'import-row-1:0':{bold:true,background:'#123456'}})
  assert.equal(table.origin,'authored')
  assert.equal(table.needsReview,true)
  assert.equal(table.sourceRef,undefined)
})
