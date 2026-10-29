// RUN39 - opt-in acceptance for the freshly rebuilt Rust exo-session binary.
// This MUST fail against an old binary that still has detached hardware stacks.
// Disposes its own temporary workspace; never opens an installed user project.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-chronological-hardware-run39-'))
const workspace=createWorkspace(root)
let state,stage='open'
const send=async packet=>{
  const result=await workspace.request({revision:state?.revision,...packet})
  assert.equal(result.ok,true,stage+': '+(result.error||packet.op))
  if(result.data?.template)state=result.data
  return result.data
}
const reject=async(packet,reason)=>{
  const prior=(await send({op:'save'})).project,revision=state.revision
  const result=await workspace.request({revision,...packet})
  assert.equal(result.ok,false,reason+': must reject')
  await send({op:'snapshot'})
  assert.equal(state.revision,revision,reason+': revision changed')
  assert.deepEqual((await send({op:'save'})).project,prior,reason+': saved document mutated')
}
try{
  state=await send({op:'open',preset:'tshirt'})
  const panel=state.template.panels[0]
  const oldName=panel.name
  const hardware=(id,x)=>({
    id,assetId:'ykk-source-qa',panel:panel.id,kind:'puller',
    positionMm:[x,40,1],rotationDegrees:[0,0,0],scale:[1,1,1],
    visible:true,color:'#c16f4c',roughness:.3,metalness:.8,
    opacity:1,reflectionIntensity:1,clearcoat:0,weightGrams:0,materialType:'metal',
  })
  const a=hardware('a',50),b=hardware('b',65)
  stage='hardware A > rename > hardware B linked chronology'
  await send({op:'hardware-set',importedHardware:[a]})
  assert.equal(state.canUndo,true,'Global Undo must include hardware-only transaction')
  assert.equal(state.canUndoHardware,true)
  await send({op:'set-property',target:'panel',id:panel.id,field:'name',value:'QA pattern rename'})
  assert.equal(state.canUndoHardware,false,'Hardware-only button must not skip a newer pattern edit')
  await reject({op:'hardware-undo'},'Non-top hardware Undo')
  await send({op:'hardware-set',importedHardware:[a,b]})
  assert.equal(state.canUndoHardware,true)
  const savedFinal=(await send({op:'save'})).project
  stage='mixed global Undo and hardware-only guarded alias'
  await send({op:'undo'})
  assert.deepEqual(state.importedHardware,[a])
  assert.equal(state.template.panels[0].name,'QA pattern rename')
  assert.equal(state.canUndoHardware,false)
  await send({op:'undo'})
  assert.equal(state.template.panels[0].name,oldName)
  assert.deepEqual(state.importedHardware,[a])
  await send({op:'hardware-undo'})
  assert.deepEqual(state.importedHardware,[])
  stage='strict chronological Redo'
  await send({op:'hardware-redo'})
  assert.deepEqual(state.importedHardware,[a])
  assert.equal(state.canRedoHardware,false)
  await reject({op:'hardware-redo'},'Non-top hardware Redo')
  await send({op:'redo'})
  assert.equal(state.template.panels[0].name,'QA pattern rename')
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,savedFinal,
    'Global Redo must restore exact authored template and imported hardware')
  stage='reject invalid placement and invalidate redo branches'
  const invalid=hardware('orphan',50);invalid.panel='missing'
  await reject({op:'hardware-set',importedHardware:[invalid]},'Unresolved hardware source')
  const initialRevision=state.revision
  await send({op:'hardware-set',importedHardware:[a,b]})
  assert.equal(state.revision,initialRevision,'No-op must not manufacture history entries')
  await send({op:'undo'})
  await send({op:'hardware-set',importedHardware:[hardware('a',80)]})
  assert.equal(state.canRedo,false,'New hardware edit must clear global redo branch')
  assert.equal(state.canRedoHardware,false)
  await reject({op:'redo'},'Detached redo after changed hardware branch')
  stage='persist exact hardware with linked durable reopened history'
  const saved=(await send({op:'save'})).project
  await send({op:'open',project:saved})
  assert.deepEqual(state.importedHardware,[hardware('a',80)])
  // RUN45: the native session now restores a project-digest-bound history
  // sidecar across reopen. The original RUN39 test expected the old
  // session-only behavior and falsely failed after the durable history
  // feature landed. Verify real linked chronology and redo instead.
  assert.equal(state.canUndo,true,'Reopened saved hardware transaction lost durable Undo')
  assert.equal(state.canUndoHardware,true,'Reopened last hardware step is not actionable')
  await send({op:'undo'})
  assert.deepEqual(state.importedHardware,[a],'Reopened history did not undo only the latest hardware edit')
  assert.equal(state.template.panels[0].name,'QA pattern rename','Reopened Undo rewrote unrelated pattern metadata')
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,saved,'Reopened Redo did not restore exact saved document')
  console.log(JSON.stringify({passed:true,revision:state.revision,mixedNativeHistory:true,
    strictHardwareAliases:true,invalidFailClosed:true,noOpSafe:true,redoBranchInvalidated:true,
    savedAndReopened:true,reopenedLinkedHistory:true,reopenedUndoRedoValidated:true,factoryApproved:false}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,reason:error.message||String(error),factoryApproved:false}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
