import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSpreadsheetClipboard,serializeSpreadsheetSelection,pasteSpreadsheetRange} from './gridClipboard.js'
import {fromGridTable,toGridTable} from './tableAdapter.js'

test('Excel TSV clipboard preserves quoted tabs, embedded lines, quotes and empty cells',()=>{
  const cells=[['A\tB','Double "quoted"','Line 1\nLine 2'],['','0','']]
  assert.deepEqual(parseSpreadsheetClipboard(serializeSpreadsheetSelection(cells)),cells)
  assert.deepEqual(parseSpreadsheetClipboard('1\t2\r\n3\t\r\n'),[['1','2'],['3','']])
})

test('clipboard enforces row and column limits even when the last cell has no newline',()=>{
  assert.deepEqual(parseSpreadsheetClipboard('a\tb',{maxColumns:2}),[['a','b']])
  assert.deepEqual(parseSpreadsheetClipboard('a\nb',{maxRows:2}),[['a'],['b']])
  assert.throws(()=>parseSpreadsheetClipboard('a\tb\tc',{maxColumns:2}),RangeError)
  assert.throws(()=>parseSpreadsheetClipboard('a\nb\nc',{maxRows:2}),RangeError)
  assert.throws(()=>parseSpreadsheetClipboard('a\tb',{maxColumns:1}),RangeError)
  assert.throws(()=>parseSpreadsheetClipboard('a\nb',{maxRows:1}),RangeError)
})

test('single-value paste fills selected rectangle and leaves source grid untouched',()=>{
  const grid={headers:['A','B'],rows:[{id:'r1',cells:['1','2']},{id:'r2',cells:['3','4']}]}
  const pasted=pasteSpreadsheetRange(grid,{r:0,r2:1,c:0,c2:1},'5')
  assert.deepEqual(pasted.grid.rows.map(row=>row.cells),[['5','5'],['5','5']])
  assert.equal(grid.rows[0].cells[0],'1')
  assert.deepEqual(pasted.range,{r:0,r2:1,c:0,c2:1})
})

test('pasting new rows and clipped columns preserves existing native source identity',()=>{
  const source={columns:[{id:'a',label:'A'},{id:'b',label:'B'}],sourceRevision:5,
    rows:[{id:'original',sourceRef:'native:test',cells:{a:{input:'5',value:'5',origin:'native',sourceRef:'native:cell'},b:{input:'6',value:'6',origin:'native'}}}]}
  const pasted=pasteSpreadsheetRange(toGridTable(source),{r:0,r2:0,c:1,c2:1},'7\t8\r\n9\t10')
  const updated=fromGridTable(source,pasted.grid)
  assert.equal(updated.rows[0].cells.b.input,'7')
  assert.equal(updated.rows[0].cells.b.override,true)
  assert.equal(updated.rows[0].cells.a.input,'5')
  assert.equal(updated.rows[1].cells.b.input,'9')
  assert.equal(updated.rows[1].cells.b.override,undefined)
  assert.equal(updated.rows[1].sourceRef,undefined)
  assert.equal(source.rows.length,1)
})
