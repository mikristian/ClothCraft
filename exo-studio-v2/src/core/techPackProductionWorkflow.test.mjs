import test from 'node:test'
import assert from 'node:assert/strict'
import {addTechPackColorway,updateTechPackColorway,removeTechPackColorway} from './techPackColorways.js'
import {techPackFactoryReadiness} from './techPackFactoryReadiness.js'
import {createTechPackCheckpoint,appendTechPackCheckpoint,compareTechPackCheckpoints} from './techPackRevisionHistory.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const source={ready:true,kind:'native',name:'Sample hoodie',revision:1,
  panels:[{id:'front',name:'Front',fabricId:'fabric',quantity:1,allowance:10,grain:'vertical'}],
  fabrics:[{id:'fabric',name:'French terry',gsm:420,composition:''}],seams:[],graphics:[],
  pom:{M:[{id:'chest',label:'Chest',cm:58,toleranceCm:1}]}}
const baseDraft={styleName:'Sample hoodie',sku:'M-001',factory:'Sample factory',
  colorways:[],bom:[{id:'fabric',description:'French terry',gsm:420}],labels:[],packaging:[]}

test('colorway controls preserve multi-word input and immutability',()=>{
  const added=addTechPackColorway(baseDraft,{name:'Forest Green'})
  assert.equal(baseDraft.colorways.length,0)
  assert.equal(added.colorways[0].name,'Forest Green')
  const updated=updateTechPackColorway(added,added.colorways[0].id,{name:'Forest Green ',hex:'#235b40'})
  assert.equal(updated.colorways[0].name,'Forest Green ')
  assert.equal(added.colorways[0].hex,'')
  assert.equal(removeTechPackColorway(updated,updated.colorways[0].id).colorways.length,0)
})

test('factory readiness accepts documented fabric cell overrides and native triangle anchored notes',()=>{
  const marker={id:'D01',label:'D01',title:'Pocket topstitch',detail:'2 needle topstitch',verified:true,
    anchor:{source:'garment',triangleIndex:0,vertices:[0,1,2],weights:[.2,.3,.5]},panelId:'front'}
  const workspace={cells:{fabrics:{fabric:{2:'100% cotton'}}},interactiveMarkers:[marker],
    annotations:{callouts:[{id:'A1',type:'arrow',component:'Pocket',instruction:'Edge topstitch',verified:true}]},
    extraRows:{labels:[{id:'L1',cells:['Main label','Brand','Inside neck','Woven','1','Sew into binding']}],
      packaging:[{id:'P1',cells:['Bag','Recycled poly','Fold inside','Film','1','Seal and pack']} ]}}
  const draft={...baseDraft,colorways:[{id:'c1',name:'Forest',code:'Pantone',hex:'#235b40'}]}
  const review=techPackFactoryReadiness(source,draft,workspace)
  const ids=new Set(review.missing.map(i=>i.id))
  assert.equal(ids.has('fabric-spec'),false)
  assert.equal(ids.has('3d-notes'),false)
  assert.equal(ids.has('labels'),false)
  assert.equal(ids.has('packaging'),false)
  assert.equal(review.ready,false)
  assert.ok(review.review.some(item=>item.id==='sample-review'))
})

test('saved development revisions compare factual changes and limit history without images',()=>{
  const draft=addTechPackColorway(baseDraft,{name:'Black',code:'BLK'})
  const one=createTechPackCheckpoint(source,draft,{},'Sample one')
  const second=createTechPackCheckpoint(source,updateTechPackColorway(draft,draft.colorways[0].id,{name:'Forest'}),{},'Sample two')
  assert.ok(compareTechPackCheckpoints(one,second).some(item=>item.section==='Colorways'))
  const many=Array.from({length:25},(_,i)=>({...one,id:`revision-${i}`}))
  assert.equal(appendTechPackCheckpoint(many,second).length,20)
  assert.equal(JSON.stringify(one).includes('data:image'),false)
})

test('complete Techpack print preserves colorway and review information as draft',()=>{
  const draft=addTechPackColorway(baseDraft,{name:'Forest',code:'Mill green',hex:'#235b40',finish:'Garment washed'})
  const print=renderTechPackWorkspacePrintHTML(source,draft,{interactiveMarkers:[{id:'D01',title:'Pocket edge',detail:'2 needle topstitch'}]})
  assert.match(print,/COLORWAY VARIATIONS/)
  assert.match(print,/Garment washed/)
  assert.match(print,/FACTORY HANDOFF PREVIEW/)
  assert.match(print,/NOT FACTORY APPROVED/)
})
