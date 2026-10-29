// Disposable private-port end-to-end proof of Rust-owned line-spec/history/revision/persistence.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
const root=resolve('.')
const scratch=mkdtempSync(join(tmpdir(),'exo-rust-006-'))
const port=41000+Math.floor(Math.random()*7000)
const base=`http://127.0.0.1:${port}`
const binary=join(root,'research/oss/clothcraft/target/debug/exo-session')
let server
const delay=ms=>new Promise(r=>setTimeout(r,ms))
async function start(){
  server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
    cwd:root,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,
    EXO_CLOTHCRAFT_REPO:join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
  for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error(`Server exited ${server.exitCode}`)
    try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await delay(100)}
  throw Error('Private native service did not start')
}
async function stop(){if(!server)return;const child=server;server=null;child.kill('SIGTERM');for(let i=0;i<30&&child.exitCode===null;i++)await delay(100);if(child.exitCode===null)child.kill('SIGKILL')}
async function rpc(body,expected=true){
 const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})
 const data=await response.json();assert.equal(data.ok,expected,JSON.stringify({body,error:data.error}));return data
}
let assertions=0
try{
 await start()
 const opened=(await rpc({op:'open',preset:'tshirt'})).data
 const panel=opened.template.panels.find(p=>p.polygon?.edges?.length)
 assert(panel,'Editable panel required');const edge=panel.polygon.edges[0]
 const original=panel.polygon.target_lengths?.[edge]??null
 const target=original===0.3125?0.325:0.3125
 const command={op:'line-spec',panel:panel.id,edge,target_m:target,revision:opened.revision}
 const changed=(await rpc(command)).data
 assert.equal(changed.revision,opened.revision+1);assert.equal(changed.template.panels.find(p=>p.id===panel.id).polygon.target_lengths[edge],target);assert(changed.canUndo);assertions+=3
 const stale=await rpc(command,false)
 assert.match(stale.error,/Stale document revision/);assertions++
 const undone=(await rpc({op:'undo',revision:changed.revision})).data
 assert.equal(undone.template.panels.find(p=>p.id===panel.id).polygon.target_lengths?.[edge]??null,original);assert(undone.canRedo);assert(undone.revision>changed.revision);assertions+=3
 const redone=(await rpc({op:'redo',revision:undone.revision})).data
 assert.equal(redone.template.panels.find(p=>p.id===panel.id).polygon.target_lengths[edge],target);assert(redone.revision>undone.revision);assertions+=2
 const saved=await rpc({op:'save'})
 assert.equal(saved.data.project.template.panels.find(p=>p.id===panel.id).polygon.target_lengths[edge],target);assertions++
 const disk=JSON.parse(readFileSync(join(scratch,'workspace','fitting-project.json'),'utf8'))
 assert.equal(disk.template.panels.find(p=>p.id===panel.id).polygon.target_lengths[edge],target);assertions++
 await stop();await start()
 const reopened=(await rpc({op:'snapshot'})).data
 assert.equal(reopened.template.panels.find(p=>p.id===panel.id).polygon.target_lengths[edge],target);assertions++
 console.log(JSON.stringify({pass:true,assertions,owner:'existing Rust exo-session',operation:'line-spec',undo:true,redo:true,staleRevisionRejected:true,savedAndReopened:true,privatePort:true}))
}finally{await stop();rmSync(scratch,{recursive:true,force:true})}
