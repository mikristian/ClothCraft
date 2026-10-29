// True exo-session acceptance: linked measurement points -> single native
// transactional edit, invalid-last rollback, one Undo/Redo, save/reopen.
// No 3D fit, industrial grade or factory approval is inferred.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createNativePatternConstraintSidecar20261023 as create} from '../../src/core/nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027 as plan} from '../../src/core/nativeAtomicPointBindings20261027.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from '../../src/core/nativePatternBindingsRebase20261027.js'

const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-linked-point-'))
const workspace=createWorkspace(output)
let source=null
async function request(payload) {
  const response=await workspace.request({revision:source?.revision,...payload})
  assert.equal(response.ok,true,response.error)
  if(response.data?.template)source=response.data
  return response.data
}
try {
  await request({op:'open',preset:'tshirt'})
  const before=structuredClone(source)
  const panels=before.template.panels.filter(panel=>
    Array.isArray(panel.polygon?.points) && panel.polygon.points.length>=4)
  assert(panels.length>=2,'Tee must provide two independently editable native panels')
  const candidates=panels.slice(0,2)
  const measurements=Object.create(null),bindings=[]
  for (const [i,panel] of candidates.entries()) {
    const [a,b]=panel.polygon.points
    const nominal=Math.hypot(b[0]-a[0],b[1]-a[1])*1000
    assert(nominal>15)
    const name=`sleeve_panel_${i}_length`
    measurements[name]={valueMm:nominal+3}
    bindings.push({id:`move_${panel.id}`,panelId:panel.id,pointIndex:1,
      a:0,b:1,mode:'along',distanceFormula:name,dependsOn:[]})
  }
  const created=create(source,{measurements,bindings})
  assert.equal(created.ok,true,created.reason)
  const planned=plan(source,created.sidecar)
  assert.equal(planned.ok,true,planned.reason)
  const invalid=await workspace.request({op:'edit-batch',revision:source.revision,
    commands:[...planned.commands,{kind:'Anchor',panel:'removed-panel',anchor:1,position:[0.1,0.1]}]})
  assert.equal(invalid.ok,false)
  await request({op:'snapshot'})
  assert.deepEqual(source.template,before.template)
  assert.equal(source.revision,before.revision)
  await request({op:'edit-batch',commands:planned.commands})
  assert.equal(source.revision,before.revision+1)
  const verifiedFirst=rebase({revision:before.revision,template:before.template},
    {revision:source.revision,template:source.template},created.sidecar,planned)
  assert.equal(verifiedFirst.ok,true,verifiedFirst.reason)
  const accepted=structuredClone(source)
  for (const panel of candidates) {
    assert.notDeepEqual(accepted.template.panels.find(p=>p.id===panel.id)?.polygon,
      before.template.panels.find(p=>p.id===panel.id)?.polygon)
  }
  await request({op:'undo'})
  assert.deepEqual(source.template,before.template)
  await request({op:'redo'})
  assert.deepEqual(source.template,accepted.template)
  const saved=await request({op:'save'})
  await request({op:'open',project:saved.project})
  assert.deepEqual(source.template,accepted.template)
  // A second cycle validates two dependent point edits on ONE native panel.
  // Rust's AnchorGroup must delay normalization until both have been applied.
  const singleBefore=structuredClone(source)
  const panel=singleBefore.template.panels.find(p=>p.id===candidates[0].id)
  const [p0,p1,p2]=panel.polygon.points
  const lengthMm=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])*1000
  const heightMm=Math.hypot(p2[0]-p1[0],p2[1]-p1[1])*1000
  const single=create(source,{measurements:{width:{valueMm:lengthMm+2},height:{valueMm:heightMm+2}},
    bindings:[
      {id:'same-panel-width',panelId:panel.id,pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'width',dependsOn:[]},
      {id:'same-panel-height',panelId:panel.id,pointIndex:2,mode:'polar',a:1,b:2,angleDeg:90,
        distanceFormula:'height',dependsOn:['same-panel-width']},
    ]})
  assert.equal(single.ok,true,single.reason)
  const grouped=plan(source,single.sidecar)
  assert.equal(grouped.ok,true,grouped.reason)
  assert.equal(grouped.commands.length,1)
  assert.equal(grouped.commands[0].edits.length,2)
  await request({op:'edit-batch',commands:grouped.commands})
  assert.equal(source.revision,singleBefore.revision+1)
  const verifiedSecond=rebase({revision:singleBefore.revision,template:singleBefore.template},
    {revision:source.revision,template:source.template},single.sidecar,grouped)
  assert.equal(verifiedSecond.ok,true,verifiedSecond.reason)
  assert.equal(verifiedSecond.sidecar.sourceRevision,source.revision)
  assert.notDeepEqual(source.template,singleBefore.template)
  await request({op:'undo'})
  assert.deepEqual(source.template,singleBefore.template)
  console.log(JSON.stringify({passed:true,panels:candidates.length,
    checks:['nonpartial rejection','one revision for multi-panel change',
      'one-step native Undo/Redo','real Rust save/reopen preserves both edits',
      'same-panel ordered constraint group updates with one normalization and Undo',
      'source-verified Rust placement and parametric binding rebase']}))
} finally {
  workspace.close()
  fs.rmSync(output,{recursive:true,force:true})
}
