import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,existsSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const directory=mkdtempSync(path.join(tmpdir(),'exo-restart-independent-'))
const port=Number(process.env.EXO_RESTART_TEST_PORT||59647)
const base=`http://127.0.0.1:${port}`
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Compiled Rust exo-session missing')
let server
async function start(){
 server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:directory,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'},stdio:'ignore'})
 for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Isolated bridge exited');try{if((await fetch(`${base}/health`,{signal:AbortSignal.timeout(300)})).ok)return}catch{}await delay(100)}
 throw Error('Isolated bridge health timeout')
}
async function stop(){if(!server)return;const proc=server;server=null;proc.kill('SIGTERM');await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),delay(4000).then(()=>{proc.kill('SIGKILL')})])}
async function rpc(data){const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});const result=await response.json();assert(result.ok,JSON.stringify({op:data.op,error:result.error}));return result.data}
const bounds=panel=>{const points=panel.polygon.points;return [Math.round((Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*1000),Math.round((Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])))*1000)]}
let result={pass:false,directory,port}
try{
 await start()
 let state=await rpc({op:'open',preset:'tshirt'})
 const fabric=state.template.fabrics[0].id
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric}})
 const panel=state.template.panels.at(-1).id
 assert.deepEqual(bounds(state.template.panels.find(p=>p.id===panel)),[200,100])
 state=await rpc({op:'grade-pattern',revision:state.revision,panel,width_delta_mm:20,height_delta_mm:-10})
 const before=structuredClone(state.template.panels.find(p=>p.id===panel).polygon)
 assert.deepEqual(bounds(state.template.panels.find(p=>p.id===panel)),[220,90])
 const saved=await rpc({op:'save'})
 const savedPath=path.join(directory,'workspace','fitting-project.json.native')
 assert(existsSync(savedPath),'Rust save artifact absent')
 const bytes=readFileSync(savedPath)
 await stop()
 await start()
 const restarted=await rpc({op:'snapshot'})
 const after=restarted.template.panels.find(p=>p.id===panel)
 assert(after,'Edited panel absent following bridge restart')
 assert.deepEqual(after.polygon,before,'Rust polygon bytes differ after bridge restart')
 assert.deepEqual(bounds(after),[220,90])
 assert.deepEqual(readFileSync(savedPath),bytes,'Saved Rust file changed unexpectedly')
 result={pass:true,port,directory,panel,measurementsMm:[220,90],polygonExact:true,rustSaveBytes:bytes.length,restartedProcess:true,saveAcknowledged:!!saved.project}
}catch(error){result={...result,error:String(error?.stack||error)}}finally{await stop();writeFileSync(path.join(directory,'qa-result.json'),JSON.stringify(result,null,2))}
console.log(JSON.stringify(result,null,2))
if(!result.pass)process.exitCode=1
