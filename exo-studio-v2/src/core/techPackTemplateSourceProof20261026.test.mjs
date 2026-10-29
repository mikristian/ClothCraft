import test from 'node:test'
import assert from 'node:assert/strict'
import {rebindTechPackTemplateTable} from './techPackPageComposer.js'

test('source-linked table with no stable row reference fails closed even when columns and row positions match',()=>{
  const saved={sourceLinked:true,columns:[{id:'size',label:'Size'}],rows:[{id:'blank-row-0',cells:{size:{input:'',value:'',origin:'native'}}}]}
  const fresh={columns:[{id:'size',label:'Size'}],rows:[{id:'chest',cells:{size:{input:96,value:96,origin:'native',sourceRef:'pom:chest'}}}]}
  const output=rebindTechPackTemplateTable(saved,fresh)
  assert.equal(output.rows[0].cells.size.value,'')
  assert.equal(output.rows[0].cells.size.reviewState,'needs-review')
})

test('a valid source row ID permits controlled rebinding without copying historic measurements',()=>{
  const saved={sourceLinked:true,columns:[{id:'size',label:'Size'}],rows:[{id:'template-1',sourceRowId:'chest',cells:{size:{input:'',value:'',origin:'native'}}}]}
  const fresh={columns:[{id:'size',label:'Size'}],rows:[{id:'chest',cells:{size:{input:88,value:88,origin:'native',sourceRef:'pom:chest'}}}]}
  const output=rebindTechPackTemplateTable(saved,fresh)
  assert.equal(output.rows[0].cells.size.value,88)
})
