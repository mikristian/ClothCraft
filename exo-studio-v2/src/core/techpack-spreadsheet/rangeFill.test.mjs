import test from 'node:test'
import assert from 'node:assert/strict'
import {fillGridRange,shiftFormulaReferences} from './rangeFill.js'
import {fromGridTable,toGridTable} from './tableAdapter.js'
import {evaluateTableFormulas} from './formulas.js'

test('relative and absolute cell references shift independently',()=>{
  assert.equal(shiftFormulaReferences('=SUM(A1:B2)+$C3+D$4+$E$5',2,1),'=SUM(B3:C4)+$C5+E$4+$E$5')
  assert.equal(shiftFormulaReferences('=IF(A1>0,ROUND(B1,2),0)',1,0),'=IF(A2>0,ROUND(B2,2),0)')
  assert.equal(shiftFormulaReferences('=A1',-1,0),'=#REF!')
  assert.equal(shiftFormulaReferences('plain A1',3,4),'plain A1')
})

test('fill preserves quoted formula literals and doubled quote escapes',()=>{
  assert.equal(shiftFormulaReferences('=IF(A1>0,"A1",$B2)',1,2),'=IF(C2>0,"A1",$B3)')
  assert.equal(shiftFormulaReferences('=IF(A1>0,"note ""B7"" at C4",D$5)',2,1),'=IF(B3>0,"note ""B7"" at C4",E$5)')
  assert.equal(shiftFormulaReferences('="A1"&A1',1,1),'="A1"&B2')
  assert.equal(shiftFormulaReferences('="A1"',1,1),'="A1"')
})

test('fill down and right use original source row or column for all targets',()=>{
  const source={headers:['A','B','C'],rows:[{id:'r1',cells:['=B1+1','5','']},{id:'r2',cells:['','','']},{id:'r3',cells:['','','']}]}
  const down=fillGridRange(source,{r:0,r2:2,c:0,c2:0},'down')
  assert.deepEqual(down.rows.map(row=>row.cells[0]),['=B1+1','=B2+1','=B3+1'])
  const right=fillGridRange(source,{r:0,r2:0,c:0,c2:2},'right')
  assert.deepEqual(right.rows[0].cells,['=B1+1','=C1+1','=D1+1'])
  assert.equal(source.rows[1].cells[0],'')
})

test('absolute references remain calculable after filling',()=>{
  const grid={headers:['Base','Calc'],rows:[{id:'one',cells:['3','=$A$1+A1']},{id:'two',cells:['4','']}]}
  const filled=fillGridRange(grid,{r:0,r2:1,c:1,c2:1},'down')
  assert.equal(filled.rows[1].cells[1],'=$A$1+A2')
  assert.equal(evaluateTableFormulas(filled).getCell(1,1).value,7)
})

test('filling source-linked canonical cells creates review-required overrides only at targets',()=>{
  const original={columns:[{id:'a',label:'Size'},{id:'b',label:'Result'}],rows:[{id:'r1',cells:{a:{value:'10',input:'10',origin:'native',sourceRef:'native:1'},b:{value:'=A1+1',input:'=A1+1',origin:'authored'}}},{id:'r2',cells:{a:{value:'12',input:'12',origin:'native',sourceRef:'native:2'},b:{value:'',input:'',origin:'authored'}}}]}
  const grid=toGridTable(original)
  const changed=fromGridTable(original,fillGridRange(grid,{r:0,r2:1,c:1,c2:1},'down'))
  assert.equal(changed.rows[1].cells.b.input,'=A2+1')
  assert.equal(changed.rows[1].cells.a.origin,'native')
  assert.deepEqual(original.rows[1].cells.a,{value:'12',input:'12',origin:'native',sourceRef:'native:2'})
})
