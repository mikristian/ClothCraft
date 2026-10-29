// Real bridge process, isolated storage. Never creates keys in the user's
// installed V2 application or prints secrets to the terminal/logs.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-agent-keys-http-'))
const origin='http://127.0.0.1:5386'
let child=null
const freePort=()=>new Promise((resolve,reject)=>{
  const s=net.createServer();s.once('error',reject)
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})
})
const port=await freePort(),base=`http://127.0.0.1:${port}`
async function launch(){
  child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
    cwd:root,env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output},
    stdio:['ignore','pipe','pipe'],
  })
  let trace=''
  child.stderr.on('data',part=>{trace=(trace+part).slice(-1000)})
  for(let n=0;n<50;n++){
    if(child.exitCode!==null)throw Error(`Isolated API server exited ${child.exitCode}: ${trace}`)
    try{const response=await fetch(base+'/health',{signal:AbortSignal.timeout(500)});if(response.ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,100))
  }
  throw Error(`Isolated API server not ready: ${trace}`)
}
async function halt(){
  if(!child)return
  const process=child;child=null
  if(process.exitCode===null){process.kill('SIGTERM');await Promise.race([new Promise(resolve=>process.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,2000))])}
}
async function call(url,{method='GET',trusted=false,token,body}={}){
  const response=await fetch(base+url,{method,
    headers:{...(trusted?{Origin:origin}:{}),...(token?{Authorization:`Bearer ${token}`}:{}) ,
      ...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})})
  return {status:response.status,headers:response.headers,body:await response.json()}
}
try{
  await launch()
  const status=await call('/agent/v1/status',{trusted:true})
  assert.equal(status.status,200)
  assert.equal(status.body.apiVersion,'1.3.0')
  assert.equal(status.headers.get('access-control-allow-origin'),origin)
  assert.equal((await call('/agent/v1/status')).status,401)
  const preflight=await fetch(base+'/agent/v1/keys',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,authorization'}})
  assert.equal(preflight.status,204)
  assert(preflight.headers.get('access-control-allow-headers').includes('Authorization'))
  assert.equal((await call('/agent/v1/keys')).status,401)
  assert.equal((await call('/agent/v1/keys',{trusted:true})).status,200)
  const created=await call('/agent/v1/keys',{trusted:true,method:'POST',body:{name:'Isolated QA read agent',scopes:['read'],expiresInDays:1}})
  assert.equal(created.status,201,JSON.stringify({status:created.status,code:created.body.code}))
  assert(created.body.key?.startsWith('cck_'))
  const secret=created.body.key,id=created.body.id
  const keyPath=path.join(output,'agent-keys.json')
  assert.equal(fs.statSync(keyPath).mode & 0o777,0o600)
  assert(!fs.readFileSync(keyPath,'utf8').includes(secret))
  assert.equal((await call('/agent/v1/status',{token:secret})).status,200)
  assert.equal((await call('/agent/v1/actions',{method:'POST',token:secret,body:{action:'simulation.pause',expectedRevision:0}})).status,403)
  assert.equal((await call('/agent/v1/actions',{method:'POST',token:secret,body:{action:'workspace.save',expectedRevision:0}})).status,403)
  const list=await call('/agent/v1/keys',{trusted:true})
  assert.equal(list.body.keys.length,1)
  assert(!JSON.stringify(list.body).includes(secret))
  await halt()
  await launch()
  assert.equal((await call('/agent/v1/status',{token:secret})).status,200,'key should persist across native service restart')
  const revoked=await call(`/agent/v1/keys/${id}`,{method:'DELETE',trusted:true})
  assert.equal(revoked.status,200)
  assert.equal((await call('/agent/v1/status',{token:secret})).status,401)
  assert.equal((await call('/agent/v1/keys',{trusted:true})).body.keys[0].revokedAt!==null,true)
  console.log(JSON.stringify({pass:true,apiVersion:status.body.apiVersion,scopeDenied:true,secretPersistedAcrossRestart:true,
    unauthorized:401,revocationEffective:true,storeMode:'0600',preflight:204,keyListRedacted:true}))
}finally{await halt();fs.rmSync(output,{recursive:true,force:true})}
