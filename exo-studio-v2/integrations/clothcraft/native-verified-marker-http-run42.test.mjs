import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {setTimeout as sleep} from 'node:timers/promises'

const sha=b=>createHash('sha256').update(b).digest('hex')

test('isolated server serves prefixed and historical marker references only with valid manifest identities and hashes',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-marker-http-'))
  const port=await new Promise((resolve,reject)=>{
    const socket=net.createServer()
    socket.once('error',reject)
    socket.listen(0,'127.0.0.1',()=>{
      const p=socket.address().port
      socket.close(e=>e?reject(e):resolve(p))
    })
  })
  const origin='http://127.0.0.1:5386'
  const base=`http://127.0.0.1:${port}/production/native-verified/v1/artifacts/`
  const create=(name,size,fabricId,bytes)=>{
    const manifest={schema:'exo-native-verified-marker-artifacts.v1',sourceRevision:1,
      sourceFingerprint:'a'.repeat(64),nativeCutlineFingerprint:'b'.repeat(64),
      orderQuantities:{[size]:{front:1}},cuttingMaterialDeclarations:{front:{fabricId,groupId:'main'}},
      artifacts:[{name,size,fabricId,format:'pdf',bytes:bytes.length,sha256:sha(bytes),placedPieces:1}],
      operatorApproved:false,factoryApproved:false,cuttingAuthorized:false}
    const manifestBytes=Buffer.from(JSON.stringify(manifest))
    const id=sha(manifestBytes)
    const folder=path.join(dir,'native-verified-marker-artifacts',id)
    fs.mkdirSync(folder,{recursive:true})
    fs.writeFileSync(path.join(folder,'manifest.json'),manifestBytes)
    fs.writeFileSync(path.join(folder,name),bytes)
    return {id,name,folder,bytes}
  }
  const modern=create('3_A-B-C.pdf','A-B','C',Buffer.from('%PDF-1.4\nmodern'))
  const legacy=create('A-B-C.pdf','A-B','C',Buffer.from('%PDF-1.4\nlegacy'))
  const mismatched=create('3_A-B-C.pdf','A','B-C',Buffer.from('%PDF-1.4\nmisnamed'))
  const tampered=create('3_X-Y.pdf','X','Y',Buffer.from('%PDF-1.4\noriginal'))
  fs.appendFileSync(path.join(tampered.folder,tampered.name),'tampered')
  const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
    cwd:process.cwd(),stdio:'ignore',
    env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:dir,
      EXO_CLOTHCRAFT_GPU:'0'},
  })
  try{
    let ready=false
    for(let i=0;i<100;i++){
      if(child.exitCode!==null)throw Error(`isolated server exited: ${child.exitCode}`)
      try{if((await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(600)})).ok){ready=true;break}}catch{}
      await sleep(100)
    }
    assert(ready,'isolated server did not start')
    const get=async(id,name,headers={Origin:origin})=>fetch(`${base}${id}/${name}`,{headers,signal:AbortSignal.timeout(5000)})
    for(const entry of [modern,legacy]){
      const response=await get(entry.id,entry.name)
      assert.equal(response.status,200)
      assert.equal(response.headers.get('content-type'),'application/pdf')
      assert.equal(response.headers.get('content-disposition'),`attachment; filename="${entry.name}"`)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),entry.bytes)
    }
    assert.equal((await get(mismatched.id,mismatched.name)).status,404)
    assert.equal((await get(tampered.id,tampered.name)).status,404)
    assert.equal((await get(modern.id,legacy.name)).status,404)
    assert.equal((await get(legacy.id,modern.name)).status,404)
    assert.equal((await get(modern.id,modern.name,{})).status,403)
    assert.equal((await get(modern.id,'manifest.json')).status,200)
  }finally{
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(3000)])
    if(child.exitCode===null)child.kill('SIGKILL')
    fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100})
  }
})
