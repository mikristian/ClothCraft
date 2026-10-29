import assert from 'node:assert/strict'
import {createTemplateProject,GARMENT_TEMPLATES} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

let failed=0
for(const {id} of GARMENT_TEMPLATES){
  const {document,report}=prepareNativePatternExport(createTemplateProject(id))
  assert.equal(report.removedSeams,0)
  const response=await fetch('http://127.0.0.1:5385/validate',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({document}),signal:AbortSignal.timeout(120000),
  })
  const result=await response.json()
  if(response.status!==200){
    console.error('FAIL installed Rust template validation',id,result.error||response.status)
    failed++
    continue
  }
  assert.equal(result.rustValidated,true)
  assert.equal(result.template.panels.length,document.pieces.length)
  assert.equal(result.template.seams.length,document.seams.length)
  console.log('PASS installed Rust template validation',id,result.rustValidation?.panels,'panels',result.rustValidation?.seams,'seams')
}
console.log(`${GARMENT_TEMPLATES.length-failed}/${GARMENT_TEMPLATES.length} installed Rust template validations passed`)
if(failed)process.exitCode=1
