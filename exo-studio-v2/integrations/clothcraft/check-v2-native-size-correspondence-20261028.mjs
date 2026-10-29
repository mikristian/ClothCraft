// Executable Rust schema-v2 alias correspondence acceptance. The six authored
// XS–XXL sizes are unchanged; this does not satisfy independent G27 parity.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {planNativeGradeSizeCorrespondence20261028 as plan,
 verifyNativeGradeSizeCorrespondence20261028 as verify}
 from '../../src/core/nativeGradeSizeCorrespondence20261028.js'

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-grade-size-correspondence-'))
const workspace=createWorkspace(temporary)
let current
const request=async(op,extra={})=>{
 const response=await workspace.request({op,...(current?.revision!=null?{revision:current.revision}:{}),...extra})
 assert.equal(response.ok,true,`${op}: ${response.error||'Rust rejected request'}`)
 if(response.data?.template)current=response.data
 return response.data
}
const project=async()=>(await request('save')).project
const refresh=async()=>{current=await request('snapshot');return current}
try{
 await request('open',{preset:'tshirt'})
 const rules=createAccuMarkNativeRuleSet(current)
 assert(rules.ok,rules.reason)
 const initial=await project()
 const prepared=prepareNativeGradeCatalog20261025(current,initial,rules.ruleSet)
 assert(prepared.ok,prepared.reason)
 await request('grade-run-commit',{gradeRun:prepared.gradeRun})
 await refresh()
 const before=current
 const beforeProject=await project()
 const status=await request('grade-run-status')
 assert.equal(status.catalog.schemaVersion,1)
 const candidate=plan(before,status,{4:'S',6:'M',8:'L'})
 assert(candidate.ok,candidate.reason)
 const invalid=structuredClone(candidate.request.gradeRun)
 invalid.sizeCorrespondence.M='S' // Canonical label cannot also be an alias.
 const rejected=await workspace.request({op:'grade-run-commit',revision:before.revision,gradeRun:invalid})
 assert.equal(rejected.ok,false,'Rust accepted a canonical-size alias collision')
 assert.deepEqual(await project(),beforeProject,'Invalid correspondence changed the saved garment')
 const stale=await workspace.request({...candidate.request,revision:before.revision+1})
 assert.equal(stale.ok,false,'Rust accepted stale size-correspondence revision')
 assert.deepEqual(await project(),beforeProject,'Stale request changed the saved garment')
 await request('grade-run-commit',{gradeRun:candidate.request.gradeRun})
 await refresh()
 assert.equal(current.revision,before.revision+1)
 const persisted=await project()
 const nativeStatus=await request('grade-run-status')
 const witnessed=verify(before,candidate,nativeStatus,persisted)
 assert(witnessed.ok,witnessed.reason)
 assert.deepEqual(persisted.grade_run.gradedTemplates,beforeProject.grade_run.gradedTemplates)
 assert.deepEqual(persisted.template,beforeProject.template)
 // Rust must resolve an external alias to its authored canonical geometry.
 const activated=await request('grade-run-activate',{size:'6'})
 assert.equal(activated.activeGradedSize,'6')
 assert.deepEqual(activated.template,persisted.grade_run.gradedTemplates[2])
 await request('grade-run-restore')
 assert.equal(current.activeGradedSize,null)
 await request('undo')
 assert.equal((await project()).grade_run.schemaVersion,1)
 await request('redo')
 assert.deepEqual((await project()).grade_run,persisted.grade_run)
 await request('open',{project:persisted})
 assert.deepEqual((await project()).grade_run,persisted.grade_run)
 const reopenedStatus=await request('grade-run-status')
 assert.deepEqual(reopenedStatus.catalog.sizeCorrespondence,{4:'S',6:'M',8:'L'})
 console.log(JSON.stringify({passed:true,nativeRust:true,authoredSizes:6,aliases:3,
  exactGeometryPreserved:true,invalidAndStaleRejected:true,
  aliasActivated:true,undoRedoSaveReopen:true,revisionIncrement:1,
  arbitraryNamedSizeGeometry:false,externalReceivingCadAccepted:false,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(temporary,{recursive:true,force:true})
}
