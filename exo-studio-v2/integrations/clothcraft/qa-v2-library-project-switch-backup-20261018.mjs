import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {fileURLToPath} from 'node:url'
import {createWorkspace} from './workspace.mjs'
import {createTemplateProject} from '../../src/data/templates.js'
import {prepareNativePatternExport} from '../../src/core/nativePatternExportPreparation.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
process.env.EXO_NATIVE_CLI=path.join(root,'native_cpp/build-placement-qa/garment_cad_cli')
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'exo-library-switch-qa-'))
const workspace=createWorkspace(scratch)
try{
  const initial=await workspace.request({op:'open',preset:'tshirt'})
  assert.equal(initial.ok,true,initial.error)
  const original=JSON.parse(fs.readFileSync(path.join(scratch,'workspace/fitting-project.json'),'utf8'))
  assert.equal(original.template.panels.length,initial.data.template.panels.length)
  const prepared=prepareNativePatternExport(createTemplateProject('pants'))
  const switched=await workspace.request({op:'open',document:prepared.document})
  assert.equal(switched.ok,true,switched.error)
  assert.equal(switched.data.template.panels.length,4)
  assert.equal(switched.data.template.seams.length,10)
  assert.ok(switched.data.previousProjectBackup)
  const backup=path.resolve(switched.data.previousProjectBackup)
  assert.ok(backup.startsWith(path.join(scratch,'workspace/backups')+path.sep))
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(backup,'fitting-project.json'),'utf8')),original)
  assert.ok(fs.statSync(path.join(backup,'fitting-project.json.native')).size>0)
  assert.ok(fs.statSync(path.join(backup,'fitting-project.json.properties.json')).size>0)
  const active=JSON.parse(fs.readFileSync(path.join(scratch,'workspace/fitting-project.json'),'utf8'))
  assert.equal(active.template.panels.length,4)
  assert.equal(active.template.seams.length,10)
  const snapshot=await workspace.request({op:'snapshot'})
  assert.equal(snapshot.ok,true,snapshot.error)
  assert.equal(snapshot.data.template.name,active.template.name)
  console.log(JSON.stringify({passed:true,oldPanels:original.template.panels.length,newPanels:active.template.panels.length,newSeams:active.template.seams.length,snapshotStored:true,backupNativeState:true,backupMetadata:true,sourceProjectProtected:true}))
}finally{
  workspace.close()
  fs.rmSync(scratch,{recursive:true,force:true})
}
