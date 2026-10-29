import test from 'node:test'
import assert from 'node:assert/strict'
import {captureTechPackPageLayout,applyTechPackCapturedLayout,restyleTechPackPage,insertCustomTechPackPage,reconcileTechPackTemplateAssets,rebindTechPackTemplateTable} from './techPackPageComposer.js'
import {saveTechPackUserPreset,loadTechPackUserPresets} from './techPackTemplatePresets.js'
const page='custom-main-design'
const table={id:'table-chest',kind:'measurement-table',title:'MEASUREMENTS',columns:[{id:'ref',label:'POM',type:'text',width:135},{id:'m',label:'M (cm)',type:'number',width:80}],rows:[
 {id:'a',cells:{ref:{input:'Chest',value:'Chest',origin:'authored'},m:{input:60,value:60,origin:'authored'}}},
 {id:'b',cells:{ref:{input:'Native POM',value:'Native POM',origin:'native',sourceRef:'garment:POM2'},m:{input:52,value:52,origin:'native',sourceRef:'garment:POM2'}}}
],tableTheme:'excel-medium'}
const original={pages:{[page]:{orientation:'landscape',templateTheme:'forest'}},pageAssets:{[page]:['art-lamp']},pageFooterAssets:{[page]:'brand-logo'},
 pageBoxes:{[page]:[{id:'first',x:34,y:61,width:400,height:230,title:'Source grid',note:'Author-added note',assetId:'art-lamp',slot:{category:'tables',sourceLinked:true,spreadsheetTable:table}}]},
 boardObjects:{[page]:{'box-first':{x:15,y:22,scaleX:1.3,scaleY:1.1,zIndex:40},'footer-logo':{x:10,y:6,scaleX:1.1,scaleY:1}}},
 annotations:{[page]:[{id:'pen1',type:'arrow',label:'AUTHORED LEADER'}]},cells:{garment:{size:'REAL NATIVE DATA'}}}
const idMaker=()=>`new${++idMaker.i}`;idMaker.i=0

test('restyle uses different appearance but never resets original data, assets, bounding boxes or source',()=>{
 const layout=captureTechPackPageLayout(original,page,'Blue theme')
 const restyled=restyleTechPackPage(original,page,{pageSnapshot:{settings:{orientation:'portrait',templateTheme:'blueprint',headerPreset:'dark'}}})
 assert.equal(restyled.pages[page].templateTheme,'blueprint')
 assert.equal(restyled.pages[page].orientation,'portrait')
 assert.equal(restyled.pageBoxes,original.pageBoxes)
 assert.equal(restyled.boardObjects,original.boardObjects)
 assert.equal(restyled.pageFooterAssets,original.pageFooterAssets)
 assert.deepEqual(restyled.cells,original.cells)
 assert.equal(layout.contentMode,'schema')
})
test('saved templates can keep authored content but never copy native garment values',()=>{
 const preset=captureTechPackPageLayout(original,page,'Fashion design with content',{includeContent:true})
 assert.equal(preset.contentMode,'authored')
 assert.equal(preset.pageSnapshot.boxes[0].note,'Author-added note')
 assert.equal(preset.pageSnapshot.boxes[0].slot.spreadsheetTable.rows[0].cells.m.input,60)
 assert.equal(preset.pageSnapshot.boxes[0].slot.spreadsheetTable.rows[1].cells.m.input,'')
 assert.deepEqual(preset.pageSnapshot.pageAssets,['art-lamp'])
 assert.equal(preset.pageSnapshot.annotations[0].label,'AUTHORED LEADER')
 const clone=applyTechPackCapturedLayout({},'custom-other',preset,idMaker)
 assert.notEqual(clone.pageBoxes['custom-other'][0].id,'first')
 assert.equal(clone.pageBoxes['custom-other'][0].slot.spreadsheetTable.rows[0].cells.m.input,60)
 assert.equal(clone.pageBoxes['custom-other'][0].slot.spreadsheetTable.rows[1].cells.m.input,'')
 assert(clone.pageBoxes['custom-other'][0].slot.sourceLinked)
 assert.equal(clone.pageBoxes['custom-other'][0].assetId,'art-lamp')
 assert.equal(clone.annotations['custom-other'][0].label,'AUTHORED LEADER')
 const remapped='box-'+clone.pageBoxes['custom-other'][0].id
 assert.equal(clone.boardObjects['custom-other'][remapped].scaleX,1.3)
 assert.deepEqual(clone.cells,undefined)
})
test('applying a saved artboard drops unavailable image links but preserves valid visuals and document content',()=>{
 const preset=captureTechPackPageLayout(original,page,'Template references',{includeContent:true})
 const cloned=applyTechPackCapturedLayout({},'custom-next',preset,idMaker)
 const cleaned=reconcileTechPackTemplateAssets(cloned,'custom-next',[])
 assert.equal(cleaned.pageBoxes['custom-next'][0].assetId,null)
 assert.deepEqual(cleaned.pageAssets['custom-next'],[])
 assert.equal(cleaned.pageFooterAssets['custom-next'],null)
 assert.equal(cleaned.pageBoxes['custom-next'][0].note,'Author-added note')
 assert.deepEqual(cleaned.pageBoxes['custom-next'][0].slot.spreadsheetTable.rows[0].cells.m.input,60)
 const retained=reconcileTechPackTemplateAssets(cloned,'custom-next',['art-lamp','brand-logo'])
 assert.equal(retained.pageBoxes['custom-next'][0].assetId,'art-lamp')
 assert.deepEqual(retained.pageAssets['custom-next'],['art-lamp'])
 assert.equal(retained.pageFooterAssets['custom-next'],'brand-logo')
})
test('blank layout template copies structure but excludes notes, author values and source geometry',()=>{
 const preset=captureTechPackPageLayout(original,page,'Factory layout only')
 const text=JSON.stringify(preset)
 assert(!text.includes('Author-added note'))
 assert(!text.includes('Chest'))
 assert(!text.includes('REAL NATIVE DATA'))
 const output=applyTechPackCapturedLayout({},'custom-blank',preset,idMaker)
 assert.equal(output.pageBoxes['custom-blank'][0].slot.spreadsheetTable.rows[0].cells.m.input,'')
})
test('user preset persistence keeps intentional content mode and assets',()=>{
 const store=new Map()
 const previous=globalThis.localStorage
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
 try{
  saveTechPackUserPreset(captureTechPackPageLayout(original,page,'Factory content',{includeContent:true}))
  const loaded=loadTechPackUserPresets()
  assert.equal(loaded.length,1)
  assert.equal(loaded[0].contentMode,'authored')
  assert.equal(loaded[0].pageSnapshot.pageAssets[0],'art-lamp')
  assert.equal(loaded[0].pageSnapshot.boxes[0].note,'Author-added note')
 }finally{globalThis.localStorage=previous}
})

