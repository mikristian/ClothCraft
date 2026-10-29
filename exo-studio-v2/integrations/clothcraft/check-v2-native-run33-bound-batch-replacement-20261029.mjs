import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run33-native-bindings-'))
const workspace=createWorkspace(folder)
let snapshot
const rpc=async payload=>{
 const r=await workspace.request({revision:snapshot?.revision,...payload})
 assert.equal(r.ok,true,`${payload.op}: ${r.error}`)
 if(r.data?.template)snapshot=r.data
 return r.data
}
const project=async()=>(await rpc({op:'save'})).project
try{
 await rpc({op:'open',preset:'tshirt'})
 const panel=snapshot.template.panels.find(p=>p.polygon?.points.length>=3)
 assert(panel)
 const source=panel.polygon.points[1]
 const rules={measurements:{width:{valueMm:400}},bindings:[{
  id:'run33_width',panelId:panel.id,pointIndex:1,mode:'polar',
  a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]
 }]}
 // Ordinary pre-binding authoring remains available.
 await rpc({op:'edit-batch',commands:[{kind:'Anchor',panel:panel.id,anchor:1,
  position:[source[0]+.002,source[1]]}]})
 await rpc({op:'undo'})
 await rpc({op:'bindings-store',nativeBindings:rules})
 const before=await project(),revision=snapshot.revision
 assert(before.native_point_bindings)
 const attempted=await workspace.request({op:'edit-batch',revision,
  commands:[{kind:'Anchor',panel:panel.id,anchor:1,position:[source[0]+.003,source[1]]}],
  nativeBindings:rules})
 assert.equal(attempted.ok,false,'RUN33: replacement binding payload bypassed saved graph dependency')
 assert.match(String(attempted.error),/bind|qualif|regenerat|depend/i)
 await rpc({op:'snapshot'})
 assert.equal(snapshot.revision,revision)
 assert.deepEqual(await project(),before)
 await rpc({op:'undo'})
 await rpc({op:'redo'})
 assert.deepEqual(await project(),before)
 await rpc({op:'open',project:before})
 assert.deepEqual(await project(),before)
 console.log('RUN33 PASS: original graph preserved, replacement-bound batch atomically denied, normal pre-binding edit, Undo/Redo/reopen')
}finally{workspace.close();fs.rmSync(folder,{recursive:true,force:true})}
