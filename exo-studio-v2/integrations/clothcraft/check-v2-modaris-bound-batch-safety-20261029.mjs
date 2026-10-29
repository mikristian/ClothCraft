import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const workspace=createWorkspace(fs.mkdtempSync(path.join(os.tmpdir(),'exo-bound-batch-')))
let snapshot
async function rpc(payload){const r=await workspace.request({revision:snapshot?.revision,...payload});assert.equal(r.ok,true,`${payload.op}: ${r.error}`);if(r.data?.template)snapshot=r.data;return r.data}
const project=async()=>(await rpc({op:'save'})).project
try{
 await rpc({op:'open',preset:'tshirt'})
 const panel=snapshot.template.panels.find(p=>p.polygon?.points.length>=3)
 assert(panel)
 const anchor=panel.polygon.points[1]
 const batch={op:'edit-batch',commands:[{kind:'Anchor',panel:panel.id,anchor:1,position:[anchor[0]+.002,anchor[1]]}]}
 await rpc(batch)
 assert.equal((await project()).native_point_bindings??null,null,'Normal pre-binding edit must succeed')
 await rpc({op:'undo'})
 const source=snapshot.template.panels.find(p=>p.id===panel.id)
 const point=source.polygon.points[1]
 await rpc({op:'bindings-store',nativeBindings:{measurements:{width:{valueMm:400}},bindings:[{id:'bound_width',panelId:panel.id,pointIndex:1,mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]}]}})
 const before=await project(), revision=snapshot.revision
 assert(before.native_point_bindings,'Fixture requires stored bindings')
 const attempt=await workspace.request({revision,op:'edit-batch',commands:[{kind:'Anchor',panel:panel.id,anchor:1,position:[point[0]+.003,point[1]]}]})
 assert.equal(attempt.ok,false,'Unsafe bound Anchor edit-batch unexpectedly committed')
 assert.match(String(attempt.error),/bind|regenerat|grade|depend/i)
 await rpc({op:'snapshot'})
 assert.equal(snapshot.revision,revision)
 assert.deepEqual(await project(),before)
 await rpc({op:'undo'})
 await rpc({op:'redo'})
 assert.deepEqual(await project(),before)
 await rpc({op:'open',project:before})
 assert.deepEqual(await project(),before)
 console.log('PASS: pre-binding batch succeeds, bound batch rejected atomically, undo/redo/reopen consistent')
}finally{await workspace.close?.()}
