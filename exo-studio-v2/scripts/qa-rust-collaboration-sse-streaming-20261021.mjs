#!/usr/bin/env node
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

// Load the production client verbatim apart from Vite's import.meta.env and
// its relative module specifier (data: URLs cannot resolve relative imports).
const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root,'src/core/projectCollaborationClient.js'),'utf8')
const bridge = pathToFileURL(resolve(root,'src/core/rustCollaborationSseKernel.js')).href
assert.ok(source.includes("'./rustCollaborationSseKernel.js'"))
assert.ok(source.includes('import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL'))
const adapted = source.replace("'./rustCollaborationSseKernel.js'",JSON.stringify(bridge))
  .replace('import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL','undefined')
const oldFetch = globalThis.fetch
const oldWindow = globalThis.window
const encoder = new TextEncoder()
const secretKey = 'exo.clothcraft.collaboration.agentKey.v1'
let checks=0
const equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const truth=(a,label)=>{assert.ok(a,label);checks++}
const split=(wire,pattern=[1,2,3,1,5])=>{
  const bytes=encoder.encode(wire),parts=[]
  for(let i=0,n=0;i<bytes.length;n++) {const end=Math.min(bytes.length,i+pattern[n%pattern.length]);parts.push(bytes.slice(i,end));i=end}
  return parts
}
const jsonEvent=(type,data,terminator='\n')=>`event: ${type}${terminator}data: ${JSON.stringify(data)}${terminator}${terminator}`
// This suite checks historical JS behavior, including its known CR-only gap.
const garments=Object.freeze([{id:'tee',pattern:Object.freeze({points:Object.freeze([1,2,3])})}])
const before=JSON.stringify(garments)
const store=new Map([[secretKey,'existing-token']])
globalThis.window={location:{port:'5193'},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}}
try {
  const {followProjectEvents,requestCollaboration}=await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64'))
  async function stream({chunks,preAborted=false,abortAfter=-1,status=200,body=true,callback,token='existing-token'}={}) {
    store.set(secretKey,token)
    const events=[],controller=new AbortController(),calls=[]
    let index=0,cancels=0
    const parts=chunks??[]
    if(preAborted)controller.abort()
    globalThis.fetch=async (url,opts={})=>{
      if(url==='/wasm/exo_collaboration_sse_kernel.wasm')return {ok:false,status:404}
      calls.push({url,opts})
      return {ok:status===200,status,body:body?{getReader:()=>({
        read:async()=>{if(index===parts.length)return {done:true};const value=parts[index++];if(index===abortAfter)controller.abort();return {done:false,value}},
        cancel:async()=>{cancels++},
      })}:null}
    }
    let error
    try {await followProjectEvents('id /?漢',event=>{events.push(event);callback?.(event)},controller.signal)}
    catch(e){error=e}
    return {events,error,cancels,calls,reads:index}
  }
  const events=[{type:'revision',data:{emoji:'🚀',kanji:'漢',accent:'café'}},{type:'message',data:{a:1,b:[true,null]}}]
  const input=': heartbeat\r\n\r\n'+jsonEvent('revision',events[0].data,'\r\n')+jsonEvent('message',events[1].data)
  for(const pattern of [[1],[2,1,3],[4,7,1,2,9]]) {
    const result=await stream({chunks:split(input,pattern)})
    equal(result.events,events,'fragmented UTF-8 + CRLF + comments')
    truth(result.cancels===1,'reader cancelled exactly once')
    truth(result.calls.length===1,'single authorized event request')
    truth(result.calls[0].opts.headers.Authorization==='Bearer existing-token','saved token used')
    truth(result.calls[0].opts.headers.Accept==='text/event-stream','SSE MIME accept')
    truth(result.calls[0].calls===undefined && result.calls[0].opts.signal instanceof AbortSignal,'signal supplied')
    truth(result.calls[0].url.includes('id%20%2F%3F%E6%BC%A2/events'),'project identifier escaped')
  }
  const weird='data: \n\n'+': ignore\n\n'+'event: revision\ndata: {invalid-json}\n\n'+
    'event: custom\ndata: {"first":1}\ndata: {"second":2}\n\n'+jsonEvent('ok',{after:true})
  const valid=await stream({chunks:split(weird)})
  equal(valid.events,[{type:'ok',data:{after:true}}],'empty data, comments, malformed JSON, multiline JSON skipped')
  const incomplete=await stream({chunks:split(jsonEvent('ok',{n:1})+'event: partial\ndata: {"n":2}')})
  equal(incomplete.events,[{type:'ok',data:{n:1}}],'EOF discards incomplete frame')
  const cr=await stream({chunks:split(jsonEvent('cr',{n:1},'\r'))})
  equal(cr.events,[],'legacy CR-only delimiter unsupported')
  const abort=await stream({chunks:split(jsonEvent('ok',{n:1})),abortAfter:1})
  equal(abort.events,[],'abort before complete event')
  truth(abort.cancels===1,'abort cancels reader')
  const pre=await stream({chunks:split(jsonEvent('ok',{n:1})),preAborted:true})
  truth(pre.calls.length===0 && pre.cancels===0,'pre-aborted never starts fetch')
  const failure=await stream({status:403})
  truth(failure.error?.message.includes('HTTP 403'),'HTTP rejection surfaced')
  const noBody=await stream({body:false})
  truth(noBody.error?.message.includes('HTTP 200'),'missing readable body rejected')
  const callback=await stream({chunks:split(jsonEvent('ok',{n:1})+jsonEvent('ok',{n:2})),callback:()=>{throw Error('test callback')}})
  equal(callback.events.map(x=>x.data.n),[1,2],'legacy callback exceptions swallowed')
  equal(JSON.stringify(garments),before,'no local garment mutation')

  // Separately exercise requestCollaboration's once-only 401 token refresh.
  store.set(secretKey,'expired-token')
  const issued=[],auth=[]
  globalThis.fetch=async (url,opts)=>{
    if(url.endsWith('/agent/v1/keys')) {issued.push(opts);return {ok:true,json:async()=>({ok:true,key:'new-token'})}}
    auth.push(opts.headers.Authorization)
    return auth.length===1?{status:401,ok:false,json:async()=>({ok:false,code:'expired'})}:
      {status:200,ok:true,json:async()=>({ok:true,projects:[]})}
  }
  equal(await requestCollaboration('GET','/projects'),{ok:true,projects:[]},'401 refresh retries request')
  equal(auth,['Bearer expired-token','Bearer new-token'],'fresh token used on retry')
  truth(issued.length===1 && store.get(secretKey)==='new-token','single token issuance persisted')
  truth(issued[0].method==='POST' && issued[0].cache==='no-store','token request contract')
  equal(JSON.stringify(garments),before,'token refresh does not alter garments')
  console.log(JSON.stringify({status:'PASS',checks,bytePatterns:3,source:'production followProjectEvents + requestCollaboration',backend:'JS fallback (WASM fetch mocked 404)',knownLegacyGaps:['CR-only framing unsupported','callback errors swallowed','incomplete final frame discarded']}))
} finally {globalThis.fetch=oldFetch;globalThis.window=oldWindow}
