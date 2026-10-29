// Exercise the cross-compiled ARM64 Rust solver over an isolated native HTTP session.
// Does not read or alter the installed production EXO app or garment project.

import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..')
const binary=join(root,'.exo-build-scratch/return-check/exo-session-arm64-candidate')
assert(existsSync(binary),'Missing cross-compiled ARM64 candidate solver')
const out=mkdtempSync(join(tmpdir(),'exo-v2-installed-split-'))
mkdirSync(join(out,'workspace'),{recursive:true})
const port=5678,base=`http://127.0.0.1:${port}`
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,detached:true,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:out,EXO_CLOTHCRAFT_REPO:join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
const post=async body=>{const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const result=await response.json();assert(result.ok,JSON.stringify({body,result:result.error}));return result.data}
try{
 let ready=false
 for(let i=0;i<80;i++){try{const response=await fetch(base+'/health',{signal:AbortSignal.timeout(750)});if((await response.json()).nativeReady){ready=true;break}}catch{}await sleep(250)}
 assert(ready,'Isolated native service failed startup')
 let state=await post({op:'snapshot'})
 const point=state.template.panels.find(p=>p.polygon?.edges?.length>1)
 assert(point,'Native pattern is missing')
 const panel=point.id,edge=point.polygon.edges[0]
 const n=point.polygon.points.length
 const a=point.polygon.points[0],b=point.polygon.points[1%n]
 const distance=Math.hypot(b[0]-a[0],b[1]-a[1])
 assert(distance>0.02,'Test edge is unexpectedly tiny')
 const previousRevision=state.revision
 state=await post({op:'edit',revision:state.revision,command:{kind:'SplitBoundary',panel,edge,at_m:distance/2}})
 const edited=state.template.panels.find(p=>p.id===panel).polygon
 assert.equal(edited.points.length,n+1)
 assert.equal(edited.edges.length,n+1)
 assert.equal(edited.edges[0],edge)
 assert.notEqual(edited.edges[1],edge)
 const saved=await post({op:'save'})
 assert.equal(saved.project.template.panels.find(p=>p.id===panel).polygon.points.length,n+1)
 state=await post({op:'undo',revision:state.revision})
 assert.equal(state.template.panels.find(p=>p.id===panel).polygon.points.length,n)
 state=await post({op:'redo',revision:state.revision})
 assert.equal(state.template.panels.find(p=>p.id===panel).polygon.points.length,n+1)
 console.log(JSON.stringify({pass:true,binary,panel,edge,originalPoints:n,splitPoints:n+1,revisionBefore:previousRevision,revisionAfter:state.revision,saved:true,undoRedo:true,tempDir:out},null,2))
}finally{try{process.kill(-child.pid,'SIGTERM')}catch{}}
