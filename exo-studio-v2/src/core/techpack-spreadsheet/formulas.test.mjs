import test from 'node:test'
import assert from 'node:assert/strict'
import {createTableV3} from './schemaV3.js'
import {evaluateTableFormulas} from './formulas.js'

test('BOM arithmetic with columns, aggregate functions and explicit raw formulas',()=>{
  const table=createTableV3({columns:[{id:'qty',label:'QTY'},{id:'unit',label:'COST'},{id:'total',label:'TOTAL'}],rows:[
    {id:'fabric',cells:['3','12.5','=A1*B1']},
    {id:'buttons',cells:['5','0.75','=ROUND(A2*B2,2)']},
    {id:'totals',cells:['=SUM(A1:A2)','=COUNT(B1:B2)','=SUM(C1:C2)']}
  ]})
  const result=evaluateTableFormulas(table)
  assert.equal(result.getCell(0,2).value,37.5)
  assert.equal(result.getCell(1,2).value,3.75)
  assert.equal(result.getCell(2,0).value,8)
  assert.equal(result.getCell(2,1).value,2)
  assert.equal(result.getCell(2,2).value,41.25)
  assert.equal(result.getCell(0,2).raw,'=A1*B1')
  assert.equal(table.rows[0].cells.total.input,'=A1*B1')
})

test('POM and mixed typed canonical source table, MIN MAX IF and errors',()=>{
  const table={id:'native',kind:'measurements',columns:[{id:'a',label:'SIZE'},{id:'b',label:'GRADE'}],rows:[
    {id:'s',cells:{a:{input:59,value:59,origin:'native'},b:{input:'=IF(A1>=60,1,0)',value:'=IF(A1>=60,1,0)',origin:'authored'}}},
    {id:'m',cells:{a:{input:'=MAX(A1,60)',value:'=MAX(A1,60)'},b:{input:'=MIN(A1,58)',value:'=MIN(A1,58)'}}},
    {id:'bad',cells:{a:{input:'=Z99'},b:{input:'=UNKNOWN(A1)'}}}
  ]}
  const result=evaluateTableFormulas(table)
  assert.equal(result.getCell(0,1).value,0)
  assert.equal(result.getCell(1,0).value,60)
  assert.equal(result.getCell(1,1).value,58)
  assert.equal(result.getCell(2,0).error,'#REF!')
  assert.equal(result.getCell(2,1).error,'#NAME?')
})

test('legacy tables, circular references and disallowed syntax',()=>{
  const table={headers:['A','B'],rows:[{id:'r1',cells:['=B1','=A1']},{id:'r2',cells:['=1/0','=DANGEROUS(4)']},{id:'r3',cells:['=SUM(A9)','=2+3*4']}]}
  const result=evaluateTableFormulas(table)
  assert.equal(result.getCell(0,0).error,'#CYCLE!')
  assert.equal(result.getCell(0,1).error,'#CYCLE!')
  assert.equal(result.getCell(1,0).error,'#DIV/0!')
  assert.equal(result.getCell(1,1).error,'#NAME?')
  assert.equal(result.getCell(2,0).error,'#REF!')
  assert.equal(result.getCell(2,1).value,14)
  assert.equal(evaluateTableFormulas({headers:['A'],rows:[{cells:['=globalThis.constructor(1)']}]}).getCell(0,0).error,'#ERROR!')
})

test('IF evaluates selected branch only, including nested IF',()=>{
  const table={headers:['A'],rows:[{cells:['=IF(1,IF(0,1/0,17),Z100)']},{cells:['=IF(0,1/0,4)']}]}
  const result=evaluateTableFormulas(table)
  assert.equal(result.getCell(0,0).value,17)
  assert.equal(result.getCell(1,0).value,4)
})

test('IF skips division by zero and unknown functions in inactive branches',()=>{
  const table={headers:['RESULT'],rows:[
    {id:'true-branch',cells:['=IF(TRUE, 5, 1/0)']},
    {id:'false-branch',cells:['=IF(FALSE,UNKNOWN(),3)']}
  ]}
  const result=evaluateTableFormulas(table)
  assert.deepEqual([result.getCell(0,0).value,result.getCell(1,0).value],[5,3])
  assert.equal(result.getCell(0,0).error,null)
  assert.equal(result.getCell(1,0).error,null)
})
