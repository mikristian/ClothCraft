import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

// Exercise the actual production JS client in Node with only its Vite env replaced.
const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(root, 'src/core/projectCollaborationClient.js')
const source = readFileSync(sourcePath, 'utf8')
assert.match(source, /export async function followProjectEvents\(/)
assert.match(source, /Authorization:`Bearer \$\{bearer\}`/)
// Data URLs have no directory for relative ESM resolution; point the bridge
// import at its real source file without modifying production or writing files.
const bridgeUrl = pathToFileURL(resolve(root,'src/core/rustCollaborationSseKernel.js')).href
const moduleSource = source.replace('import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL', 'undefined')
  .replace("'./rustCollaborationSseKernel.js'", JSON.stringify(bridgeUrl))
assert.notEqual(moduleSource, source, 'Expected Vite env expression in actual source')
assert.ok(moduleSource.includes(bridgeUrl), 'Expected resolved source bridge import')
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
const store = new Map([['exo.clothcraft.collaboration.agentKey.v1', 'valid-key']])
globalThis.window = {location:{port:'5193'},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}}
const {followProjectEvents} = await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'))
let checks = 0
const check = (condition, message) => {assert.ok(condition,message);checks++}
const encode = new TextEncoder()
const frame = (type,data,ending='\n') => `event: ${type}${ending}data: ${JSON.stringify(data)}${ending}${ending}`
const random = seed => () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed}
const splitSeeded = (wire,seed) => {
  const bytes=encode.encode(wire),next=random(seed),chunks=[]
  for(let offset=0;offset<bytes.length;) {const end=Math.min(bytes.length,offset+1+next()%7);chunks.push(bytes.slice(offset,end));offset=end}
  return chunks
}
const run = async ({wire='', chunks, status=200, body=true, throwCallback=false, abortAfterChunk=null, signal}={}) => {
  const received=[],reads={count:0,cancelled:false},controller=new AbortController()
  const selectedSignal=signal??controller.signal
  globalThis.fetch=async (url,options) => {
    // The production client starts WASM loading without awaiting it. Keep this
    // suite on the actual JS fallback, with an explicit unavailable response.
    if (url === '/wasm/exo_collaboration_sse_kernel.wasm') return {ok:false,status:404}
    check(url.includes('/collab/v1/projects/'), 'SSE endpoint path')
    check(options.headers.Authorization === 'Bearer valid-key', 'Bearer auth sent')
    check(options.headers.Accept === 'text/event-stream', 'SSE Accept header')
    check(options.signal === selectedSignal, 'Abort signal passed to fetch')
    if(status!==200)return {ok:false,status,body:null}
    return {ok:true,status,body:body?{getReader:()=>({
      read:async()=>{const i=reads.count++;if(i>=parts.length)return {done:true};if(abortAfterChunk===i)controller.abort();return {value:parts[i],done:false}},
      cancel:async()=>{reads.cancelled=true},
    })}:null}
  }
  const parts=chunks??[encode.encode(wire)]
  let error=null
  try {await followProjectEvents('project-1',event=>{received.push(event);if(throwCallback)throw Error('callback failure')},selectedSignal)}
  catch(caught){error=caught}
  return {received,reads,error,controller}
}
try {
  for(let seed=1;seed<=32;seed++){
    const values=[{name:'é🚀漢字',index:seed},{nested:{n:seed},array:[1,2,3]}]
    const wire=frame('revision',values[0])+frame('membership',values[1])
    const result=await run({chunks:splitSeeded(wire,seed)})
    check(result.error===null,'seed '+seed+' clean exit')
    check(result.reads.cancelled,'seed '+seed+' reader cancelled')
    assert.deepEqual(result.received,[{type:'revision',data:values[0]},{type:'membership',data:values[1]}], 'seed '+seed)
    checks++
  }
  for(const ending of ['\n','\r\n','\r']){
    const wire=frame('revision',{ending},ending)
    const result=await run({chunks:splitSeeded(wire,71)})
    // CR-only delimiters are legal SSE, and should be handled by a compliant parser.
    const expected=ending==='\r'?[]:[{type:'revision',data:{ending}}]
    assert.deepEqual(result.received,expected,'current JS behavior with '+JSON.stringify(ending))
    checks++
  }
  const malformed=await run({wire:'event: revision\ndata: {broken}\n\n'+frame('revision',{ok:true})})
  assert.deepEqual(malformed.received,[{type:'revision',data:{ok:true}}]);checks++
  const threw=await run({wire:frame('revision',{n:1})+frame('revision',{n:2}),throwCallback:true})
  check(threw.received.length===2 && !threw.error,'callback errors swallowed while subsequent events deliver')
  const cancelled=await run({chunks:splitSeeded(frame('revision',{n:1})+frame('revision',{n:2}),99),abortAfterChunk:0})
  check(cancelled.received.length===0 && cancelled.reads.cancelled,'cancel stops streaming and cancels reader')
  const aborted=new AbortController();aborted.abort()
  const preAborted=await run({wire:frame('revision',{n:1}),signal:aborted.signal})
  check(preAborted.reads.count===0 && !preAborted.reads.cancelled,'pre-aborted signal avoids reader')
  const unauthorized=await run({status:401})
  check(unauthorized.error?.message.includes('HTTP 401'),'auth rejection propagated')
  const empty=await run({body:false})
  check(empty.error?.message.includes('HTTP 200'),'missing body rejected')
  // A split CRLF can be mishandled if CR is stripped before LF reaches the decoder.
  const splitCrLf=await run({chunks:[encode.encode('event: revision\r'),encode.encode('\ndata: {\"ok\":true}\r'),encode.encode('\n\r'),encode.encode('\n')]})
  assert.deepEqual(splitCrLf.received,[{type:'revision',data:{ok:true}}]);checks++
  const rustWasm=existsSync(resolve(root,'public/wasm/exo_collaboration_sse_kernel.wasm'))
  console.log(JSON.stringify({status:'PASS',checks,seededCases:32,source:sourcePath,rustParity:rustWasm?'WASM artifact present; parity not executed':'NOT TESTED: no compiled collaboration SSE WASM',knownGaps:['CR-only event delimiter unsupported','callback errors swallowed indistinguishably from malformed JSON']},null,2))
} finally {globalThis.fetch=originalFetch;globalThis.window=originalWindow}