test('new page rekeys every editable object even with a repeated ID generator and deep-clones content',()=>{
 const preset=captureTechPackPageLayout({pageBoxes:{p:[{id:'a',slot:{spreadsheetTable:table}},{id:'b',slot:{spreadsheetTable:table}}]},
  tables:{p:[{id:'t',headers:['NOTE'],rows:[{id:'r',cells:['Keep copy']},{id:'s',cells:['Second']}]}]},
  annotations:{p:[{id:'a',label:'A'},{id:'b',label:'B'}]}},'p','Duplicate-safe',{includeContent:true})
 const output=applyTechPackCapturedLayout({},'other',preset,()=> 'constant')
 const boxes=output.pageBoxes.other
 assert.equal(new Set(boxes.map(b=>b.id)).size,2)
 assert.equal(new Set(boxes.map(b=>b.slot.spreadsheetTable.id)).size,2)
 assert.equal(new Set(boxes.flatMap(b=>b.slot.spreadsheetTable.rows.map(r=>r.id))).size,4)
 assert.equal(new Set(output.tables.other[0].rows.map(r=>r.id)).size,2)
 assert.equal(new Set(output.annotations.other.map(a=>a.id)).size,2)
 boxes[0].slot.spreadsheetTable.rows[0].cells.m.input=999
 assert.notEqual(preset.pageSnapshot.boxes[0].slot.spreadsheetTable.rows[0].cells.m.input,999)
})

test('asset cleanup retains transform keys for box images and footer assets available in destination',()=>{
 const workspace={pageBoxes:{p:[{id:'box-1',assetId:'photo'}]},pageAssets:{p:[]},pageFooterAssets:{p:'logo'},
   boardObjects:{p:{'asset-photo':{x:8},'asset-logo':{x:3},'asset-old':{x:99},'box-box-1':{x:4}}}}
 const output=reconcileTechPackTemplateAssets(workspace,'p',['photo','logo'])
 assert.equal(output.boardObjects.p['asset-photo'].x,8)
 assert.equal(output.boardObjects.p['asset-logo'].x,3)
 assert.equal(output.boardObjects.p['asset-old'],undefined)
 assert.equal(output.boardObjects.p['box-box-1'].x,4)
})

test('source rows bind only to matching source identity and never fall back to an unrelated reused row ID',()=>{
 const saved={sourceLinked:true,columns:[{id:'value',label:'VALUE'}],rows:[{id:'old',sourceRowRef:'pom:chest',sourceRowId:'shared',cells:{value:{input:'',origin:'authored'}}}]}
 const live={columns:[{id:'value',label:'VALUE'}],rows:[{id:'shared',sourceRef:'pom:waist',cells:{value:{input:88,origin:'native'}}}]}
 const rebound=rebindTechPackTemplateTable(saved,live)
 assert.equal(rebound.rows[0].cells.value.input,'')
 assert.equal(rebound.rows[0].cells.value.reviewState,'needs-review')
})

test('source-linked identity is saved even when the link is declared on spreadsheet rather than slot',()=>{
 const workspace={pageBoxes:{p:[{id:'spreadsheet',slot:{spreadsheetTable:{sourceLinked:true,columns:[{id:'cm',label:'CM'}],rows:[{id:'chest',sourceRef:'pom:chest',cells:{cm:{input:55,origin:'native'}}}]}}}]}}
 const snapshot=captureTechPackPageLayout(workspace,'p','Linked')
 const slot=snapshot.pageSnapshot.boxes[0].slot
 assert.equal(slot.sourceLinked,true)
 assert.equal(slot.spreadsheetTable.rows[0].sourceRowRef,'pom:chest')
 assert.equal(slot.spreadsheetTable.rows[0].cells.cm.input,'')
})
