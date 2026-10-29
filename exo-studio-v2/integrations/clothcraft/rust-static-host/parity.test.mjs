import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const here=path.dirname(fileURLToPath(import.meta.url))
const source=path.resolve(here,'../static.mjs')
const binary=path.join(here,'target/debug/exo-rust-static-host')
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n}
async function ready(port,child){for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error('server exited');try{await fetch(`http://127.0.0.1:${port}/`);return}catch{}await new Promise(r=>setTimeout(r,30))}throw Error('server did not start')}

test('Node and Rust static servers agree for ordinary files, methods, headers and invalid paths',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'exo-static-parity-'))
 const web=path.join(temp,'web'), scripts=path.join(temp,'integrations/clothcraft')
 const children=[]
 try{
  await fs.mkdir(scripts,{recursive:true});await fs.mkdir(web)
  await fs.copyFile(source,path.join(scripts,'static.mjs'))
  await fs.writeFile(path.join(web,'index.html'),'<h1>EXO</h1>')
  await fs.writeFile(path.join(web,'sample.CSS'),'body{}')
  await fs.writeFile(path.join(web,'file name.json'),'{}')
  await fs.writeFile(path.join(temp,'secret.txt'),'secret')
  await fs.symlink(path.join(temp,'secret.txt'),path.join(web,'outside.txt'))
  const nodePort=await port(),rustPort=await port()
  const node=spawn(process.execPath,[path.join(scripts,'static.mjs')],{env:{...process.env,EXO_WEB_PORT:String(nodePort)},stdio:'ignore'})
  const rust=spawn(binary,['--web-root',web],{env:{...process.env,EXO_WEB_PORT:String(rustPort)},stdio:'ignore'})
  children.push(node,rust)
  await Promise.all([ready(nodePort,node),ready(rustPort,rust)])
  const cases=[['GET','/'],['HEAD','/'],['GET','/sample.CSS'],['GET','/file%20name.json'],['HEAD','/file%20name.json'],['GET','/missing'],['GET','/outside.txt'],['POST','/'],['GET','/%00'],['GET','/%5C'],['GET','/%ZZ'],['GET','/%2e%2e/%2e%2e/secret.txt']]
  for(const [method,requestPath] of cases){
   const fetchRaw=async p=>{const resp=await fetch(`http://127.0.0.1:${p}${requestPath}`,{method});return{status:resp.status,mime:resp.headers.get('content-type'),cache:resp.headers.get('cache-control'),nosniff:resp.headers.get('x-content-type-options'),body:await resp.text()}}
   assert.deepEqual(await fetchRaw(rustPort),await fetchRaw(nodePort),`${method} ${requestPath}`)
  }
 }finally{for(const child of children)child.kill();await fs.rm(temp,{recursive:true,force:true})}
})
