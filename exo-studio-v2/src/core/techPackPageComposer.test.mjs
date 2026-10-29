import test from 'node:test'
import assert from 'node:assert/strict'
import {TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import{resolveTechPackPages,insertCustomTechPackPage,reorderTechPackPage,shiftTechPackPage,
  removeCustomTechPackPage,captureTechPackPageLayout,applyTechPackCapturedLayout}from './techPackPageComposer.js'

test('new page after current, move page, keep source and IDs stable',()=>{
  const before={cells:{measurements:{'chest':{1:'62cm'}}},pages:{}}
  let current=insertCustomTechPackPage(before,'custom-tee-layout','patterns','My pattern detail',TECHPACK_PAGES)
  let pages=resolveTechPackPages(current,TECHPACK_PAGES)
  assert.equal(pages[pages.findIndex(p=>p.id==='patterns')+1].id,'custom-tee-layout')
  current=shiftTechPackPage(current,'custom-tee-layout',1,TECHPACK_PAGES)
  pages=resolveTechPackPages(current,TECHPACK_PAGES)
  assert.equal(pages[pages.findIndex(p=>p.id==='patterns')+2].id,'custom-tee-layout')
  current=reorderTechPackPage(current,'custom-tee-layout','fabrics',TECHPACK_PAGES)
  pages=resolveTechPackPages(current,TECHPACK_PAGES)
  assert.equal(pages[pages.findIndex(p=>p.id==='fabrics')-1].id,'custom-tee-layout')
  assert.deepEqual(current.cells,before.cells)
  current=removeCustomTechPackPage(current,'custom-tee-layout')
  assert(!resolveTechPackPages(current,TECHPACK_PAGES).some(p=>p.id==='custom-tee-layout'))
  assert.deepEqual(current.cells,before.cells)
})
test('template saves only layout, transforms and blank-table schema, preserving POM content',()=>{
  const before={pages:{patterns:{layoutPreset:'illustration',orientation:'landscape',title:'Original'}},
    cells:{patterns:{secret:{0:'PRIVATE CUTTING NOTES'}}},
    boardObjects:{patterns:{'footer-logo':{x:11,y:8,scaleX:1.1,scaleY:1}}},
    pageBoxes:{patterns:[{id:'first',title:'DETAIL BOX',width:220,height:140,note:'DO NOT COPY'}]},
    tables:{patterns:[{id:'table-1',title:'POM',headers:['POM','CM'],rows:[{id:'r1',cells:['Chest','62']}]}]}}
  const saved=captureTechPackPageLayout(before,'patterns','My techpack layout')
  assert.equal(saved.kind,'page-layout')
  assert(!JSON.stringify(saved).includes('DO NOT COPY'))
  assert(!JSON.stringify(saved).includes('PRIVATE CUTTING NOTES'))
  assert(!JSON.stringify(saved).includes('Chest'))
  assert.equal(saved.pageSnapshot.settings.orientation,'landscape')
  assert.deepEqual(saved.pageSnapshot.tables[0].rows[0].cells,['',''])
  let counter=0
  const applied=applyTechPackCapturedLayout(before,'custom-new',saved,()=>String(++counter))
  assert.equal(applied.pages['custom-new'].layoutPreset,'illustration')
  assert.equal(applied.boardObjects['custom-new']['footer-logo'].x,11)
  assert.equal(applied.tables['custom-new'][0].rows[0].cells[0],'')
  assert.equal(applied.pageBoxes['custom-new'][0].note,'')
  assert.deepEqual(before.cells,applied.cells)
  assert.notEqual(applied.pageBoxes['custom-new'][0].id,'first')
})

test('custom box layout templates preserve artboard positions and reusable table structure but not authored values',()=>{
  const workspace={pages:{'custom-abc':{orientation:'landscape'}},pageBoxes:{'custom-abc':[{id:'box-1',title:'WOVEN LABEL',
    x:87,y:115,width:270,height:180,positionMode:'absolute',note:'Private factory comments',
    slot:{id:'measurement-matrix',category:'tables',headers:['POM','SPEC'],rows:[{id:'r1',cells:['Chest','58']}],title:'Spec matrix'}}]}}
  const preset=captureTechPackPageLayout(workspace,'custom-abc','My custom layout')
  const box=preset.pageSnapshot.boxes[0]
  assert.equal(box.x,87);assert.equal(box.y,115)
  assert.equal(box.positionMode,'absolute')
  assert.deepEqual(box.slot.rows[0].cells,['',''])
  assert(!JSON.stringify(preset).includes('Private factory comments'))
  assert(!JSON.stringify(preset).includes('Chest'))
  const result=applyTechPackCapturedLayout({},'custom-other',preset,()=>Math.random().toString(36).slice(2))
  assert.equal(result.pageBoxes['custom-other'][0].x,87)
  assert.equal(result.pageBoxes['custom-other'][0].slot.category,'tables')
})
