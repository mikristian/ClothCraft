#!/usr/bin/env node
// Read-only, deterministic native CPU VBD/OGC characterization. No solver edits.
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {createHash} from 'node:crypto'
import {readFile, mkdir, writeFile} from 'node:fs/promises'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..')
const binary=resolve(process.env.EXO_PHYSICS_BINARY||`${root}/research/oss/clothcraft/target/debug/exo-session`)
const gpuRequested=process.env.EXO_PHYSICS_GPU==='1'
const avatar=resolve(process.env.EXO_PHYSICS_AVATAR||`${root}/research/oss/clothcraft/assets/makehuman/mannequin.obj`)
const output=resolve(process.env.EXO_PHYSICS_OUTPUT||`${root}/docs/physics-lab/${gpuRequested?'smoke-gpu':'baseline-cpu'}.json`)
const steps=Number(process.env.EXO_PHYSICS_STEPS||3)
if(!Number.isSafeInteger(steps)||steps<1||steps>100)throw Error('EXO_PHYSICS_STEPS must be integer in [1,100]')
const thresholds={max_seam_gap_m:0.025,extension_p95_percent:15,extension_max_percent:60,minimum_distance_m:0.0}
const cases=gpuRequested?[{id:'tshirt-gpu-smoke',preset:'tshirt'}]:[{id:'tshirt',preset:'tshirt'},{id:'dress',preset:'dress'},{id:'tshirt-repeat',preset:'tshirt'}]
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const maxSeamGap=seams=>Array.isArray(seams)&&seams.length&&seams.every(s=>finite(s.gap_m))?Math.max(...seams.map(s=>s.gap_m)):null
function evaluate(series){
 const result={}
 for(const [key,threshold] of Object.entries(thresholds)){
  const values=series.map(s=>s?.[key]);
  const valid=values.every(finite)
  const observed=valid?(key==='minimum_distance_m'?Math.min(...values):Math.max(...values)):null
  result[key]={value:observed,threshold,status:!valid?'inconclusive':key==='minimum_distance_m'?(observed>=threshold?'pass':'fail'):(observed<=threshold?'pass':'fail')}
 }
 result.contact_penetration_m={value:null,status:'inconclusive',reason:'VBD session reports minimum_distance_m but no independently evaluated penetration depth'}
 return result
}
async function runCase(test){
 const child=spawn(binary,[avatar,...(gpuRequested?['--gpu']:[])],{cwd:dirname(binary),stdio:['pipe','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2'}})
 const pending=[];let stderr='';let closed=false
 child.stderr.on('data',d=>stderr+=String(d).slice(0,8192))
 createInterface({input:child.stdout}).on('line',line=>{const next=pending.shift();if(next){try{next.resolve(JSON.parse(line))}catch(e){next.reject(e)}}})
 child.on('error',e=>{closed=true;for(const p of pending.splice(0))p.reject(e)})
 child.on('exit',code=>{closed=true;for(const p of pending.splice(0))p.reject(Error(`native session exit ${code}: ${stderr.slice(-500)}`))})
 const send=obj=>new Promise((res,rej)=>{if(closed)return rej(Error('native session closed'));pending.push({resolve:res,reject:rej});child.stdin.write(`${JSON.stringify(obj)}\n`)})
 try{
  let response=await send({op:'open',preset:test.preset});if(!response.ok)throw Error(response.error)
  let data=response.data;const initial={vertices:data.positions?.length,triangles:data.triangles?.length,seams:data.seams?.length,backend:data.backend,time_s:data.time,max_seam_gap_m:maxSeamGap(data.seams)}
  const series=[]
  let previousPositions=data.positions
  let previousTime=data.time
  const timeTrajectory=[{step:0,time_s:data.time,max_seam_gap_m:initial.max_seam_gap_m,phase:'initial_separated_assembly'}]
  for(let i=0;i<steps;i++){
   response=await send({op:'step',revision:data.revision,steps:1});if(!response.ok)throw Error(`step ${i+1}: ${response.error}`)
   data=response.data;series.push({...data.metrics,...(data.actualStepBackend !== undefined ? {actualStepBackend:data.actualStepBackend} : {}),...(data.gpuCpuFallbackCount !== undefined ? {gpuCpuFallbackCount:data.gpuCpuFallbackCount} : {})})
   if(!data.positions?.every(p=>Array.isArray(p)&&p.length===3&&p.every(finite)))throw Error(`nonfinite positions at step ${i+1}`)
   if(data.positions.length!==previousPositions.length)throw Error(`unexpected mesh vertex count at step ${i+1}`)
   const stepDt=data.time-previousTime
   if(!finite(stepDt)||stepDt<=0)throw Error(`invalid physics dt at step ${i+1}`)
   let maxSquared=0,totalSquared=0
   for(let p=0;p<data.positions.length;p++){
    const d=data.positions[p].reduce((sum,v,k)=>sum+(v-previousPositions[p][k])**2,0)
    maxSquared=Math.max(maxSquared,d);totalSquared+=d
   }
   const maximumSpeedMps=Math.sqrt(maxSquared)/stepDt
   const rmsSpeedMps=Math.sqrt(totalSquared/data.positions.length)/stepDt
   timeTrajectory.push({step:i+1,time_s:data.time,max_seam_gap_m:maxSeamGap(data.seams),solver_max_seam_gap_m:data.metrics?.max_seam_gap_m??null,extension_p95_percent:data.metrics?.extension_p95_percent??null,contacts:data.metrics?.contacts??null,...(data.actualStepBackend !== undefined ? {actualStepBackend:data.actualStepBackend} : {}),...(data.gpuCpuFallbackCount !== undefined ? {gpuCpuFallbackCount:data.gpuCpuFallbackCount} : {}),max_cloth_speed_mps:maximumSpeedMps,rms_cloth_speed_mps:rmsSpeedMps})
   previousPositions=data.positions;previousTime=data.time
  }
  return {id:test.id,preset:test.preset,status:'initial_assembly_transient_measured',equilibriumEstablished:false,fitDefectEstablished:false,initial,steps,final_time_s:data.time,timeTrajectory,metrics:evaluate(series),lastStep:series.at(-1),trajectory:series.map((m,i)=>({step:i+1,...m}))}
 }catch(e){return{id:test.id,preset:test.preset,status:'inconclusive',error:String(e),stepsCompleted:0}}
 finally{child.stdin.end();child.kill('SIGTERM')}
}
const [binaryData,avatarData]=await Promise.all([readFile(binary),readFile(avatar)])
const tests=[];for(const test of cases)tests.push(await runCase(test))
const stable=series=>JSON.stringify(series.map(m=>Object.fromEntries(['time_s','dt_s','iterations','contacts','contact_terms','minimum_distance_m','max_seam_gap_m','extension_p95_percent','extension_max_percent','residual_rms_n','truncated_vertices'].map(k=>[k,m[k]??null]))))
const pair=tests.filter(t=>t.preset==='tshirt')
const repeatability=pair.length===2&&pair.every(t=>t.status==='initial_assembly_transient_measured')?{status:stable(pair[0].trajectory)===stable(pair[1].trajectory)?'pass':'fail',comparison:'Selected physical values and counts per step, exact JSON values; wall-clock timings excluded'}:{status:'not_applicable',reason:'Single-case GPU smoke does not measure repeatability'}
const report={schema:'exo.physics-lab.v2',phase:'initial_assembly_transient',equilibriumEstablished:false,fitDefectEstablished:false,releaseGate:false,interpretation:`Separated panels start with large initial seam gaps. ${steps} simulated steps without independent physical-contact and velocity/residual equilibrium verification cannot establish a converged garment fit, defective seam solver, or release failure. Per-step vertex speeds are observed, not proof of equilibrium.`,backendClaim:'Native exo-session snapshot backend field; GPU selection is not independently attested',requestedBackend:gpuRequested?'gpu':'cpu',actualBackendReported:tests.map(t=>t.initial?.backend??null),execution:gpuRequested?'GPU requested (--gpu), single garment smoke':'CPU default (no --gpu)',binary,avatar,binarySha256:createHash('sha256').update(binaryData).digest('hex'),sourceSha256:createHash('sha256').update(await readFile(`${root}/integrations/clothcraft/exo-session.rs`)).digest('hex'),sourceHashNote:'Current working-tree source fingerprint only; provenance of prebuilt executable cannot be independently established',avatarSha256:createHash('sha256').update(avatarData).digest('hex'),crossBackendSpeedComparison:'prohibited_without_verified_same_source_build_fixture_settings_and_executable',thresholds,thresholdPolicy:'Provisional engineering screening thresholds for future settled-state runs only. Transient exceedances are diagnostic observations, not release failures, fit certification, or evidence of faulty seam enforcement.',cases:tests,repeatability,screeningObservations:tests.map(t=>({case:t.id,transientExceedances:t.metrics?Object.entries(t.metrics).filter(([,v])=>v.status==='fail').map(([k])=>k):[],assessment:'transient_only'})),overall:tests.some(t=>t.status==='inconclusive')?'inconclusive':'transient_observed_equilibrium_inconclusive',fitCertified:false}
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output,overall:report.overall,cases:tests.map(t=>({id:t.id,status:t.status,metrics:t.metrics,error:t.error}))},null,2))
