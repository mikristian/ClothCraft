import assert from 'node:assert/strict'
import {test} from 'node:test'
import {toGridTable,fromGridTable,moveGridColumn,normalizeTableStyle} from './tableAdapter.js'

test('reordering columns keeps source column identity, source values, styles and widths',()=>{
  const source={sourceRevision:7,columns:[{id:'chest',label:'Chest',width:140},{id:'waist',label:'Waist',width:190}],rows:[{id:'sample',cells:{chest:{input:'48',value:'48',origin:'native',sourceRef:'pom:chest'},waist:{input:'42',value:'42',origin:'native',sourceRef:'pom:waist'}}}],cellStyles:{'sample:0':{bold:true},'sample:1':{italic:true}}}
  const grid=moveGridColumn(toGridTable(source),0,1)
  const saved=fromGridTable(source,{...grid,tableStyle:{theme:'dark'}})
  assert.deepEqual(saved.columns.map(col=>col.id),['waist','chest'])
  assert.deepEqual(saved.columns.map(col=>col.width),[190,140])
  assert.equal(saved.rows[0].cells.chest.sourceRef,'pom:chest')
  assert.equal(saved.rows[0].cells.chest.input,'48')
  assert.equal(saved.rows[0].cells.waist.sourceRef,'pom:waist')
  assert.deepEqual(saved.cellStyles,{'sample:1':{bold:true},'sample:0':{italic:true}})
  assert.equal(saved.tableStyle.theme,'dark')
})

test('editing a linked cell records review override while formatting preserves original input',()=>{
  const source={columns:[{id:'p1',label:'Measurement'}],rows:[{id:'r1',cells:{p1:{input:'10',value:'10',origin:'native',sourceRef:'pom-1'}}}]}
  const grid=toGridTable(source)
  const styled=fromGridTable(source,{...grid,cellStyles:{'r1:0':{bold:true}},tableStyle:{theme:'custom',header:'#112233',stripe:'#f0f0f0'}})
  assert.deepEqual(styled.rows[0].cells.p1,source.rows[0].cells.p1)
  assert.equal(styled.tableStyle.header,'#112233')
  const edited=fromGridTable(source,{...grid,rows:[{...grid.rows[0],cells:['12']}]})
  assert.equal(edited.rows[0].cells.p1.override,true)
  assert.equal(edited.rows[0].cells.p1.reviewState,'needs-review')
  assert.equal(edited.rows[0].cells.p1.underlyingSourceValue,'10')
})

test('table styles sanitize color fields and never mutate original input',()=>{
  assert.deepEqual(normalizeTableStyle({theme:'medium',header:'red',stripe:'#aabbcc'}),{theme:'medium',header:undefined,stripe:'#aabbcc',text:undefined})
})

test('reordered source rows retain correct row provenance and edits target original row ID',()=>{
  const source={sourceRevision:3,columns:[{id:'trim',label:'Trim'}],rows:[
    {id:'button',sourceRef:'hardware:button',cells:{trim:{input:'Metal button',origin:'native',sourceRef:'hardware:button'}}},
    {id:'zipper',sourceRef:'hardware:zipper',cells:{trim:{input:'Coil zipper',origin:'native',sourceRef:'hardware:zipper'}}}
  ]}
  const grid=toGridTable(source)
  const reordered={...grid,rows:[{...grid.rows[1],cells:['Waterproof zipper']},grid.rows[0]]}
  const saved=fromGridTable(source,reordered)
  assert.deepEqual(saved.rows.map(row=>row.id),['zipper','button'])
  assert.equal(saved.rows[0].sourceRef,'hardware:zipper')
  assert.equal(saved.rows[0].cells.trim.provenance.sourceRef,'hardware:zipper')
  assert.equal(saved.rows[0].cells.trim.underlyingSourceValue,'Coil zipper')
  assert.equal(saved.rows[1].cells.trim.sourceRef,'hardware:button')
  assert.equal(saved.rows[1].cells.trim.override,undefined)
})
