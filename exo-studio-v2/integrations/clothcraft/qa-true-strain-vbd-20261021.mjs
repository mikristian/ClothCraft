// Real native CPU solver A/B from identical temporary garment states.
// Never opens installed app, installed backend or personal workspace.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const stepCount=Number(process.env.EXO_STRAIN_STEPS||1)
assert(Number.isInteger(stepCount)&&stepCount>=1&&stepCount<=50,'Only 1–50 bounded CPU steps supported')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const temp=mkdtempSync(path.join(tmpdir(),'exo-true-strain-vbd-'))
async function native(label){
 const child=spawn(bin,[avatar,path.join(temp,label+'.json')],{cwd:root,stdio:['pipe','pipe','pipe'],
  env:{...process.env,RAYON_NUM_THREADS:'2',EXO_CLOTHCRAFT_GPU:'0'}})
 let wait=null,stderr=''
 child.stderr.on('data',buf=>stderr+=buf.toString())
 child.on('exit',()=>wait?.reject(Error('EXO native process exited '+stderr.slice(-350))))
 createInterface({input:child.stdout}).on('line',line=>{
  const w=wait;wait=null;if(!w)return
  try{w.resolve(JSON.parse(line))}catch(e){w.reject(e)}
 })
 return {
  async rpc(op){
   assert(!wait,'Native requests cannot overlap')
   const r=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{wait=null;reject(Error('Native timeout '+stderr.slice(-500)))},60000)
    wait={resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}}
    child.stdin.write(JSON.stringify(op)+'\n')
   })
   return r
  },
  close(){child.stdin.end();if(child.exitCode==null)child.kill('SIGTERM')}
 }
}
const runs=[]
try{
 for (const [label,fitGate] of [['interactive',undefined],['strainLimited5', {strainLimitPercent:5,rejectTriangleCrossings:true}]]) {
  const client=await native(label)
  try{
   const start=await client.rpc({op:'open',preset:'tshirt'})
   assert(start.ok,JSON.stringify(start))
   const original=start.data
   let result,trace=[],state=original
   for(let i=0;i<stepCount;i++){
    result=await client.rpc({op:'step',revision:state.revision,steps:1, ...(fitGate?{fitGate}:{})})
    if(!result.ok)break
    state=result.data
    trace.push({step:i+1,seamGapMm:state.metrics.max_seam_gap_m*1000,
     principalExtension:state.metrics.principal_extension_max_percent,
     fiberMax:state.metrics.extension_max_percent,
     rigidPanelShiftMm:(state.metrics.rigid_panel_seam_shift_max_m||0)*1000,
     contacts:state.metrics.contacts})
   }
   const snap=await client.rpc({op:'snapshot'})
   assert(snap.ok,'Snapshot unavailable after physics step')
   if(result.ok){
    const d=result.data
    assert.deepEqual(d.positions,snap.data.positions)
    assert(d.revision>original.revision)
    const m=d.metrics
    runs.push({label,accepted:true,completedSteps:trace.length,trace,p95StretchPercent:m.extension_p95_percent,
     maxFiberStretchPercent:m.extension_max_percent,
     maxPrincipalExtensionPercent:m.principal_extension_max_percent,
     strainClampedVertices:m.strain_limited_vertices,
     rigidPanelShiftMm:(m.rigid_panel_seam_shift_max_m||0)*1000,
     nativeStepMs:m.step_ms,seamGapMm:m.max_seam_gap_m*1000,
     contactCount:m.contacts,simulatedSeconds:d.time,
     positions:d.positions.length})
   }else{
    assert.equal(snap.data.revision,state.revision,'Failed step changed revision')
    assert.deepEqual(snap.data.positions,state.positions,'Failed step changed garment geometry')
    runs.push({label,accepted:false,completedSteps:trace.length,trace,error:result.error,rollbackPreserved:true})
   }
  }finally{client.close()}
 }
 const standard=runs[0],strict=runs[1]
 assert(standard.accepted,'Baseline T-shirt must simulate')
 assert(standard.p95StretchPercent>5,'Test fixture has insufficient unconstrained stretching')
 assert(strict.accepted,'Bounded solver failed to advance a clean starting T-shirt: '+strict.error)
 assert(strict.maxPrincipalExtensionPercent<=5.00001,'Actual principal stretch exceeds requested 5%')
 assert(strict.maxFiberStretchPercent<=5.0001,'Material fiber stretch exceeds principal bound')
 assert(strict.strainClampedVertices>0,'Bounded solver did not modify any trial')
 assert(strict.contactCount>=0&&Number.isFinite(strict.seamGapMm))
 const report={pass:true,feature:'CPU VBD per-vertex spectral material-strain constraint',
  fixture:'T-shirt preset; identical rest state; '+stepCount+' physics step(s), two Rayon workers',
  userProjectUnchanged:true,installedAppUnchanged:true,runs}
 console.log(JSON.stringify(report,null,2))
}catch(e){console.error(JSON.stringify({pass:false,error:String(e.stack||e),runs},null,2));process.exitCode=1}
finally{rmSync(temp,{recursive:true,force:true})}
