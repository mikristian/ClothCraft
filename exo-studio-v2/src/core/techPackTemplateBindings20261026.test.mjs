import test from 'node:test'
import assert from 'node:assert/strict'
import {captureTechPackPageLayout,applyTechPackCapturedLayout,rebindTechPackTemplateTable} from './techPackPageComposer.js'
import {saveTechPackUserPreset,loadTechPackUserPresets} from './techPackTemplatePresets.js'

test('blank and authored templates retain artboard positions and table formats without native measurements',()=>{
  const page='custom-source'
  const table={id:'source-poms',kind:'measurements',sourceLinked:true,tableTheme:{header:'#112233'},columns:[{id:'point',label:'POINT',width:212},{id:'medium',label:'M',width:83}],rows:[{id:'front',cells:{point:{origin:'native',sourceRef:'pom:front',input:'Across chest'},medium:{origin:'native',sourceRef:'pom:front',input:53.5}}}]}
  const workspace={pages:{[page]:{orientation:'landscape',templateTheme:'forest'}},pageBoxes:{[page]:[{id:'b1',x:40,y:60,width:320,height:220,slot:{spreadsheetTable:table}}]},boardObjects:{[page]:{'box-b1':{x:9,y:10,scaleX:1.5,scaleY:1.2}}}}
  const blank=captureTechPackPageLayout(workspace,page,'Reusable blank')
  const authored=captureTechPackPageLayout(workspace,page,'Reusable authored',{includeContent:true})
  for(const preset of [blank,authored]){
    assert(!JSON.stringify(preset).includes('53.5'))
    const applied=applyTechPackCapturedLayout({},'custom-new',preset,()=> 'unique')
    assert.equal(applied.pageBoxes['custom-new'][0].slot.spreadsheetTable.columns[0].width,212)
    assert.deepEqual(applied.pageBoxes['custom-new'][0].slot.spreadsheetTable.tableTheme,{header:'#112233'})
    assert.equal(applied.boardObjects['custom-new']['box-box-unique'].scaleX,1.5)
  }
})

test('new garment data refreshes values within saved themed cells and preserves authored content only when opted in',()=>{
  const design={kind:'measurement',tableTheme:{header:'#123456'},columns:[{id:'size',label:'SIZE',width:200},{id:'measurement',label:'CM',width:78},{id:'note',label:'NOTE',width:250}],rows:[{id:'old',cells:{size:{origin:'native',sourceRef:'pom:chest',input:''},measurement:{origin:'native',sourceRef:'pom:chest',input:''},note:{origin:'authored',input:'Inspect ribbing'}}}]}
  const live={sourceRevision:7,columns:[{id:'measurement',label:'CM'},{id:'size',label:'SIZE'}],rows:[{id:'new',cells:{size:{origin:'native',sourceRef:'pom:chest',input:'Chest'},measurement:{origin:'native',sourceRef:'pom:chest',input:61}}}]}
  const bound=rebindTechPackTemplateTable(design,live,{includeAuthored:true})
  assert.equal(bound.rows[0].cells.measurement.input,61)
  assert.equal(bound.rows[0].cells.note.input,'Inspect ribbing')
  assert.equal(bound.columns[0].width,200)
  assert.deepEqual(bound.tableTheme,design.tableTheme)
  assert.equal(bound.sourceRevision,7)
  assert.equal(rebindTechPackTemplateTable(design,live).rows[0].cells.note.input,'')
})

test('saved blank template survives preset storage roundtrip',()=>{
  const old=globalThis.localStorage,storage=new Map()
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}
  try{
    const preset=captureTechPackPageLayout({pageBoxes:{p:[{id:'b',slot:{headers:['Material'],rows:[{cells:['secret authored value']}]}}]}},'p','Reusable')
    saveTechPackUserPreset(preset)
    const loaded=loadTechPackUserPresets()[0]
    assert.equal(loaded.contentMode,'schema')
    assert.equal(loaded.pageSnapshot.boxes[0].slot.rows[0].cells[0],'')
  }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old}
})
