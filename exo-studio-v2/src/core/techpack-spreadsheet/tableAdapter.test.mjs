import test from 'node:test'
import assert from 'node:assert/strict'
import {toGridTable,fromGridTable} from './tableAdapter.js'
test('canonical spreadsheet roundtrip preserves linked values and manual edits',()=>{
  const original={id:'bom',columns:[{id:'item',label:'Item',width:190,type:'text'},{id:'qty',label:'Qty',width:100,type:'number'}],rows:[{id:'r1',cells:{item:{input:'Zip',value:'Zip',origin:'source',sourceRef:'fabric-1'},qty:{input:'2',value:2,origin:'source'}}}]}
  const grid=toGridTable(original)
  assert.deepEqual(grid.headers,['Item','Qty'])
  assert.deepEqual(grid.rows[0].cells,['Zip','2'])
  const unchanged=fromGridTable(original,grid)
  assert.equal(unchanged.rows[0].cells.item.sourceRef,'fabric-1')
  assert.equal(unchanged.rows[0].cells.qty.value,2)
  grid.rows[0].cells[1]='3'
  grid.columnWidths[0]=240
  const updated=fromGridTable(original,grid)
  assert.equal(updated.rows[0].cells.qty.input,'3')
  assert.equal(updated.rows[0].cells.qty.value,'3')
  assert.equal(updated.rows[0].cells.qty.origin,'authored')
  assert.equal(updated.rows[0].cells.qty.override,undefined)
  assert.equal(updated.rows[0].cells.qty.reviewState,undefined)
  assert.equal(updated.columns[0].width,240)
  assert.equal(updated.columns[0].id,'item')
})
test('native source provenance is retained for edits including empty source and clearing values',()=>{
  const original={sourceRevision:41,columns:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}],
    rows:[{id:'native-row',sourceRef:'pom:chest',cells:{
      a:{input:'54',value:54,origin:'native',sourceRef:'pom:chest',sourceRevision:40,reviewState:'source-derived'},
      b:{input:null,value:null,origin:'native',sourceRef:'pom:chest',sourceRevision:40},
      c:{input:'ignored',value:'ignored',origin:'authored'}
    }}]}
  const snapshot=structuredClone(original)
  const grid=toGridTable(original)
  grid.rows[0].cells=['55','new','']
  const modified=fromGridTable(original,grid)
  const a=modified.rows[0].cells.a,b=modified.rows[0].cells.b,c=modified.rows[0].cells.c
  for(const cell of [a,b]){
    assert.equal(cell.origin,'authored')
    assert.equal(cell.override,true)
    assert.equal(cell.reviewState,'needs-review')
    assert.equal(cell.sourceRef,'pom:chest')
    assert.equal(cell.sourceRevision,40)
    assert.equal(cell.underlyingSourceRevision,40)
    assert.equal(cell.provenance.kind,'override')
  }
  assert.equal(a.underlyingSourceValue,54)
  assert.equal(b.underlyingSourceValue,null)
  assert.equal(b.input,'new')
  assert.equal(c.origin,'authored')
  assert.equal(c.override,true) // row-level source link also binds this cell
  assert.equal(c.underlyingSourceValue,'ignored')
  assert.deepEqual(original,snapshot)
  const unchanged=fromGridTable(original,toGridTable(original))
  assert.equal(unchanged.rows[0].cells.b.input,null)
  assert.equal(unchanged.rows[0].cells.b.override,undefined)
})
test('authored cells without source links stay authored and never acquire override flags',()=>{
  const original={columns:[{id:'note',label:'Notes'}],rows:[{id:'custom',cells:{note:{input:'',value:'',origin:'authored'}}}]}
  const grid=toGridTable(original)
  grid.rows[0].cells[0]='Text'
  const cell=fromGridTable(original,grid).rows[0].cells.note
  assert.equal(cell.origin,'authored')
  assert.equal(cell.override,undefined)
  assert.equal(cell.underlyingSourceValue,undefined)
})
test('legacy spreadsheet roundtrip keeps array based cells',()=>{
  const table={headers:['Point'],rows:[{id:'a',cells:['Chest']}]}
  assert.deepEqual(fromGridTable(table,toGridTable(table)),table)
})
