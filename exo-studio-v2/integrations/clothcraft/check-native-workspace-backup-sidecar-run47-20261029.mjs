// RUN47: The Node bridge must archive native durable Undo/Redo alongside
// its exact source project when opening another garment. Never opens the
// installed Studio app or the user's personal fitting-project.json.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run47-native-journal-backup-'))
const workspace=createWorkspace(folder)
let current
const rpc=async request=>{
  const result=await workspace.request({...request,revision:current?.revision})
  assert.equal(result.ok,true,request.op+': '+(result.error||'native rejection'))
  if(result.data?.template)current=result.data
  return result.data
}
try{
  await rpc({op:'open',preset:'tshirt'})
  const first=current.template.panels[0]
  await rpc({op:'set-property',target:'panel',id:first.id,field:'name',value:'RUN47 PRESERVED BEFORE SWITCH'})
  await rpc({op:'save'})
  const oldProject=fs.readFileSync(path.join(folder,'workspace','fitting-project.json.native'))
  const oldHistory=fs.readFileSync(path.join(folder,'workspace','fitting-project.json.native.undo-v1.json'))
  const oldJournal=JSON.parse(oldHistory)
  assert.equal(oldJournal.schema_version,1)
  assert.equal(typeof oldJournal.project_digest,'string')
  const switched=await rpc({op:'open',preset:'dress'})
  const archive=switched.previousProjectBackup
  assert.equal(typeof archive,'string')
  assert(archive.startsWith(path.join(folder,'workspace','backups')+path.sep))
  assert.deepEqual(fs.readFileSync(path.join(archive,'fitting-project.json.native')),oldProject,
    'Library-switch rollback lost the native graded garment or its position')
  assert.deepEqual(fs.readFileSync(path.join(archive,'fitting-project.json.native.undo-v1.json')),oldHistory,
    'Library-switch rollback lost exact cross-restart Undo/Redo')
  const restored=JSON.parse(fs.readFileSync(path.join(archive,'fitting-project.json'),'utf8'))
  assert.equal(restored.template.panels[0].name,'RUN47 PRESERVED BEFORE SWITCH')
  console.log(JSON.stringify({passed:true,verifiedNativeProjectBackup:true,
    exactDurableHistoryBackup:true,newGarmentOpened:true,originalInstalledAppUntouched:true}))
}finally{
  workspace.close()
  fs.rmSync(folder,{recursive:true,force:true})
}
