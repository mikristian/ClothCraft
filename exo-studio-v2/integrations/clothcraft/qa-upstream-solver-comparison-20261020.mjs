// Bounded native CPU comparison: BOTH executables receive the same saved
// template/rest-state JSON. No network, installed backend, or personal files.
// Example: node this-script.mjs /tmp/.../baseline-exo-session /tmp/.../candidate-exo-session
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'

const [baselineBin,candidateBin]=process.argv.slice(2)
const candidateFirst=process.argv.includes('--candidate-first')
assert(baselineBin&&candidateBin&&existsSync(baselineBin)&&existsSync(candidateBin),'Supply two already compiled native executables')
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const tmp=mkdtempSync(path.join(tmpdir(),'exo-upstream-solver-compare-'))
const sha=data=>crypto.createHash('sha256').update(data).digest('hex')
const digest=bin=>sha(readFileSync(bin))
const h=process.hrtime.bigint
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
const p95=values=>[...values].sort((a,b)=>a-b)[Math.ceil(.95*values.length)-1]
async function session(bin,label){
 const child=spawn(bin,[avatar,path.join(tmp,label+'.json')],{
  cwd:root,stdio:['pipe','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2',EXO_CLOTHCRAFT_GPU:'0'}
 })
 let pending,stderr='',dead=false
 child.stderr.on('data',d=>{stderr+=d.toString().slice(0,900)})
 child.on('exit',()=>{dead=true;pending?.reject(Error('Native process exited: '+stderr.slice(-400)))})
 createInterface({input:child.stdout}).on('line',line=>{
  const wait=pending;pending=undefined
  if(!wait)return
  try{const result=JSON.parse(line);result.ok?wait.resolve(result.data):wait.reject(Error(result.error||line))}
  catch(err){wait.reject(err)}
 })
 const rpc=req=>new Promise((resolve,reject)=>{
  assert(!pending&&!dead,'RPC overlap / terminated Rust session')
  const timer=setTimeout(()=>{pending=undefined;reject(Error('Native request timed out: '+req.op+' '+stderr.slice(-250)))},45000)
  pending={resolve(v){clearTimeout(timer);resolve(v)},reject(err){clearTimeout(timer);reject(err)}}
  child.stdin.write(JSON.stringify(req)+'\n')
 })
 return {rpc,close(){child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM')},stderr:()=>stderr}
}
function shape(s){
 const points=s.positions.map(p=>p.map(Number))
 assert(points.length>0&&points.every(p=>p.length===3&&p.every(Number.isFinite)),'Nonfinite material state')
 return sha(JSON.stringify({uv:s.uv,triangles:s.triangles,positions:s.positions}))
}
const report={scenario:'identical saved native project, CPU, 2 Rayon workers, 16 VBD sweeps, dt=1/60s',
  binarySha256:{baseline:digest(baselineBin),candidate:digest(candidateBin)},
  temporaryOnly:true,steps:10,discardFirstTiming:true,
  executionOrder:candidateFirst?'candidate then baseline':'baseline then candidate'}
const sessions=[]
try{
 const first=await session(baselineBin,'baseline');sessions.push(first)
 let s=await first.rpc({op:'open',preset:'tshirt',revision:0})
 const cloth=s.template.fabrics[0].id
 s=await first.rpc({op:'edit',revision:s.revision,command:{
  kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric:cloth
 }})
 const panel=s.template.panels.at(-1),polygon=panel.polygon
 const a=polygon.points[0],b=polygon.points[1],len=Math.hypot(b[0]-a[0],b[1]-a[1])
 const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2
 s=await first.rpc({op:'edit',revision:s.revision,command:{
  kind:'DartCutSew',panel:panel.id,edge:polygon.edges[0],
  left_t:.5-.015/len,right_t:.5+.015/len,apex:[mx,my+.08]
 }})
 const project=(await first.rpc({op:'save'})).project
 assert(project?.template?.panels?.length,'No serialized input project')
 report.sourceTemplateSha256=sha(JSON.stringify(project.template))
 const second=await session(candidateBin,'candidate');sessions.push(second)
 const runs=[]
 const order=candidateFirst?[['candidate',second],['baseline',first]]:[['baseline',first],['candidate',second]]
 for(const [label,proc] of order){
  let current=await proc.rpc({op:'open',project,revision:label==='baseline'?s.revision:0})
  const before=shape(current)
  const initial=current.dartFit?.[0]
  assert(initial&&Number.isFinite(initial.maxGapMm),'Physical dart lacks native fit metrics')
  const times=[]
  const nativeMs=[]
  let rejected=null
  for(let i=0;i<10;i++){
   const t=h()
   try{current=await proc.rpc({op:'step',revision:current.revision,steps:1})}
   catch(err){rejected=String(err);break}
   const elapsed=Number(h()-t)/1e6
   if(i>0){times.push(elapsed);nativeMs.push(Number(current.metrics?.step_ms))}
  }
  assert.equal(rejected,null,'Native physics step rejected in '+label+': '+rejected)
  assert(times.length===9&&nativeMs.every(Number.isFinite),'Insufficient accepted physics steps')
  const last=current.dartFit?.[0]
  assert(last&&Number.isFinite(last.maxGapMm),'Final dart gap missing')
  runs.push({
   label,startingGeometrySha256:before,startingRevision:current.revision-10,
   endingRevision:current.revision,initialDartGapMm:initial.maxGapMm,
   finalDartGapMm:last.maxGapMm,finalDartRmsMm:last.rmsGapMm,
   globalGapMm:current.metrics?.max_seam_gap_m*1000,
   stretchP95Percent:current.metrics?.extension_p95_percent,
   finalContactCount:current.metrics?.contacts,
   finalContactMinDistanceMm:current.metrics?.minimum_distance_m*1000,
   medianWallMs:median(times),p95WallMs:p95(times),
   medianNativeStepMs:median(nativeMs),p95NativeStepMs:p95(nativeMs),
   final3dVertices:current.positions.length,triangles:current.triangles.length,
  })
 }
 report.runs=runs.sort((a,b)=>a.label.localeCompare(b.label))
 report.identicalStartingPositionsAndTopology=runs[0].startingGeometrySha256===runs[1].startingGeometrySha256
 report.candidateToBaselineMedianWallRatio=runs[1].medianWallMs/runs[0].medianWallMs
 report.candidateToBaselineMedianNativeRatio=runs[1].medianNativeStepMs/runs[0].medianNativeStepMs
 report.pass=true
 console.log(JSON.stringify(report,null,2))
}catch(err){
 report.pass=false;report.failure=String(err.stack||err)
 console.error(JSON.stringify(report,null,2));process.exitCode=1
}finally{
 for(const p of sessions)p.close()
 rmSync(tmp,{recursive:true,force:true})
}
