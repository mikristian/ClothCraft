import test from 'node:test'
import assert from 'node:assert/strict'
import {TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {captureTechPackDocumentTemplate,applyTechPackDocumentTemplate,resolveTechPackPages,rebindTechPackTemplateTable,restyleTechPackPage}from'./techPackPageComposer.js'
import {saveTechPackUserPreset,loadTechPackUserPresets,deleteTechPackUserPreset}from'./techPackTemplatePresets.js'
const original={
  pageOrder:['overview','custom-photorefs','patterns'],
  customPages:[{id:'custom-photorefs',name:'Photo references'}],
  pages:{overview:{orientation:'landscape',notes:'Private cloth notes',templateTheme:'oxblood'},'custom-photorefs':{orientation:'landscape',title:'Photo refs'}},
  pageBoxes:{'custom-photorefs':[
    {id:'photo-1',title:'Ref',assetId:'fabric-photo-1',note:'Approved by neither factory nor mill',x:42,y:62,width:230,height:190,positionMode:'absolute'},
    {id:'table-1',title:'POM widget',x:300,y:80,width:400,height:225,positionMode:'absolute',
      slot:{category:'tables',sourceLinked:true,spreadsheetTable:{kind:'measurement-table',sourceLinked:true,columns:[{id:'label',label:'POM'},{id:'m',label:'M (cm)'}],
        rows:[{id:'chest',sourceRef:'measurement-table:chest',cells:{label:{input:'Chest width',value:'Chest width',origin:'native',sourceRef:'measurement-table:chest',sourceRevision:8},m:{input:52,value:52,origin:'native',sourceRef:'measurement-table:chest',sourceRevision:8}}}]}}}
  ]},
  boardObjects:{'custom-photorefs':{'box-photo-1':{x:7,y:16,scaleX:1.3},'box-table-1':{x:0,y:0,scaleX:1},'asset-fabric-photo-1':{x:5,y:9}}},
  pageAssets:{'custom-photorefs':['fabric-photo-1']},
  cells:{measurements:{chest:{2:'PRIVATE_MEASUREMENT_52'}}},
  factorySampleReview:{approved:true,reviewer:'Private Reviewer'}
}
test('whole Techpack snapshot excludes source POM and factory approvals, but retains the sheet structure',()=>{
 const preset=captureTechPackDocumentTemplate(original,TECHPACK_PAGES,'My system')
 assert.equal(preset.kind,'pack-layout')
 assert.equal(preset.contentMode,'schema')
 assert(!JSON.stringify(preset).includes('PRIVATE_MEASUREMENT'))
 assert(!JSON.stringify(preset).includes('Private Reviewer'))
 assert(!JSON.stringify(preset).includes('Chest width'))
 assert(!JSON.stringify(preset).includes('Approved by neither'))
 assert(preset.pages.some(p=>p.sourcePageId==='custom-photorefs'))
 const custom=preset.pages.find(p=>p.sourcePageId==='custom-photorefs')
 assert.deepEqual(custom.layout.pageSnapshot.boxes.map(box=>box.x),[42,300])
 assert.equal(custom.layout.pageSnapshot.boxes[1].slot.spreadsheetTable.columns[1].label,'M (cm)')
})
test('applying whole design creates a new custom artboard and never overwrites garment measurements',()=>{
 const preset=captureTechPackDocumentTemplate(original,TECHPACK_PAGES,'Production system')
 let n=0
 const current={pages:{overview:{notes:'Destination Notes'}},cells:{measurements:{chest:{2:'NEW GARMENT VALUE'}}},customPages:[]}
 const result=applyTechPackDocumentTemplate(current,preset,TECHPACK_PAGES,()=>String(++n),['fabric-photo-1'])
 const pages=resolveTechPackPages(result,TECHPACK_PAGES)
 const newPage=pages.find(p=>p.id.startsWith('custom-'))
 assert(newPage)
 assert.equal(result.pages.overview.orientation,'landscape')
 assert.deepEqual(result.cells,current.cells)
 assert.equal(result.pageBoxes[newPage.id].length,2)
 assert.equal(result.pageBoxes[newPage.id][0].assetId,'fabric-photo-1')
 assert.equal(result.pageBoxes[newPage.id][1].slot.spreadsheetTable.rows[0].cells.m.input,'')
 assert.equal(result.factorySampleReview,undefined)
})
test('authored-content template preserves typed authored values but strips native sources',()=>{
 const saved=captureTechPackDocumentTemplate(original,TECHPACK_PAGES,'Authored',{includeContent:true})
 const serialized=JSON.stringify(saved)
 assert(!serialized.includes('PRIVATE_MEASUREMENT'))
 assert(!serialized.includes('Chest width'))
 assert(!serialized.includes('sourceRevision":8'))
 assert(serialized.includes('Approved by neither'))
})
test('saved complete preset survives library serialization without changing source snapshot',()=>{
 const old=globalThis.localStorage,items=new Map()
 globalThis.localStorage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)}
 try{
   const pack=captureTechPackDocumentTemplate(original,TECHPACK_PAGES,'Seville workshop')
   const saved=saveTechPackUserPreset(pack)
   assert.equal(saved.length,1)
   assert.equal(loadTechPackUserPresets()[0].kind,'pack-layout')
   assert(loadTechPackUserPresets()[0].pages.some(p=>p.sourcePageId==='custom-photorefs'))
   assert.equal(deleteTechPackUserPreset(saved[0].id).length,0)
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old}
})
test('existing page can restyle without touching any artboard object or source data',()=>{
 const changed=restyleTechPackPage(original,'custom-photorefs',{orientation:'portrait',templateTheme:'forest'})
 assert.equal(changed.pages['custom-photorefs'].orientation,'portrait')
 assert.deepEqual(changed.pageBoxes,original.pageBoxes)
 assert.deepEqual(changed.cells,original.cells)
 assert.deepEqual(changed.boardObjects,original.boardObjects)
})
test('opt-in branded photo persists safely across a new garment without using source asset IDs',()=>{
 const photo='data:image/png;base64,'+'ZmFrZWltYWdl'.repeat(15)
 const input={...original,pageBoxes:{'custom-photorefs':[...original.pageBoxes['custom-photorefs']]}}
 const snapshot=captureTechPackDocumentTemplate(input,TECHPACK_PAGES,'My branding',{
  includeContent:true,assets:[{id:'fabric-photo-1',_source:'assets',name:'Brand photo',caption:'Campaign',category:'graphic',dataUrl:photo},
   {id:'private-native',_source:'native',name:'Native ref',dataUrl:photo}]})
 assert.equal(snapshot.imageAssets.length,1)
 assert.equal(snapshot.imageAssets[0].id,'fabric-photo-1')
 const originalTarget={assets:[],cells:{measurements:{chest:{2:'TARGET_SOURCE_60'}}}}
 let n=0
 const result=applyTechPackDocumentTemplate(originalTarget,snapshot,TECHPACK_PAGES,()=>String(++n),[])
 const page=result.customPages[0].id
 const newAsset=result.assets[0]
 assert(newAsset.id.startsWith('template-asset-'))
 assert.notEqual(newAsset.id,'fabric-photo-1')
 assert.equal(newAsset.dataUrl,photo)
 assert.equal(result.pageBoxes[page][0].assetId,newAsset.id)
 assert.deepEqual(result.pageAssets[page],[newAsset.id])
 assert.deepEqual(result.cells,originalTarget.cells)
 assert(!JSON.stringify(result).includes('private-native'))
})
