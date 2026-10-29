// A disposable local Rust session and temporary localhost server. This never
// opens the user's garment, modifies the installed EXO app, or commands a cutter.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const root=process.cwd()
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
if(!fs.existsSync(binary))throw Error('EXISTING_NATIVE_BINARY_REQUIRED_NO_CARGO_BUILD')
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-run44-roll-http-'))
const origin='http://127.0.0.1:5386'
const port=await new Promise((resolve,reject)=>{
  const s=net.createServer()
  s.once('error',reject)
  s.listen(0,'127.0.0.1',()=>{
    const p=s.address().port
    s.close(error=>error?reject(error):resolve(p))
  })
})
const base='http://127.0.0.1:'+port
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,stdio:'ignore',detached:false,
  env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),
    EXO_CLOTHCRAFT_OUTPUT_DIR:folder,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:binary},
})
const request=async(endpoint,body={},callerOrigin=origin)=>{
  const res=await fetch(base+endpoint,{method:'POST',
    headers:{'Content-Type':'application/json',
      ...(callerOrigin?{Origin:callerOrigin}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(45000)})
  return {httpStatus:res.status,...await res.json()}
}
let revision
const native=async packet=>{
  const response=await request('/workspace',{revision,...packet})
  assert.equal(response.ok,true,packet.op+': '+(response.error||response.code||'failed'))
  if(Number.isSafeInteger(response.data?.revision))revision=response.data.revision
  return response.data
}
try{
  let ready=false
  for(let i=0;i<100;i++){
    try{
      const response=await fetch(base+'/health',{signal:AbortSignal.timeout(750)})
      if(response.ok){ready=true;break}
    }catch{}
    await sleep(100)
  }
  assert.equal(ready,true,'Isolated RUN44 local bridge did not start')
  const opened=await native({op:'open',preset:'tshirt'})
  for(const panel of opened.template.panels)
    for(const edge of panel.polygon.edges)
      await native({op:'edit',command:{kind:'SeamAllowance',
        panel:panel.id,edge,width_m:.012}})
  const saved=(await native({op:'save'})).project
  const snap=await native({op:'snapshot'})
  const rules=createAccuMarkNativeRuleSet(snap)
  assert.equal(rules.ok,true,rules.reason)
  const prepared=prepareNativeGradeCatalog20261025(snap,saved,rules.ruleSet)
  assert.equal(prepared.ok,true,prepared.reason)
  await native({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const {source}=await request('/production/native-verified/v1/source')
  assert.equal(source.revision,revision)
  assert.equal(source.sizes.length,6)
  const order={
    expectedRevision:source.revision,
    quantitiesBySize:Object.fromEntries(source.sizes.map((size,i)=>[
      size,Object.fromEntries(source.panels.map((p,j)=>[p.id,1+(i+j)%2]))])),
    materialsByPanel:Object.fromEntries(source.panels.map(panel=>[
      panel.id,{fabricId:panel.sourceFabricId,groupId:panel.sourceFabricId}])),
  }
  const fabrics=[...new Set(source.panels.map(p=>p.sourceFabricId))]
  const plans={
    rollsById:Object.fromEntries(fabrics.map((fabricId,i)=>[
      'ROLL-'+i,{
        fabricId,groupId:fabricId,usableWidthCm:150,
        availableLengthCm:10000,shadeId:'SHADE',dyeLotId:'LOT',
        batchId:'BATCH-'+i,
      }])),
    assignmentsBySize:Object.fromEntries(source.sizes.map(size=>[size,
      Object.fromEntries(fabrics.map((f,i)=>[f,{
        rollId:'ROLL-'+i,endLossCm:1}]))])),
    defectsByRoll:Object.fromEntries(fabrics.map((f,i)=>[
      'ROLL-'+i,[{startCm:0,endCm:5}]])),
  }
  const packet={order,planning:plans}
  const built=await request('/production/native-verified/v1/roll-study',packet)
  assert.equal(built.ok,true,JSON.stringify(built).slice(0,800))
  const result=built.result
  assert.equal(result.manifest.nativeSourceRevision,revision)
  assert.equal(result.manifest.nativeSourceFingerprint,source.sourceFingerprint)
  assert.equal(result.manifest.nativeCutlineFingerprint,source.nativeCutlineFingerprint)
  assert.equal(result.manifest.rows.length,source.sizes.length*fabrics.length)
  assert.equal(result.manifest.rows.reduce((sum,r)=>sum+r.nativeCutInstances,0),
    source.sizes.reduce((sum,size)=>sum+source.panels.reduce(
      (n,p)=>n+order.quantitiesBySize[size][p.id],0),0))
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.factoryApproved,false)
  const receipt={manifest:result.manifest,manifestSha256:result.manifestSha256}
  const checked=await request('/production/native-verified/v1/roll-study-inspect',{
    ...packet,packet:receipt})
  assert.equal(checked.ok,true,JSON.stringify(checked).slice(0,800))
  assert.equal(checked.result.manifestSha256,result.manifestSha256)
  const tampered=structuredClone(receipt)
  tampered.manifest.rows[0].startCm+=1
  const forged=await request('/production/native-verified/v1/roll-study-inspect',{
    ...packet,packet:tampered})
  assert.equal(forged.httpStatus,422)
  assert.equal(forged.ok,false)
  const wrongRoll=structuredClone(packet)
  wrongRoll.planning.rollsById['ROLL-0'].usableWidthCm=1
  assert.equal((await request('/production/native-verified/v1/roll-study',wrongRoll)).ok,false)
  const noOrigin=await request('/production/native-verified/v1/roll-study',packet,'')
  assert.equal(noOrigin.httpStatus,403)
  const hostile=await request('/production/native-verified/v1/roll-study',packet,
    'http://malicious.example')
  assert.equal(hostile.httpStatus,403)
  const stale=structuredClone(packet)
  stale.order.expectedRevision--
  assert.equal((await request('/production/native-verified/v1/roll-study',stale)).ok,false)
  console.log(JSON.stringify({passed:true,workspace:'isolated-native-Rust',
    sourceRevision:revision,sizes:source.sizes.length,rolls:fabrics.length,
    rows:result.manifest.rows.length,
    physicalCuts:result.manifest.rows.reduce((sum,r)=>sum+r.nativeCutInstances,0),
    reinspection:true,forgedReceiptRefused:true,
    wrongWidthRefused:true,untrustedOriginRefused:true,
    staleRevisionRefused:true,
    cuttingAuthorized:false,factoryApproved:false}))
}finally{
  child.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    sleep(2000),
  ])
  if(child.exitCode===null)child.kill('SIGKILL')
  fs.rmSync(folder,{recursive:true,force:true})
}
