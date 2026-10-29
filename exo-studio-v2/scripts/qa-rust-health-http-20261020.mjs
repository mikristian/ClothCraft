import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,chmodSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

const scratch=mkdtempSync(join(tmpdir(),'exo-rust-health-'))
const marker=join(scratch,'rust-invoked')
const binary=resolve('rust/exo_health_kernel/target/release/exo-health-kernel')
const wrapper=join(scratch,'native.sh')
writeFileSync(wrapper,`#!/bin/sh\nprintf 'called\\n' >> '${marker}'\nexec '${binary}'\n`)
chmodSync(wrapper,0o700)
const port=53977
const run=async enabled=>{
  const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
    env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:join(scratch,'workspace'),EXO_HEALTH_RUST:enabled?'1':'0',EXO_HEALTH_RUST_BINARY:wrapper},stdio:'ignore'})
  try{
    for(let attempt=0;attempt<75;attempt++){
      if(child.exitCode!=null)throw Error(`server exited ${child.exitCode}`)
      try{
        const response=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(300)})
        if(response.status===200)return {status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()}
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,75))
    }
    throw Error('health server unavailable')
  }finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!=null)return resolve();child.once('exit',resolve);setTimeout(resolve,1000)})}
}
try{
  const node=await run(false),rust=await run(true)
  assert.equal(node.status,200)
  assert.equal(rust.status,200)
  assert.equal(node.body,rust.body,'Rust endpoint must be byte-identical to Node')
  assert.ok(existsSync(marker),'Rust executable must actually run on live health request')
  assert.ok(readFileSync(marker,'utf8').includes('called'))
  assert.equal(JSON.parse(rust.body).nativeSession.metadataValidatorRust!==undefined,true)
  console.log(JSON.stringify({pass:true,optInRustInvoked:true,responseByteParity:true,bytes:Buffer.byteLength(node.body),status:rust.status,sessionFields:Object.keys(JSON.parse(rust.body).nativeSession)}))
}finally{rmSync(scratch,{recursive:true,force:true})}
