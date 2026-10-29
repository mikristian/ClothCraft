// Disposable real Rust acceptance of one explicit 2D board-relative link
// between two independent panels. This does not write an installed garment or
// claim persistent automatic graph / full Modaris production parity.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createNativePatternConstraintSidecar20261023 as create} from '../../src/core/nativePatternConstraintBindings20261023.js'
import {planModarisNativeCrossPieceReference20261027 as plan,
  verifyModarisNativeCrossPieceReferenceCommit20261027 as witness} from '../../src/core/modarisNativeCrossPieceReference20261027.js'

const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-cross-piece-'))
const workspace=createWorkspace(output)
let snapshot
const request=async payload=>{
  const response=await workspace.request({revision:snapshot?.revision,...payload})
  assert.equal(response.ok,true,response.error)
  if(response.data?.template)snapshot=response.data
  return response.data
}
const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-7
const xy=panel=>panel.layout_2d??[0,0]
const board=(panel,point)=>{
  const a=(panel.layout_rotation_degrees??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),layout=xy(panel)
  return [layout[0]+c*point[0]-s*point[1],layout[1]+s*point[0]+c*point[1]]
}
try{
  await request({op:'open',preset:'tshirt'})
  const fabric=snapshot.template.fabrics?.[0]?.id
  assert(typeof fabric==='string'&&fabric)
  const ids=new Set(snapshot.template.panels.map(p=>p.id))
  const specs=[[.4,.3],[.3,.25],[.25,.2]]
  const panels=[]
  for(const [index,size] of specs.entries()){
    await request({op:'edit',command:{kind:'Primitive',shape:'rectangle',size,
      origin:[index*.7,index*.15],fabric}})
    const panel=snapshot.template.panels.find(p=>!ids.has(p.id))
    assert(panel?.polygon?.points?.length===4)
    ids.add(panel.id)
    panels.push(panel)
  }
  const [front,back,spare]=panels
  assert(near(front.polygon.points[1][0],.4)&&near(back.polygon.points[1][0],.3))
  const measurements={spareWidth:{valueMm:250}}
  const bindings=[{id:'spare-independent',panelId:spare.id,pointIndex:1,
    mode:'polar',a:0,b:3,angleDeg:0,distanceFormula:'spareWidth'}]
  const before=structuredClone({revision:snapshot.revision,template:snapshot.template})
  const saved=create(before,{measurements,bindings})
  assert.equal(saved.ok,true,saved.reason)
  const frontPoint=front.polygon.points[1],backPoint=back.polygon.points[1]
  const frontBoard=board(front,frontPoint),backBoard=board(back,backPoint)
  const options={sourcePanelId:front.id,sourcePointIndex:1,sourceOriginalPosition:[...frontPoint],
    sourcePosition:[frontPoint[0]+.02,frontPoint[1]],targetPanelId:back.id,targetPointIndex:1,
    targetOriginalPosition:[...backPoint],relativeBoardVector:[backBoard[0]-frontBoard[0],backBoard[1]-frontBoard[1]]}
  const planned=plan(before,saved.sidecar,options)
  assert.equal(planned.ok,true,planned.reason)
  assert.equal(planned.proposal.commands.length,2)
  assert.equal(planned.proposal.commands[0].panel,front.id)
  assert.equal(planned.proposal.commands[1].panel,back.id)
  assert.equal(planned.proposal.pointCount,2)
  const denied=await workspace.request({op:'edit-batch',revision:snapshot.revision,
    commands:[...planned.proposal.commands,{kind:'AnchorGroup',panel:'missing-panel',edits:[[1,[.3,0]]]}],
    nativeBindings:{measurements,bindings}})
  assert.equal(denied.ok,false,'Invalid final native group must reject the whole batch')
  await request({op:'snapshot'})
  assert.deepEqual({revision:snapshot.revision,template:snapshot.template},before)
  await request({op:'edit-batch',commands:planned.proposal.commands,
    nativeBindings:{measurements,bindings}})
  const after=structuredClone({revision:snapshot.revision,template:snapshot.template})
  assert.equal(after.revision,before.revision+1)
  const checked=witness(before,after,saved.sidecar,planned)
  assert.equal(checked.ok,true,checked.reason)
  const actualFront=snapshot.template.panels.find(p=>p.id===front.id),actualBack=snapshot.template.panels.find(p=>p.id===back.id)
  assert(near(actualFront.polygon.points[1][0],frontPoint[0]+.02))
  assert(near(actualBack.polygon.points[1][0],planned.targetMaterialPosition[0]))
  assert(near(actualBack.polygon.points[1][1],planned.targetMaterialPosition[1]))
  assert.deepEqual(snapshot.template.panels.find(p=>p.id===spare.id),before.template.panels.find(p=>p.id===spare.id))
  assert.equal(snapshot.nativePointBindings?.active,true)
  const savedProject=await request({op:'save'})
  await request({op:'undo'})
  assert.deepEqual(snapshot.template,before.template)
  await request({op:'redo'})
  assert.deepEqual(snapshot.template,after.template)
  await request({op:'open',project:savedProject.project})
  assert.deepEqual(snapshot.template,after.template)
  console.log(JSON.stringify({passed:true,fixture:'3 disposable detached native rectangles',
    sourcePanel:front.id,targetPanel:back.id,originalSourceMm:frontPoint[0]*1000,
    committedSourceMm:(frontPoint[0]+.02)*1000,
    committedTargetMm:planned.targetMaterialPosition.map(x=>x*1000),
    twoAnchorGroups:true,oneRustRevision:true,invalidBatchRollback:true,
    persistedNativeBindings:true,undoRedo:true,saveReopen:true,manufacturingApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(output,{recursive:true,force:true})
}
