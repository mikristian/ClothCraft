import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

const bridge='http://127.0.0.1:5385'
for(const templateId of ['pants','hoodie']){
  const {document,report}=prepareNativePatternExport(createTemplateProject(templateId))
  assert.equal(report.removedSeams,0)
  const response=await fetch(`${bridge}/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document})})
  const result=await response.json()
  assert.equal(response.status,200,`${templateId}: ${result.error}`)
  assert.equal(result.ok,true)
  assert.equal(result.template.panels.length,document.pieces.length)
  assert.equal(result.template.seams.length,document.seams.length)
  const get=id=>result.template.panels.find(panel=>panel.id===id)
  if(templateId==='pants'){
    assert.ok(get('pants-left-front').placement.translation[0]<get('pants-right-front').placement.translation[0])
    assert.ok(get('pants-left-front').placement.translation[2]>0)
    assert.ok(get('pants-left-back').placement.translation[2]<0)
    assert.equal(get('pants-left-back').placement.rotation_degrees[1],180)
  }
  if(templateId==='hoodie'){
    assert.notEqual(get('sleeve-left').placement.rotation_degrees[2],0)
    assert.equal(get('back').placement.rotation_degrees[1],180)
  }
  console.log(`PASS installed V2 Rust bridge ${templateId}: ${result.template.panels.length} panels, ${result.template.seams.length} seams and anatomical placement`)
}
console.log('PASS installed native export; no current workspace was opened or replaced')
