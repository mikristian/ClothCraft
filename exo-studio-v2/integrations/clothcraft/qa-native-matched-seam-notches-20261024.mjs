// Original native Rust solver / isolated temporary project only. No signed app
// project writes or fake atomic edit-batch, no factory release claims.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {planNativeMatchedSeamNotches20261024} from '../../src/core/nativeSeamMatchedNotch20261024.js'

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-matched-native-notch-'))
const w=createWorkspace(dir)
let snap
async function send(request){
 const res=await w.request({revision:snap?.revision,...request})
 assert.equal(res.ok,true,res.error)
 if(res.data?.template)snap=res.data
 return res.data
}
try {
 await send({op:'open',preset:'tshirt'})
 const before=structuredClone(snap.template)
 const preview=planNativeMatchedSeamNotches20261024(snap,{seamId:'shoulder-right',fraction:.3,depthMm:4})
 assert.equal(preview.ok,true,preview.reason)
 assert.equal(preview.commands.length,2)
 await send({op:'edit',command:preview.commands[0]})
 await send({op:'edit',command:preview.commands[1]})
 const committed=structuredClone(snap.template)
 for(const c of preview.commands){
   const p=snap.template.panels.find(p=>p.id===c.panel)
   assert(p?.polygon?.notches?.[c.edge]?.some(n=>Math.abs(n.t-c.t)<1e-9))
 }
 await send({op:'undo'})
 assert.equal(snap.template.panels.find(p=>p.id===preview.commands[1].panel).polygon.notches?.[preview.commands[1].edge]?.length||0,0)
 await send({op:'undo'})
 assert.deepEqual(snap.template,before)
 await send({op:'redo'})
 await send({op:'redo'})
 assert.deepEqual(snap.template,committed)
 const saved=await send({op:'save'})
 await send({op:'open',project:saved.project})
 assert.deepEqual(snap.template,committed)
 const replay=planNativeMatchedSeamNotches20261024(snap,{seamId:'shoulder-right',fraction:.3,depthMm:4})
 assert.equal(replay.ok,false)
 assert.match(replay.reason,/Existing notch/)
 console.log(JSON.stringify({ok:true,seamId:preview.seamId,notches:preview.commands,
   checks:['actual Rust authoring accepted both saved sewn notches','2-step Undo restored exact template',
    '2-step Redo restored exact saved notches','save/reopen exact source','duplicate marker rejected'],
   nativeBatchAtomic:false,manufacturingApproved:false}))
}finally{
 w.close();fs.rmSync(dir,{recursive:true,force:true})
}
