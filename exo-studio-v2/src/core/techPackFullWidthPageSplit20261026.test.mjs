import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {techPackPageTable,techPackSource,TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

test('Letter pack separates drawings, measurements, construction and review instead of crowding one sheet',()=>{
  const ids=TECHPACK_PAGES.map(p=>p.id)
  assert.equal(new Set(ids).size,ids.length)
  for(const name of ['authoring-checklist','factory-review','measurements','measurement-table','construction','construction-operations'])assert(ids.includes(name))
  assert.deepEqual(TECHPACK_PAGES.map(p=>p.tag),TECHPACK_PAGES.map((_,i)=>String(i+1).padStart(2,'0')))
  const source=techPackSource(createDefaultProject(),null,false)
  assert.deepEqual(techPackPageTable('measurements',source).rows,techPackPageTable('measurement-table',source).rows)
  assert.deepEqual(techPackPageTable('construction',source).rows,techPackPageTable('construction-operations',source).rows)
  const html=renderTechPackWorkspacePrintHTML(source,{sku:'MKR-765'}, {cells:{measurements:{}}})
  const sheets=html.split('<section class="sheet seville ').slice(1)
  assert.equal(sheets.length,TECHPACK_PAGES.length)
  const sheet=id=>sheets[ids.indexOf(id)]
  assert.match(sheet('authoring-checklist'),/PRE-PRODUCTION SPECIFICATION REVIEW/)
  assert.doesNotMatch(sheet('overview'),/PRE-PRODUCTION SPECIFICATION REVIEW/)
  assert.match(sheet('factory-review'),/FACTORY HANDOFF PREVIEW/)
  assert.doesNotMatch(sheet('overview'),/FACTORY HANDOFF PREVIEW/)
  assert.match(sheet('measurement-table'),/POINT OF MEASURE/)
  assert.doesNotMatch(sheet('measurements'),/<th>POINT OF MEASURE<\/th>/)
  assert.match(sheet('construction-operations'),/FACTORY INSTRUCTION/)
  assert.doesNotMatch(sheet('construction'),/<th>FACTORY INSTRUCTION<\/th>/)
})
