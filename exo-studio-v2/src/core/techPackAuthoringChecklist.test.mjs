import test from 'node:test'
import assert from 'node:assert/strict'
import {techPackAuthoringChecklist} from './techPackAuthoringChecklist.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const source={name:'Sample tee',kind:'native',revision:1,panels:[{id:'front'}],seams:[],
  fabrics:[{id:'main',name:'Cotton jersey',gsm:220,composition:'Cotton'}],
  pom:{M:[{id:'body',label:'Body length',cm:72,toleranceCm:0.5}]},grading:{baseSize:'M'}}
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII='

test('factory authoring checklist links each incomplete specification to its page',()=>{
  const result=techPackAuthoringChecklist(source,{}, {},[])
  assert.equal(result.total,9)
  assert(result.items.some(item=>item.id==='style'&&!item.done&&item.pageId==='overview'))
  assert(result.items.some(item=>item.id==='swatches'&&!item.done&&item.pageId==='fabrics'))
  assert(result.items.some(item=>item.id==='pom'&&item.done))
  assert(result.outstanding>0)
})

test('all recorded fields do not imply physical approval, and print shares same checklist',()=>{
  const draft={sku:'T-001',factory:'Sample Factory',labels:[{name:'Care label'}],packaging:[{name:'Fold bag'}]}
  const workspace={fabricSwatches:{main:'swatch'},annotations:{callouts:[{type:'arrow',component:'Neck',instruction:'Coverstitch 6mm'}]}}
  const assets=[{id:'swatch',dataUrl:image}]
  const report=techPackAuthoringChecklist(source,draft,workspace,assets)
  assert.equal(report.recorded,report.total)
  const html=renderTechPackWorkspacePrintHTML(source,draft,workspace,assets)
  assert.match(html,/PRE-PRODUCTION SPECIFICATION REVIEW · 9 \/ 9 RECORDED/)
  assert.match(html,/does not establish physical sample approval or factory sign-off/)
  assert.match(html,/PHYSICAL SAMPLE APPROVAL REQUIRED/)
  const poisoned=techPackAuthoringChecklist(source,draft,workspace,[{id:'swatch',dataUrl:'javascript:alert(1)'}])
  assert.equal(poisoned.items.find(item=>item.id==='swatches').done,false)
})

test('missing fabric tests, callout notes, or tolerance remain visible even with authored BOM values',()=>{
  const incomplete={...source,fabrics:[{id:'main',name:'Cotton jersey'}],pom:{M:[{id:'body',cm:72,toleranceCm:''}]}}
  const draft={bom:[{id:'main',gsm:250}]}
  const report=techPackAuthoringChecklist(incomplete,draft,{annotations:{callouts:[{type:'arrow',component:'Collar'}]}},[])
  assert.equal(report.items.find(item=>item.id==='fabric').done,false)
  assert.equal(report.items.find(item=>item.id==='pom').done,false)
  assert.equal(report.items.find(item=>item.id==='callouts').done,false)
})
