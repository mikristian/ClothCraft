import assert from 'node:assert/strict'
import {test} from 'node:test'
import http from 'node:http'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const here=path.dirname(fileURLToPath(import.meta.url))
const original=path.resolve(here,'../mcp-server.mjs')
const rust=path.join(here,'target/debug/exo-rust-mcp-server')

async function mockApi() {
 const requests=[]
 const server=http.createServer(async(req,res)=>{
  const chunks=[]
  for await (const chunk of req) chunks.push(chunk)
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null
  requests.push({method:req.method,path:req.url,body,authorization:req.headers.authorization})
  if(req.url==='/agent/v1/actions'&&body?.action==='workspace.undo') {
   res.writeHead(409,{'Content-Type':'application/json'})
   return res.end(JSON.stringify({ok:false,code:'STALE_REVISION',error:'Snapshot revision differs'}))
  }
  if(req.url==='/agent/v1/actions'&&body?.action==='workspace.redo') {
   res.writeHead(502,{'Content-Type':'text/plain'})
   return res.end('not json')
  }
  res.writeHead(200,{'Content-Type':'application/json'})
  // A writable chunked response verifies that the native TCP bridge correctly
  // consumes normal Node.js HTTP/1.1 Transfer-Encoding: chunked messages.
  const payload=JSON.stringify({ok:true,path:req.url,method:req.method,body,authenticated:req.headers.authorization==='Bearer test-agent-key',revision:12})
  res.write(payload.slice(0,8))
  res.end(payload.slice(8))
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 return {server,requests,port:server.address().port}
}

function sample(id,method,params){return {jsonrpc:'2.0',id,method,...(params===undefined?{}:{params})}}

async function invoke(bin,args,env,messages){
 const child=spawn(bin,args,{env:{...process.env,...env},stdio:['pipe','pipe','pipe']})
 const stdout=[];const stderr=[]
 child.stdout.on('data',chunk=>stdout.push(chunk))
 child.stderr.on('data',chunk=>stderr.push(chunk))
 const exit = new Promise((resolve,reject)=>{
  child.once('error',reject)
  child.once('exit',(code,signal)=>resolve({code,signal}))
 })
 child.stdin.end(messages.map(JSON.stringify).join('\n')+'\n')
 const timer=setTimeout(()=>child.kill(),10000)
 try {
  const result=await exit
  assert.equal(result.code,0,`child ${bin} failed: ${Buffer.concat(stderr).toString()}`)
  return Buffer.concat(stdout).toString().trim().split('\n').filter(Boolean).map(line=>JSON.parse(line))
 } finally {clearTimeout(timer);if(child.exitCode===null)child.kill()}
}

function normalized(messages){
 return messages.map(message=>{
  const result=structuredClone(message)
  // JSON object key order inside the MCP text result isn't part of JSON-RPC.
  const text=result?.result?.content?.[0]?.text
  if(typeof text==='string') {
   try {result.result.content[0].text=JSON.parse(text)} catch {}
  }
  return result
 }).sort((a,b)=>String(a.id).localeCompare(String(b.id)))
}

async function compare(serverEnv,messages,expectedPaths){
 const api=await mockApi()
 try {
  const env={...serverEnv,EXO_MCP_BRIDGE_URL:`http://127.0.0.1:${api.port}/`,EXO_CLOTHCRAFT_AGENT_KEY:'test-agent-key'}
  const node=await invoke(process.execPath,[original],env,messages)
  const nodeRequests=api.requests.splice(0)
  const native=await invoke(rust,[],env,messages)
  const rustRequests=api.requests.splice(0)
  assert.deepEqual(normalized(native),normalized(node))
  assert.deepEqual(rustRequests,nodeRequests,'bridge HTTP method/path/body/auth must match')
  assert.deepEqual(rustRequests.map(req=>req.path),expectedPaths)
  assert.ok(rustRequests.every(req=>req.authorization==='Bearer test-agent-key'))
 }finally{await new Promise(resolve=>api.server.close(resolve))}
}

test('read-only MCP surface and errors match production Node implementation',async()=>{
 const inputs=[
  sample(1,'initialize'),sample(2,'ping'),sample(3,'tools/list'),
  sample(4,'tools/call',{name:'exo_capabilities'}),
  sample(5,'tools/call',{name:'exo_status'}),
  sample(6,'tools/call',{name:'exo_project_summary'}),
  sample(7,'tools/call',{name:'exo_line_inspect',arguments:{panel:'front',edge:'side'}}),
  sample(8,'tools/call',{name:'exo_line_inspect',arguments:{panel:'front'}}),
  sample(9,'tools/call',{name:'exo_line_inspect',arguments:{panel:'front',edge:'side',unknown:true}}),
  sample(10,'tools/call',{name:'exo_workspace_save',arguments:{expectedRevision:12}}),
  sample(11,'tools/call',{name:'not_a_tool'}),
  sample(12,'does/not/exist'),
  {jsonrpc:'2.0',method:'ping'}, // valid notification gets no response
  sample(13,'tools/call',{name:'exo_line_inspect',arguments:[]}),
  sample(14,'tools/call',{name:'exo_line_inspect',arguments:null}),
  {jsonrpc:'1.0',id:15,method:'ping'},
 ]
 await compare({EXO_MCP_ALLOW_EDITS:'0'},inputs,[
  '/agent/v1/capabilities','/agent/v1/status','/agent/v1/actions','/agent/v1/actions',
 ])
})

test('explicitly enabled editing, revision forwarding, and HTTP errors match Node',async()=>{
 const inputs=[
  sample(21,'tools/call',{name:'exo_workspace_save',arguments:{expectedRevision:12}}),
  sample(22,'tools/call',{name:'exo_workspace_undo',arguments:{expectedRevision:11}}),
  sample(23,'tools/call',{name:'exo_workspace_redo',arguments:{expectedRevision:11}}),
  sample(24,'tools/call',{name:'exo_step_simulation',arguments:{expectedRevision:12,steps:3}}),
  sample(25,'tools/call',{name:'exo_pause_simulation',arguments:{expectedRevision:12}}),
  sample(26,'tools/call',{name:'exo_set_line_target',arguments:{expectedRevision:12,panel:'front',edge:'hem',targetCm:21.5}}),
  sample(27,'tools/call',{name:'exo_workspace_save',arguments:{expectedRevision:12,unexpected:true}}),
 ]
 await compare({EXO_MCP_ALLOW_EDITS:'1'},inputs,[
  '/agent/v1/actions','/agent/v1/actions','/agent/v1/actions',
  '/agent/v1/actions','/agent/v1/actions','/agent/v1/actions',
 ])
})

test('rejects non-loopback API URL before processing stdio',async()=>{
 for(const executable of [[process.execPath,[original]],[rust,[]]]) {
  const child=spawn(executable[0],executable[1],{env:{...process.env,EXO_MCP_BRIDGE_URL:'http://example.com:5385/'}})
  child.stdin.end()
  const code=await new Promise(resolve=>child.once('exit',resolve))
  assert.notEqual(code,0)
 }
})
