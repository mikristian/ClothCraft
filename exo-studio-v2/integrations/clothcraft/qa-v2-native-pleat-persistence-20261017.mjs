// Native Rust authoring acceptance for the limited 2D native pleat fold-guide construction.
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
const work=mkdtempSync(path.join(tmpdir(),'exo-pleat-guides-'))
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
  snapshot=await rpc({op:'edit',revision:snapshot.revision,command:{kind:'Primitive',shape:'rectangle',size:[.3,.2],origin:[0,0],fabric}})
  const panel=snapshot.template.panels.at(-1)
  const before=panel.polygon.lines?.length||0
  const revision=snapshot.revision
  snapshot=await rpc({op:'pleat-guides',revision,panel:panel.id,orientation:'vertical',spacing_mm:20,inset_mm:10})
  let next=snapshot.template.panels.find(p=>p.id===panel.id)
  assert.equal((next.polygon.lines?.length||0),before+3,'Exactly three native fold guides')
  assert.equal(new Set(next.polygon.lines.map(x=>x.id)).size,(next.polygon.lines?.length||0))
  assert.equal(snapshot.revision,revision+1)
  snapshot=await rpc({op:'undo',revision:snapshot.revision})
  assert.equal((snapshot.template.panels.find(p=>p.id===panel.id).polygon.lines?.length||0),before)
  snapshot=await rpc({op:'redo',revision:snapshot.revision})
  assert.equal((snapshot.template.panels.find(p=>p.id===panel.id).polygon.lines?.length||0),before+3)
  const saved=await rpc({op:'save'})
  assert(existsSync(savefile))
  snapshot=await rpc({op:'open',project:saved.project})
  assert.equal((snapshot.template.panels.find(p=>p.id===panel.id).polygon.lines?.length||0),before+3)
  await assert.rejects(()=>rpc({op:'pleat-guides',revision:snapshot.revision,panel:panel.id,orientation:'diagonal',spacing_mm:20,inset_mm:10}),/orientation/)
  console.log(JSON.stringify({pass:true,createdGuides:3,undo:true,redo:true,saved:true,reopened:true,invalidOrientationRejected:true,work},null,2))
}finally{
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
}
