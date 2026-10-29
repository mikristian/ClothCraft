// Isolated live Rust workspace test; never touches the user's signed V2 project.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createWorkspace} from './workspace.mjs'
import {buildSeamlyNativeCutCommand20261024} from '../../src/core/seamlyNativeCutTransfer20261024.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const engine=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
if(!fs.existsSync(engine)){console.log('SKIP: standalone Rust session missing');process.exit(0)}
const file={name:'verified-male-shirt-AAMA.dxf',
  content:fs.readFileSync(path.join(root,'research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf'),'utf8'),
  sha256:'a'.repeat(64)}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-seamly-native-qa-'))
const session=createWorkspace(dir)
let s
async function req(data){
 const r=await session.request({revision:s?.revision,...data})
 assert.equal(r.ok,true,r.error)
 if(r.data?.template)s=r.data
 return r.data
}
try{
 await req({op:'open',preset:'tshirt'})
 const initial=structuredClone(s.template),count=initial.panels.length
 const fabric=initial.fabrics[0].id
 const plan=buildSeamlyNativeCutCommand20261024(file,{unit:'mm',index:0,fabricId:fabric})
 assert.equal(plan.ok,true,plan.reason)
 assert(plan.command.points.length<=64)
 await req({op:'edit',command:plan.command})
 assert.equal(s.template.panels.length,count+1)
 const added=s.template.panels.at(-1)
 assert.equal(added.polygon.points.length,plan.command.points.length)
 assert.equal(added.fabric,fabric)
 assert.equal(typeof added.polygon.edges[0],'string')
 const accepted=structuredClone(s.template)
 await req({op:'undo'})
 assert.deepEqual(s.template,initial)
 await req({op:'redo'})
 assert.deepEqual(s.template,accepted)
 const saved=await req({op:'save'})
 await req({op:'open',project:saved.project})
 assert.deepEqual(s.template,accepted)
 console.log(JSON.stringify({ok:true,engine:'real native Rust',source:'Seamly2D AAMA',sourceCutBlock:plan.name,pointsOriginal:plan.originalVertexCount,
   pointsNative:plan.nativeVertexCount,maxApproxDeviationMm:plan.geometryDeviationMm,
   insertedPanel:added.id,checks:['native contour compiled','fabric assigned','undo exactly restores','redo exactly restores','save and reopen exact template'],
   manufacturingApproved:false}))
}finally{
 session.close()
 fs.rmSync(dir,{recursive:true,force:true})
}
