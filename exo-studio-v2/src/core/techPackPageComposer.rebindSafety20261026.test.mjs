import test from 'node:test'
import assert from 'node:assert/strict'
import {captureTechPackPageLayout,rebindTechPackTemplateTable} from './techPackPageComposer.js'

const makeCell=(value,id)=>({input:value,value,origin:'native',sourceRef:'measurement-table:'+id,sourceRevision:9})
const col={id:'cm',label:'M (cm)',type:'number'}
const sourceTable={id:'src-table',kind:'measurement-table',columns:[col],sourceLinked:true,
 rows:[{id:'chest',sourceRef:'measurement-table:chest',cells:{cm:makeCell(54,'chest')}},
       {id:'waist',sourceRef:'measurement-table:waist',cells:{cm:makeCell(49,'waist')}}]}
const workspace={pageBoxes:{'custom-design':[{id:'box1',width:500,height:250,slot:{category:'tables',sourceLinked:true,spreadsheetTable:sourceTable}}]}}
test('source-linked template rebind uses stable source identity after rows reordered',()=>{
 const saved=captureTechPackPageLayout(workspace,'custom-design','Factory repeatable POM',{includeContent:true})
 const t=saved.pageSnapshot.boxes[0].slot.spreadsheetTable
 assert.equal(t.rows[0].sourceRowRef,'measurement-table:chest')
 const newGarment={...sourceTable,sourceRevision:10,rows:[
  {id:'waist',sourceRef:'measurement-table:waist',cells:{cm:makeCell(50,'waist')}},
  {id:'chest',sourceRef:'measurement-table:chest',cells:{cm:makeCell(60,'chest')}}
 ]}
 const rebound=rebindTechPackTemplateTable({...t,sourceLinked:true},newGarment)
 assert.equal(rebound.rows[0].cells.cm.value,60,'chest binds chest, not first row (waist)')
 assert.equal(rebound.rows[1].cells.cm.value,50,'waist binds waist, not second row (chest)')
})
test('unknown native POM rows fail closed, never copy a different row by index',()=>{
 const saved=captureTechPackPageLayout(workspace,'custom-design','Factory POM')
 const t=saved.pageSnapshot.boxes[0].slot.spreadsheetTable
 const unrelated={...sourceTable,rows:[
  {id:'neck',sourceRef:'measurement-table:neck',cells:{cm:makeCell(34,'neck')}},
  {id:'hip',sourceRef:'measurement-table:hip',cells:{cm:makeCell(68,'hip')}}
 ]}
 const rebound=rebindTechPackTemplateTable({...t,sourceLinked:true},unrelated)
 assert.deepEqual(rebound.rows.map(row=>row.cells.cm.value),['',''])
 assert(rebound.rows.every(row=>row.cells.cm.reviewState==='needs-review'))
})

test('capture excludes opaque native cell source references without explicit row identity',()=>{
 const input={pageBoxes:{p:[{id:'table',slot:{sourceLinked:true,spreadsheetTable:{
  sourceLinked:true,columns:[{id:'cm',label:'M (cm)'}],rows:[{id:'unlinked-row',cells:{cm:makeCell(51,'chest')}}]
 }}}]}}
 const captured=captureTechPackPageLayout(input,'p','Cell-linked source')
 const saved=captured.pageSnapshot.boxes[0].slot.spreadsheetTable
 assert.equal(saved.rows[0].sourceRowRef,undefined)
 const reordered={columns:[col],rows:[{id:'unlinked-row',cells:{cm:makeCell(99,'waist')}},{id:'elsewhere',cells:{cm:makeCell(61,'chest')}}]}
 const rebound=rebindTechPackTemplateTable({...saved,sourceLinked:true},reordered)
 assert.equal(rebound.rows[0].cells.cm.value,'')
 assert.equal(rebound.rows[0].cells.cm.reviewState,'needs-review')
})

test('linked column rejects a mismatched sourceRef after a column label fallback',()=>{
 const saved={sourceLinked:true,columns:[{id:'old-cm',label:'M (cm)'}],rows:[{id:'saved',sourceRowRef:'measurement-table:chest',cells:{'old-cm':makeCell(54,'chest')}}]}
 const fresh={columns:[{id:'new-cm',label:'M (cm)'}],rows:[{id:'chest',sourceRef:'measurement-table:chest',cells:{'new-cm':makeCell(99,'waist')}}]}
 const result=rebindTechPackTemplateTable(saved,fresh)
 assert.equal(result.rows[0].cells['old-cm'].input,'')
 assert.equal(result.rows[0].cells['old-cm'].reviewState,'needs-review')
})

test('source-linked mixed table retains explicitly authored notes and binds fresh garment values',()=>{
 const source={pageBoxes:{p:[{id:'b',slot:{sourceLinked:true,spreadsheetTable:{sourceLinked:true,kind:'measurement-table',
  columns:[{id:'cm',label:'CM'},{id:'note',label:'NOTE'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{cm:{origin:'native',sourceRef:'pom:chest',input:54},note:{origin:'authored',input:'Check neckline'}}}]}}}]}}
 const saved=captureTechPackPageLayout(source,'p','Mixed',{includeContent:true}).pageSnapshot.boxes[0].slot.spreadsheetTable
 const fresh={columns:[{id:'cm',label:'CM'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{cm:{origin:'native',sourceRef:'pom:chest',input:61}}}]}
 const result=rebindTechPackTemplateTable(saved,fresh,{includeAuthored:true})
 assert.equal(result.rows[0].cells.cm.input,61)
 assert.equal(result.rows[0].cells.note.input,'Check neckline')
 assert.equal(rebindTechPackTemplateTable(saved,fresh).rows[0].cells.note.input,'')
})

test('captured native cells stay pending when current garment has no row identity',()=>{
 const saved=captureTechPackPageLayout(workspace,'custom-design','Safe',{includeContent:true}).pageSnapshot.boxes[0].slot.spreadsheetTable
 const result=rebindTechPackTemplateTable(saved,{columns:[col],rows:[{id:'other',sourceRef:'other',cells:{cm:makeCell(90,'other')}}]})
 assert(result.rows.every(row=>row.cells.cm.reviewState==='needs-review'))
})

test('rebind rejects authored or unproven fresh cells even when their row and column identities match',()=>{
 const saved={sourceLinked:true,columns:[{id:'cm',label:'CM'}],rows:[{id:'saved',sourceRowRef:'pom:chest',cells:{cm:{input:'',origin:'native'}}}]}
 const fresh={columns:[{id:'cm',label:'CM'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{cm:{input:'63',value:'63',origin:'authored'}}}]}
 const rebound=rebindTechPackTemplateTable(saved,fresh)
 assert.equal(rebound.rows[0].cells.cm.input,'')
 assert.equal(rebound.rows[0].cells.cm.reviewState,'needs-review')
})

test('rebind rejects a native cell referring to another POM on an otherwise matched row',()=>{
 const saved={sourceLinked:true,columns:[{id:'cm',label:'CM'}],rows:[{id:'saved',sourceRowRef:'pom:chest',cells:{cm:{input:'',origin:'native'}}}]}
 const fresh={columns:[{id:'cm',label:'CM'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{cm:{input:77,value:77,origin:'native',sourceRef:'pom:waist'}}}]}
 const rebound=rebindTechPackTemplateTable(saved,fresh)
 assert.equal(rebound.rows[0].cells.cm.input,'')
 assert.equal(rebound.rows[0].cells.cm.reviewState,'needs-review')
})
