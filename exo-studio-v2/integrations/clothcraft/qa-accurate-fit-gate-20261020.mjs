// Disposable native Rust QA. This exercises optional fit acceptance; no UI,
// installed application, existing garment or production workspace is touched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const temp=mkdtempSync(path.join(tmpdir(),'exo-accurate-fit-gate-'))
const child=spawn(bin,[avatar,path.join(temp,'qa-private-project.json')],{
 cwd:root,env:{...process.env,EXO_CLOTHCRAFT_GPU:'0',RAYON_NUM_THREADS:'2'},stdio:['pipe','pipe','pipe']
})
let pending,stderr=''
child.stderr.on('data',d=>stderr+=d.toString())
createInterface({input:child.stdout}).on('line',line=>{
 const current=pending;pending=null
 if(!current)return
 try{current.resolve(JSON.parse(line))}catch(e){current.reject(e)}
})
const request=command=>new Promise((resolve,reject)=>{
 assert(!pending,'Concurrent QA native requests are not allowed')
 const t=setTimeout(()=>{pending=null;reject(Error('Native QA timeout '+stderr.slice(-450)))},45000)
 pending={resolve(x){clearTimeout(t);resolve(x)},reject(x){clearTimeout(t);reject(x)}}
 child.stdin.write(JSON.stringify(command)+'\n')
})
const ok=async command=>{
 const result=await request(command)
 assert(result.ok,JSON.stringify({command,error:result.error}))
 return result.data
}
const fail=async(command,message)=>{
 const result=await request(command)
 assert.equal(result.ok,false,'Expected quality gate to reject '+JSON.stringify(command))
 assert.match(result.error,new RegExp(message))
 return result.error
}
let report={pass:false,isolated:true,binary:bin,requestScheme:'fitGate optional, CPU-only'}
try{
 let s=await ok({op:'open',preset:'tshirt'})
 const original=structuredClone(s.positions),originalTime=s.time,revision=s.revision
 const validateUnchanged=async()=>{
  const now=await ok({op:'snapshot'})
  assert.equal(now.revision,revision,'Revision changed after rejected step')
  assert.equal(now.time,originalTime,'Simulation time changed after rejected step')
  assert.deepEqual(now.positions,original,'Physical vertices changed despite failed fit gate')
 }
 await fail({op:'step',revision,steps:1,fitGate:{maxExtensionP95Percent:-1}},'fitGate')
 await validateUnchanged()
 const seamError=await fail({op:'step',revision,steps:4,fitGate:{maxSeamGapMm:0}},'Fit gate rejected')
 await validateUnchanged()
 const strainError=await fail({op:'step',revision,steps:1,fitGate:{maxExtensionP95Percent:5}},'P95 material extension')
 await validateUnchanged()
 const missingDart=await fail({op:'step',revision,steps:1,fitGate:{maxDartGapMm:2}},'needs a physical dart')
 await validateUnchanged()
 const permitted=await ok({op:'step',revision,steps:1,fitGate:{maxExtensionP95Percent:1000,maxExtensionMaxPercent:1000,maxSeamGapMm:1000}})
 assert.equal(permitted.revision,revision+1)
 assert(permitted.time>originalTime)
 const stretch=permitted.metrics?.extension_p95_percent
 assert(Number.isFinite(stretch),'No simulated material stretch metric')
 const nativeContactDistance=permitted.metrics?.minimum_distance_m
 assert(Number.isFinite(nativeContactDistance),'No native contact metric')
 // Exact per-frame geometric validation is intentionally optional: report
 // if it rejects this scene rather than pretending all scenes are clear.
 const triangle=await request({op:'step',revision:permitted.revision,steps:1,
  fitGate:{rejectTriangleCrossings:true,maxExtensionP95Percent:1000}})
 const afterTriangle=await ok({op:'snapshot'})
 if(triangle.ok){
  assert.equal(afterTriangle.revision,permitted.revision+1)
 }else{
  assert.match(triangle.error,/triangle|contact|OGC/i)
  assert.equal(afterTriangle.revision,permitted.revision)
  assert.deepEqual(afterTriangle.positions,permitted.positions)
 }
 const saved=await ok({op:'save'})
 const reopened=await ok({op:'open',project:saved.project})
 assert.deepEqual(reopened.positions,afterTriangle.positions,'Save and reopen changed fit geometry')
 report={...report,pass:true,invalidThresholdRejected:true,
  multiStepSeamRejectionRestoresWholeBatch:true,missingDartRejected:true,
  seamRejection:seamError,strainRejection:strainError,materialStretchP95PercentAfterOneStep:stretch,
  nativeContactMinimumDistanceMm:nativeContactDistance*1000,
  perFrameTriangleGuard:{accepted:triangle.ok,error:triangle.error||null,
    statePreservedOnRejection:!triangle.ok},
  originalRevision:revision,permissiveRevision:permitted.revision,
  reopened:true}
 console.log(JSON.stringify(report,null,2))
}catch(err){
 console.error(JSON.stringify({...report,error:String(err.stack||err),nativeStderr:stderr.slice(-900)},null,2))
 process.exitCode=1
}finally{
 child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM')
 rmSync(temp,{recursive:true,force:true})
}
