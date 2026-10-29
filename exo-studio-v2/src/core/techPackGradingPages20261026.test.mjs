import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {techPackPageTable,techPackSource,TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

test('grading sheet follows source sizes and computes adjacent grade deltas without inventing an unrecorded size',()=>{
  const source={kind:'native',panels:[],seams:[],fabrics:[],graphics:[],grading:{baseSize:'M',sizes:['S','M','L']},pom:{
    S:[{id:'chest',label:'Chest',cm:50,toleranceCm:.5}],
    M:[{id:'chest',label:'Chest',cm:52,toleranceCm:.5}],
    L:[{id:'chest',label:'Chest',cm:55,toleranceCm:.5}],
  }}
  const table=techPackPageTable('grading',source)
  assert.deepEqual(table.headers,['POINT OF MEASURE','BASE SIZE','S / CM','M / CM','L / CM','GRADE STEP / CM','TOLERANCE / CM'])
  assert.deepEqual(table.rows[0].cells,['Chest','M','50','52','55','S→M 2.00 / M→L 3.00','0.5'])
  assert.equal(TECHPACK_PAGES.find(p=>p.id==='grading')?.tag,String(TECHPACK_PAGES.findIndex(p=>p.id==='grading')+1).padStart(2,'0'))
})

test('graphics specification only carries explicit dimensions and placement from source graphics',()=>{
  const source={graphics:[{id:'logo',name:'Chest logo',widthMm:74,heightMm:49,panelId:'front',placement:'left chest'}]}
  const table=techPackPageTable('artwork',source)
  assert.deepEqual(table.rows[0].cells,['Chest logo','front','74','49','left chest',''])
  assert.equal(techPackPageTable('artwork',{graphics:[{id:'unknown'}]}).rows[0].cells[2],'')
})

test('Seville printable headers mirror author edits across all factory sheets',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const output=renderTechPackWorkspacePrintHTML(source,{}, {headerFields:{sku:'MKR-123',fabric:'Cotton 400 GSM'},pages:{grading:{title:'Grading rules'}}})
  assert.equal((output.match(/MKR-123/g)||[]).length,TECHPACK_PAGES.length)
  assert.equal((output.match(/Cotton 400 GSM/g)||[]).length,TECHPACK_PAGES.length)
  assert.match(output,/Grading rules/)
  assert.equal((output.match(/class="sheet seville /g)||[]).length,TECHPACK_PAGES.length)
})
