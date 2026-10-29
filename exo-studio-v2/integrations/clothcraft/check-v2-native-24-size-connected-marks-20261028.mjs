// Existing compiled Rust: inspect 24 actual graded seam allowances, notches
// and cutlines. This is NOT cutting authorization, receiving-CAD or factory QA.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-24size-marks-'))
const workspace=createWorkspace(temp)
let snapshot
const rpc=async packet=>{
  const result=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(result.ok,true,`${packet.op}: ${result.error||'native rejection'}`)
  if(result.data?.template)snapshot=result.data
  return result.data
}
const save=async()=>(await rpc({op:'save'})).project
const sizes=Array.from({length:24},(_,i)=>String(i+1))
const verify=async(panelId,edgeId)=>{
  const proof=await rpc({op:'grade-run-industrial-audit',panel:panelId})
  assert.equal(proof.format,'exo-native-linked-industrial-named-sizes-proof.v2')
  assert.deepEqual(proof.sizes.map(item=>item.size),sizes)
  for(const size of proof.sizes){
    const edge=size.edges.find(item=>item.edgeId===edgeId)
    assert(edge,`Missing graded edge for size ${size.size}`)
    assert(Math.abs(edge.allowanceM-.012)<1e-9,`Allowance drift at ${size.size}`)
    assert.equal(edge.notches.length,1,`Notch count at ${size.size}`)
    assert(Math.abs(edge.notches[0].fraction-.43)<1e-9,`Notch station drift at ${size.size}`)
    assert(Math.abs(edge.notches[0].depthM-.004)<1e-9,`Notch depth drift at ${size.size}`)
  }
  assert.equal(proof.factoryApproved,false)
  const cutlines=await rpc({op:'grade-run-cutlines'})
  assert.equal(cutlines.format,'exo-native-graded-cutlines.v1')
  assert.deepEqual(cutlines.sizes.map(item=>item.size),sizes)
  assert.equal(cutlines.cuttingAuthorized,false)
  assert.equal(cutlines.manufacturerReady,false)
  return proof
}
try{
  await rpc({op:'open',preset:'tshirt'})
  const original=new Set(snapshot.template.panels.map(panel=>panel.id))
  await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[.55,.1],[.83,.1],[.83,.34],[.55,.34]]}})
  const panel=snapshot.template.panels.find(item=>!original.has(item.id))
  assert(panel,'Third physical panel missing')
  const edge=panel.polygon.edges[0]
  // Native source-bound industrial validation requires complete edge allowance
  // metadata for every panel, not just the edge selected for the notch.
  for(const item of [...snapshot.template.panels])for(const edgeId of item.polygon.edges){
    await rpc({op:'edit',command:{kind:'SeamAllowance',panel:item.id,edge:edgeId,width_m:.012}})
  }
  const source=await save()
  let authored=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'12'})
  assert(authored.ok,authored.reason)
  for(const size of sizes)if(size!=='12')for(const pointIndex of [1,2]){
    const edited=editAccuMarkNativePointRule(snapshot,authored.ruleSet,{
      panelId:panel.id,pointIndex,size,dxMm:Number(size)-12,dyMm:0})
    assert(edited.ok,edited.reason)
    authored=edited
  }
  const prepared=prepareNativeGradeCatalog20261025(snapshot,source,authored.ruleSet)
  assert(prepared.ok,prepared.reason)
  await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const before=snapshot.revision
  await rpc({op:'grade-notch-commit',panelId:panel.id,edgeId:edge,t:.43,depthMm:4})
  assert.equal(snapshot.revision,before+1,'Physical notch must be one Rust revision')
  const marked=await save()
  await verify(panel.id,edge)
  const duplicate=await workspace.request({op:'grade-notch-commit',revision:snapshot.revision,
    panelId:panel.id,edgeId:edge,t:.43,depthMm:4})
  assert.equal(duplicate.ok,false,'Duplicate physical notch accepted')
  assert.deepEqual(await save(),marked,'Duplicate notch changed durable source')
  await rpc({op:'undo'})
  const unmarked=await save()
  assert.equal(unmarked.grade_run.sizes.length,24)
  assert.equal(unmarked.template.panels.find(item=>item.id===panel.id).polygon.notches?.[edge]?.length??0,0)
  await rpc({op:'redo'})
  assert.deepEqual(await save(),marked,'Redo did not restore graded marks')
  await verify(panel.id,edge)
  await rpc({op:'open',project:marked})
  await verify(panel.id,edge)
  console.log(JSON.stringify({passed:true,realCompiledRust:true,canonicalSizes:24,
    physicalNotches:24,physicalAllowances:24,cutlineSizesInspected:24,
    duplicateNotchRejected:true,nativeUndoRedo:true,durableSaveReopen:true,
    licensedReceivingCad:false,cuttingAuthorized:false,factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temp,{recursive:true,force:true})
}
