import test from 'node:test'
import assert from 'node:assert/strict'
import {captureTechPackPageLayout,applyTechPackCapturedLayout} from './techPackPageComposer.js'
const page='custom-personal-layout'
const sourceSensitive={id:'source-measure',kind:'measurement-table',sourceLinked:true,sourceRevision:102,
 columns:[{id:'size',label:'Size M',type:'number',width:155}],
 tableStyle:{theme:'dark',header:'#112233',stripe:'#445566'},
 cellStyles:{'0:0':{bold:true,color:'#778899'}},
 rows:[{id:'source-row',cells:{size:{
  input:54.5,value:54.5,origin:'native',sourceRef:'source-chest-102',
  underlyingSourceValue:58.75,underlyingSourceRevision:102,
  display:'TARGET 54.5',provenance:{kind:'source',sourceRef:'secret-native-ref',originalValue:999.2}}}}]}
const templateWorkspace={pageBoxes:{[page]:[{id:'box1',title:'WORKSHEET',x:18,y:24,width:320,height:340,
 slot:{category:'tables',sourceLinked:true,spreadsheetTable:sourceSensitive}}]},
 cells:{measurements:{secret:'DO NOT COPY'}}}
test('saving authored Techpack template never retains native source values, metadata or overrides',()=>{
 const preset=captureTechPackPageLayout(templateWorkspace,page,'Sample sheet',{includeContent:true})
 const saved=JSON.stringify(preset)
 for(const forbidden of ['54.5','58.75','999.2','source-chest-102','secret-native-ref','TARGET 54.5','DO NOT COPY'])assert(!saved.includes(forbidden),forbidden)
 const table=preset.pageSnapshot.boxes[0].slot.spreadsheetTable
 assert.equal(table.rows[0].cells.size.input,'')
 assert.equal(table.tableStyle.theme,'dark')
 assert.equal(table.cellStyles['0:0'].bold,true)
 let seq=0
 const cloned=applyTechPackCapturedLayout({},'custom-new-layout',preset,()=>String(++seq))
 assert.equal(cloned.pageBoxes['custom-new-layout'][0].slot.spreadsheetTable.tableStyle.theme,'dark')
 assert.equal(cloned.pageBoxes['custom-new-layout'][0].slot.spreadsheetTable.columns[0].width,155)
})
