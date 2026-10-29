// Native Rust authoring acceptance for the limited 2D grading operation.
// Always creates a disposable workspace: no installed/user project is touched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Build native exo-session before QA')
const work=mkdtempSync(path.join(tmpdir(),'exo-grade-physical-'))
const savefile=path.join(work,'fitting-project.json.native')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const child=spawn(binary,[avatar,savefile],{cwd:root,stdio:['pipe','pipe','pipe']})
let stderr='',waiting=null
child.stderr.on('data',data=>{stderr+=data.toString()})
createInterface({input:child.stdout}).on('line',line=>{
  const reply=waiting;waiting=null
  if(reply)reply(JSON.parse(line))
})
function rpc(payload){
  if(waiting)throw Error('Concurrent native command not allowed')
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{waiting=null;reject(Error(`Timeout: ${payload.op} ${stderr.slice(-500)}`))},30000)
    waiting=value=>{clearTimeout(timeout);if(!value.ok)reject(Error(`${payload.op}: ${value.error}`));else resolve(value.data)}
    child.stdin.write(JSON.stringify(payload)+'\n')
  })
}
function box(panel){
  const points=panel?.polygon?.points||[]
  const xs=points.map(point=>point[0]),ys=points.map(point=>point[1])
  return [(Math.max(...xs)-Math.min(...xs))*1000,(Math.max(...ys)-Math.min(...ys))*1000]
}
try{
  let snapshot=await rpc({op:'open',preset:'tshirt'})
  const fabric=snapshot.template.fabrics[0].id
  snapshot=await rpc({op:'edit',revision:snapshot.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric}})
  const panel=snapshot.template.panels.at(-1)
  assert.deepEqual(box(panel).map(Math.round),[200,100])
  const before=snapshot.revision
  snapshot=await rpc({op:'grade-pattern',revision:before,panel:panel.id,width_delta_mm:20,height_delta_mm:-10})
  assert.equal(snapshot.revision,before+1)
  assert.deepEqual(box(snapshot.template.panels.find(p=>p.id===panel.id)).map(Math.round),[220,90])
  snapshot=await rpc({op:'undo',revision:snapshot.revision})
  assert.deepEqual(box(snapshot.template.panels.find(p=>p.id===panel.id)).map(Math.round),[200,100])
  snapshot=await rpc({op:'redo',revision:snapshot.revision})
  assert.deepEqual(box(snapshot.template.panels.find(p=>p.id===panel.id)).map(Math.round),[220,90])
  const saved=await rpc({op:'save'})
  assert(existsSync(savefile))
  snapshot=await rpc({op:'open',project:saved.project})
  assert.deepEqual(box(snapshot.template.panels.find(p=>p.id===panel.id)).map(Math.round),[220,90])
  const originalRevision=snapshot.revision
  await assert.rejects(()=>rpc({op:'grade-pattern',revision:originalRevision,panel:panel.id,width_delta_mm:501,height_delta_mm:0}),/500|increments/i)
  console.log(JSON.stringify({pass:true,changedFromMm:[200,100],changedToMm:[220,90],undo:true,redo:true,reopened:true,invalidIncrementRejected:true,work},null,2))
}finally{
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
}
