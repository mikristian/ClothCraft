import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {createTemplateProject} from '../data/templates.js'
import {buildSewingAssemblyWorkflow20261024} from './sewingAssemblyWorkflow20261024.js'

test('corrected Foundation Tee has complete matching sewn relationships across all six graded sizes',()=>{
  const project=createTemplateProject('tee'),before=structuredClone(project)
  const report=buildSewingAssemblyWorkflow20261024(project)
  assert.equal(report.seamCount,14)
  assert.equal(report.steps.length,14)
  assert.deepEqual(report.checkedSizes,['XS','S','M','L','XL','XXL'])
  assert.equal(report.blockers,0,JSON.stringify(report.issues))
  assert.equal(report.assemblyReady,true)
  assert.equal(report.manufacturingApproved,false)
  assert.deepEqual(project,before)
})

test('old Essential Shell remains independently defective and is not silently migrated',()=>{
  const legacy=createDefaultProject()
  const reference=createTemplateProject('tee')
  const original=structuredClone(legacy)
  const audit=buildSewingAssemblyWorkflow20261024(legacy)
  assert.equal(audit.issues.filter(i=>i.code==='SEAM_LENGTH_MISMATCH').length,8)
  assert.equal(audit.issues.filter(i=>i.code==='GRADED_SEAM_MISMATCH').length,40)
  assert.equal(reference.productionSpec?.gradingModel,'seam-locked-affine-v1')
  assert.equal(legacy.productionSpec,undefined)
  assert.deepEqual(legacy,original)
})
