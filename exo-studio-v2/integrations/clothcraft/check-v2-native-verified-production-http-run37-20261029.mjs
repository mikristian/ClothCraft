// Exercise the operator-facing HTTP bridge with an actual isolated native
// Rust session; no browser, installed Mac app, factory hardware or cargo.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import net from 'node:net'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {setTimeout as sleep} from 'node:timers/promises'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-production-http-run37-'))
const port=await new Promise((resolve,reject)=>{
  const server=net.createServer()
  server.once('error',reject)
  server.listen(0,'127.0.0.1',()=>{
    const selected=server.address().port
    server.close(error=>error?reject(error):resolve(selected))
  })
})
const base='http://127.0.0.1:'+port,origin='http://127.0.0.1:5386'
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:process.cwd(),stdio:'ignore',detached:true,
  env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:dir,
    EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(process.cwd(),'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(process.cwd(),'research/oss/clothcraft/target/debug/exo-session')},
})
const request=async(endpoint,body={},requestOrigin=origin)=>{
  const response=await fetch(base+endpoint,{method:'POST',
    headers:{'Content-Type':'application/json',...(requestOrigin?{Origin:requestOrigin}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(25000)})
  const payload=await response.json()
  return {status:response.status,...payload}
}
let revision,checks=0
const native=async packet=>{
  const answer=await request('/workspace',{revision,...packet})
  assert.equal(answer.ok,true,`${packet.op}: ${answer.error||answer.code}`)
  if(Number.isSafeInteger(answer.data?.revision))revision=answer.data.revision
  return answer.data
}
const negative=async(endpoint,input,code)=>{
  const result=await request(endpoint,input)
  assert.equal(result.ok,false,code)
  assert.equal(result.code,code)
  assert.equal(result.factoryApproved,false)
  checks++
}
try{
  let live=false
  for(let i=0;i<100;i++){
    try{const health=await fetch(base+'/health',{signal:AbortSignal.timeout(750)})
      if(health.ok){live=true;break}}catch{}
    await sleep(100)
  }
  assert.equal(live,true,'Isolated native HTTP workspace did not start')
  const opened=await native({op:'open',preset:'tshirt'})
  for(const panel of opened.template.panels)for(const edge of panel.polygon.edges)
    await native({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  const snap=await native({op:'snapshot'})
  const saved=(await native({op:'save'})).project
  const rules=createAccuMarkNativeRuleSet(snap)
  assert.equal(rules.ok,true,rules.reason)
  const catalog=prepareNativeGradeCatalog20261025(snap,saved,rules.ruleSet)
  assert.equal(catalog.ok,true,catalog.reason)
  await native({op:'grade-run-commit',gradeRun:catalog.gradeRun})

  const sourceReply=await request('/production/native-verified/v1/source')
  assert.equal(sourceReply.ok,true,JSON.stringify(sourceReply))
  const source=sourceReply.source
  assert.equal(source.sizes.length,6)
  assert.equal(source.panels.length,2)
  assert.equal(source.revision,revision)
  assert.equal(source.factoryApproved,false)
  assert(source.panels.every(p=>p.sourceFabricId==='woven-reference'&&p.sourceGrainDegrees===90))
  const order={
    expectedRevision:source.revision,
    quantitiesBySize:Object.fromEntries(source.sizes.map((size,i)=>[
      size,Object.fromEntries(source.panels.map((panel,j)=>[panel.id,1+(i+j)%2]))])),
    materialsByPanel:Object.fromEntries(source.panels.map((panel,i)=>[
      panel.id,{fabricId:panel.sourceFabricId,groupId:'main'}])),
  }
  const result=await request('/production/native-verified/v1/order',order)
  assert.equal(result.ok,true,JSON.stringify(result))
  const verified=result.result
  assert.equal(verified.workflow,'exo-native-verified-graded-production-order.v1')
  assert.equal(verified.results.length,6)
  assert.equal(verified.sourceMaterialsChecked,true)
  assert.equal(verified.readFromNativeWorkspace,true)
  assert.equal(verified.cuttingAuthorized,false)
  assert.equal(verified.factoryApproved,false)
  const count=verified.results.reduce((n,row)=>n+row.markers.reduce(
    (acc,m)=>acc+m.marker.placements.length,0),0)
  assert.equal(count,18)
  // The new CUT intake is Rust-authoritative, bounded to the current source,
  // and does not become an authenticated JS garment or factory output.
  const cutIntake=await request('/production/native-verified/v1/cut-intake',order)
  assert.equal(cutIntake.ok,true,JSON.stringify(cutIntake))
  assert.equal(cutIntake.result.manifest.sizeCuts.length,6)
  assert.equal(cutIntake.result.manifest.verifiedPhysicalCutInstances,count)
  assert.equal(cutIntake.result.manifest.coordinateContract.metresToCentimetres,100)
  assert.equal(cutIntake.result.manifest.jsIndustrialProjectSourceMatched,false)
  assert.equal(cutIntake.result.cuttingAuthorized,false)
  const intakePacket={manifest:cutIntake.result.manifest,
    manifestSha256:cutIntake.result.manifestSha256}
  const checkedIntake=await request('/production/native-verified/v1/cut-intake-inspect',{
    order,packet:intakePacket,
  })
  assert.equal(checkedIntake.ok,true,JSON.stringify(checkedIntake))
  assert.equal(checkedIntake.result.physicalCutCount,count)
  const tamperedIntake=structuredClone(intakePacket)
  tamperedIntake.manifest.sizeCuts[0].panels[0].physicalAreaCm2+=1
  await negative('/production/native-verified/v1/cut-intake-inspect',{
    order,packet:tamperedIntake,
  },'NATIVE_INTAKE_INVALID_PACKET')
  await negative('/production/native-verified/v1/cut-intake',{
    ...order,nativeCutlineFingerprint:'0'.repeat(64),
  },'INVALID_NATIVE_CUT_INTAKE_PACKET')
  await negative('/production/native-verified/v1/cut-intake-inspect',{
    order:{...order,expectedRevision:order.expectedRevision-1},
    packet:intakePacket,
  },'NATIVE_INTAKE_STALE_ORDER_REVISION')

  // Hold a slow request body open. The native-production mutex must be
  // acquired BEFORE awaiting body bytes; a competing operation gets 409.
  const pending=http.request(base+'/production/native-verified/v1/source',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  })
  const slowReply=new Promise((resolve,reject)=>{
    pending.once('error',reject)
    pending.once('response',res=>{
      const chunks=[]
      res.on('data',chunk=>chunks.push(chunk))
      res.once('end',()=>resolve({status:res.statusCode,
        body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}))
      res.once('error',reject)
    })
  })
  pending.write('{')
  await sleep(100)
  const concurrently=await request('/production/native-verified/v1/order',order)
  assert.equal(concurrently.status,409,JSON.stringify(concurrently))
  assert.equal(concurrently.code,'NATIVE_WORKSPACE_BUSY')
  assert.equal(concurrently.factoryApproved,false)
  const editorBlocked=await request('/workspace',{op:'snapshot',revision})
  assert.equal(editorBlocked.status,409,JSON.stringify(editorBlocked))
  assert.equal(editorBlocked.error,'NATIVE_PRODUCTION_INSPECTION_BUSY')
  const agentBlocked=await request('/agent/v1/action',{
    action:'workspace.undo',expectedRevision:revision,
  })
  assert.equal(agentBlocked.status,409,JSON.stringify(agentBlocked))
  assert.equal(agentBlocked.code,'NATIVE_PRODUCTION_INSPECTION_BUSY')
  pending.end('}')
  const slow=await slowReply
  assert.equal(slow.status,200,JSON.stringify(slow))
  assert.equal(slow.body.ok,true)
  const resumed=await request('/production/native-verified/v1/source')
  assert.equal(resumed.ok,true,'The native production mutex must release in finally')
  // A client that disconnects mid-body must also release the mutex. Without
  // an aborted-body handler a request could monopolize native production QA.
  const abandoned=http.request(base+'/production/native-verified/v1/source',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  })
  abandoned.on('error',()=>{})
  abandoned.on('response',res=>res.resume())
  abandoned.write('{')
  await sleep(100)
  const duringAbort=await request('/production/native-verified/v1/order',order)
  assert.equal(duringAbort.status,409)
  abandoned.destroy()
  await sleep(100)
  const recovered=await request('/production/native-verified/v1/source')
  assert.equal(recovered.ok,true,'Abandoned native request must not retain the mutex')
  // The reverse race matters too: QA must refuse a native project while
  // another HTTP editor request body is still arriving, even before it
  // dispatches its workspace RPC.
  const pendingEdit=http.request(base+'/workspace',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  })
  const pendingEditReply=new Promise((resolve,reject)=>{
    pendingEdit.on('error',reject)
    pendingEdit.on('response',res=>{
      const chunks=[]
      res.on('data',chunk=>chunks.push(chunk))
      res.on('end',()=>resolve({status:res.statusCode,
        body:JSON.parse(Buffer.concat(chunks).toString('utf8'))}))
    })
  })
  pendingEdit.write('{"op":"snapshot",')
  await sleep(100)
  const excluded=await request('/production/native-verified/v1/source')
  assert.equal(excluded.status,409,JSON.stringify(excluded))
  assert.equal(excluded.code,'NATIVE_WORKSPACE_BUSY')
  pendingEdit.end('"revision":'+revision+'}')
  const finishedEdit=await pendingEditReply
  assert.equal(finishedEdit.status,200,JSON.stringify(finishedEdit))
  assert.equal((await request('/production/native-verified/v1/source')).ok,true)
  checks+=10
  const exported=await request('/production/native-verified/v1/export',order)
  assert.equal(exported.ok,true,JSON.stringify(exported))
  assert.equal(exported.result.manifest.cuttingAuthorized,false)
  assert.equal(exported.result.manifest.factoryApproved,false)
  assert.equal(exported.result.manifest.artifacts.length,source.sizes.length*2)
  for(const artifact of exported.result.manifest.artifacts){
    const url=`${base}/production/native-verified/v1/artifacts/${exported.result.id}/${artifact.name}`
    const response=await fetch(url,{headers:{Origin:origin}})
    assert.equal(response.status,200,artifact.name)
    assert.equal(response.headers.get('content-type'),artifact.format==='pdf'?'application/pdf':'image/svg+xml')
    const bytes=Buffer.from(await response.arrayBuffer())
    assert.equal(bytes.length,artifact.bytes)
    assert.equal((await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'),artifact.sha256)
    assert(artifact.format==='pdf'?bytes.subarray(0,5).toString()==='%PDF-':bytes.toString().includes('<svg'))
  }
  const manifestResponse=await fetch(`${base}/production/native-verified/v1/artifacts/${exported.result.id}/manifest.json`,{headers:{Origin:origin}})
  assert.equal(manifestResponse.status,200)
  assert.equal((await manifestResponse.json()).sourceFingerprint,source.sourceFingerprint)
  const maliciousArtifact=await fetch(`${base}/production/native-verified/v1/artifacts/${exported.result.id}/manifest.json`,{headers:{Origin:'http://malicious.example'}})
  assert.equal(maliciousArtifact.status,403)
  const missingOriginArtifact=await fetch(`${base}/production/native-verified/v1/artifacts/${exported.result.id}/manifest.json`)
  assert.equal(missingOriginArtifact.status,403)
  const missingArtifact=await fetch(`${base}/production/native-verified/v1/artifacts/${'0'.repeat(64)}/manifest.json`,{headers:{Origin:origin}})
  assert.equal(missingArtifact.status,404)
  const repeatExport=await request('/production/native-verified/v1/export',order)
  assert.equal(repeatExport.result.id,exported.result.id)
  await negative('/production/native-verified/v1/export',{...order,expectedRevision:order.expectedRevision-1},'STALE_NATIVE_PRODUCTION_REVISION')
  await negative('/production/native-verified/v1/order',{...order,expectedRevision:order.expectedRevision-1},'STALE_NATIVE_PRODUCTION_REVISION')
  const missing=structuredClone(order);delete missing.quantitiesBySize.XS[source.panels[0].id]
  await negative('/production/native-verified/v1/order',missing,'INVALID_PHYSICAL_CUT_QUANTITY')
  const fakeFabric=structuredClone(order);fakeFabric.materialsByPanel[source.panels[0].id].fabricId=''
  await negative('/production/native-verified/v1/order',fakeFabric,'INVALID_CUTTING_MATERIAL_DECLARATION')
  const payloadForged={...order,nativeCutlineFingerprint:'0'.repeat(64)}
  await negative('/production/native-verified/v1/order',payloadForged,'INVALID_NATIVE_PRODUCTION_ORDER_FIELDS')
  const forbidden=await request('/production/native-verified/v1/source',{},'http://malicious.example')
  assert.equal(forbidden.status,403)
  checks++
  const withoutOrigin=await request('/production/native-verified/v1/source',{},null)
  assert.equal(withoutOrigin.status,403)
  checks++

  const stableProject=(await native({op:'save'})).project
  await native({op:'undo'})
  await negative('/production/native-verified/v1/source',{},'RESTORE_SAVED_NATIVE_GRADE_CATALOG_FIRST')
  await native({op:'redo'})
  const afterRedo=await request('/production/native-verified/v1/source')
  assert.equal(afterRedo.ok,true,JSON.stringify(afterRedo))
  const restored=await request('/production/native-verified/v1/order',{
    ...order,expectedRevision:afterRedo.source.revision})
  assert.equal(restored.ok,true,JSON.stringify(restored))
  assert.deepEqual(restored.result.results,verified.results)
  await native({op:'open',project:stableProject})
  const reopenedSource=await request('/production/native-verified/v1/source')
  assert.equal(reopenedSource.ok,true,JSON.stringify(reopenedSource))
  const reopened=await request('/production/native-verified/v1/order',{
    ...order,expectedRevision:reopenedSource.source.revision})
  assert.equal(reopened.ok,true,JSON.stringify(reopened))
  assert.deepEqual(reopened.result.results,verified.results)
  console.log(JSON.stringify({passed:true,httpBridge:true,nativeRust:true,
    sizes:source.sizes.length,panels:source.panels.length,physicalPlacements:count,
    negativeCases:checks,explicitQuantities:true,operatorMaterialDeclaration:true,
    allCutDataFromNative:true,undoRedo:true,saveReopen:true,
    factoryApproved:false,cuttingAuthorized:false}))
}finally{
  if(child.exitCode===null&&child.signalCode===null){
    const stopped=once(child,'exit')
    try{process.kill(-child.pid,'SIGTERM')}catch(error){if(error.code!=='ESRCH')throw error}
    await Promise.race([stopped,sleep(3000)])
  }
  // The server terminates its Rust subprocess asynchronously on SIGTERM.
  // Ensure no remaining process in this fixture's group can recreate files
  // while recursive removal runs.
  try{process.kill(-child.pid,'SIGKILL')}catch(error){if(error.code!=='ESRCH')throw error}
  await sleep(100)
  // Node 24 recursive rm has reproducibly returned ENOTEMPTY on this macOS
  // fixture after all requests completed. Unlink leaf files explicitly and
  // remove directories bottom-up so teardown failures remain observable.
  const removeTree=folder=>{
    if(!fs.existsSync(folder))return
    // Published immutable artifact directories are intentionally 0500.
    // The isolated fixture owns them, so restore owner write for teardown.
    fs.chmodSync(folder,fs.statSync(folder).mode|0o200)
    for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
      const full=path.join(folder,entry.name)
      if(entry.isDirectory())removeTree(full)
      else fs.unlinkSync(full)
    }
    fs.rmdirSync(folder)
  }
  removeTree(dir)
}
