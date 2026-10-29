import test from 'node:test'
import assert from 'node:assert/strict'
import {createBoundTechPackTable,authoredSpecOverride,refreshBoundTechPackTable} from './sourceBindings.js'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'
import {renderTechPackWorkspacePrintHTML} from '../techPackWorkspacePrint.js'
import {editCell} from './tableReducer.js'
const source={kind:'native',ready:true,name:'TEST TEE',revision:13,panels:[],seams:[{id:'neck-seam',name:'Neck seam',type:'overlock',first:'body',second:'rib'}],
  fabrics:[{id:'jersey',name:'Cotton jersey',color:'Black',gsm:230}],pom:{M:[{id:'chest',label:'Half chest',cm:54,toleranceCm:1}]},
  pomTargets:{},grading:{baseSize:'M',sizes:['M']}}
const custom='custom-techpack-excel-test'
test('techpack POM data stays source linked after authored revision, and is exported as editable XLSX',()=>{
 const original=structuredClone(source),table=createBoundTechPackTable('measurement-table',source)
 const sizeCol=table.columns.find(c=>c.label==='M (cm)')
 assert(sizeCol)
 const edited=editCell(table,'chest',sizeCol.id,'54.5')
 assert.equal(edited.rows[0].cells[sizeCol.id].origin,'authored')
 assert.equal(edited.rows[0].cells[sizeCol.id].underlyingSourceValue,54)
 assert.deepEqual(source,original)
 const xlsx=exportTechPackXlsx([edited])
 const imported=importTechPackXlsx(xlsx)
 assert(imported[0].headers.some(h=>h==='M (cm)'))
 assert.equal(imported[0].rows[0].cells[2],'54.5')
 assert(imported[0].needsReview)
 const refreshed=refreshBoundTechPackTable(edited,{...source,revision:14})
 assert.equal(refreshed.rows[0].cells[sizeCol.id].input,'54.5')
 assert.equal(refreshed.rows[0].cells[sizeCol.id].reviewState,'needs-re-review')
})
test('printed custom artboard preserves all 24 positioned boxes and escaped spreadsheet contents',()=>{
 const table={id:'linked-pom',name:'POM',columns:[{id:'label',label:'POM'},{id:'m',label:'M / CM'}],
   rows:[{id:'chest',cells:{label:{input:'CHEST <CONTROL>',origin:'native'},m:{input:'54',origin:'native'}}}]}
 const boxes=Array.from({length:24},(_,i)=>({id:'box-'+String(i),title:'PAGE BOX '+i,
   x:i*2+20,y:i*3+10,width:125,height:125,positionMode:'absolute',slot:i===3?{category:'tables',spreadsheetTable:table}:undefined}))
 const workspace={customPages:[{id:custom,name:'Special table sheet'}],pageOrder:['overview',custom],
   pageBoxes:{[custom]:boxes}}
 const html=renderTechPackWorkspacePrintHTML(source,{},workspace)
 assert.equal((html.match(/class="custom-artboard-box"/g)||[]).length,24)
 assert.match(html,/left:26px;top:19px/)
 assert.match(html,/&lt;CONTROL&gt;/)
 assert.doesNotMatch(html,/<CONTROL>/)
 assert.match(html,/M \/ CM/)
})
