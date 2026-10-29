import test from 'node:test'
import assert from 'node:assert/strict'
import {techPackFactoryReadiness} from './techPackFactoryReadiness.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'
import {techPackSource} from './techPackWorkspaceModel.js'
import {createDefaultProject} from '../data/defaultProject.js'

const source={ready:true,revision:9,name:'Sample',panels:[],fabrics:[],pom:{}}
const printableSource={...techPackSource(createDefaultProject(),null,false),revision:9}

test('document pre-export review detects missing artwork, stale linked tables, source overrides and overflow',()=>{
  const workspace={pageAssets:{'custom-a':['missing']},pageBoxes:{'custom-a':[{id:'sizes',height:100,
    slot:{spreadsheetTable:{sourceRevision:8,columns:[{id:'measure',label:'Measure'}],rows:[
      {id:'r1',cells:{measure:{input:'52',origin:'authored',override:true,reviewState:'approved'}}},
      {id:'r2',cells:{measure:{input:'53',sourceRevision:8}}}]}}}]},
    customPages:[{id:'custom-a',name:'Custom'}]}
  const result=techPackFactoryReadiness(source,{},workspace,[])
  for(const prefix of ['asset-custom-a','stale-table-custom-a','table-cells-custom-a','table-overflow-custom-a']){
    assert.ok(result.review.some(item=>item.id.startsWith(prefix)),prefix)
  }
  assert.equal(result.ready,false)
  const html=renderTechPackWorkspacePrintHTML(printableSource,{},workspace)
  assert.match(html,/DOCUMENT PRE-EXPORT REVIEW/)
  assert.match(html,/Refresh source-linked spreadsheet data before export/)
  assert.match(html,/NOT FACTORY APPROVED/)
})

test('current embedded image and source table avoid false stale-asset or table warnings',()=>{
  const workspace={pageAssets:{'custom-a':['logo']},pageBoxes:{'custom-a':[{id:'t',height:200,
    slot:{spreadsheetTable:{sourceRevision:9,columns:[{id:'c'}],rows:[{cells:{c:{value:'42',sourceRevision:9}}}]}}}]}}
  const issues=techPackFactoryReadiness(source,{},workspace,[{id:'logo',dataUrl:'data:image/png;base64,AAAA',sourceRevision:9}]).review
  assert.ok(!issues.some(item=>/asset-custom-a|stale-table-custom-a|table-cells-custom-a|table-overflow-custom-a/.test(item.id)))
})
