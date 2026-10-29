// Matched experimental native tee assembly comparison. No project save, UI
// edits, source pattern mutation or installed app writes. Built-in Rust native
// previews remain off-body only; this cannot certify fitting or swept CCD.
// Run: node integrations/clothcraft/qa-tee-avbd-stage-comparison-20261021.mjs
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

const root=process.cwd()
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const workspace=mkdtempSync(path.join(tmpdir(),'exo-tee-compare-'))
const child=spawn(bin,[avatar,path.join(workspace,'private-project.json')],{
  cwd:root,env:{...process.env,RAYON_NUM_THREADS:'2',EXO_CLOTHCRAFT_GPU:'0'},stdio:['pipe','pipe','pipe'],
})
let errorStream='',pending=null
child.stderr.on('data',data=>{errorStream+=data.toString()})
const source=createInterface({input:child.stdout})
source.on('line',line=>{
  const current=pending
  pending=null
  if(!current)return
  try{current.resolve(JSON.parse(line))}catch(error){current.reject(error)}
})
child.on('exit',()=>{
  pending?.reject(new Error(`Native executable terminated: ${errorStream.slice(-500)}`))
  pending=null
})
const call=async request=>{
  assert.equal(pending,null,'Only one command may run at once')
  const response=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending=null;reject(new Error(`Native timeout: ${request.op}`))},90_000)
    pending={resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}}
    child.stdin.write(`${JSON.stringify(request)}\n`)
  })
  assert.equal(response.ok,true,JSON.stringify({request,error:response.error}))
  return response.data
}

const policies=[
  {name:'constrained-vbd-20',rigidRegistrationSteps:0,nonrigidSeamSweeps:0,nonrigidFabricRings:0,nonrigidRegistrationSteps:0},
  {name:'rigid40-vbd20',rigidRegistrationSteps:40,nonrigidSeamSweeps:0,nonrigidFabricRings:0,nonrigidRegistrationSteps:0},
  {name:'rigid40-nonrigid10-two-rings-vbd20',rigidRegistrationSteps:40,nonrigidSeamSweeps:1,nonrigidFabricRings:2,nonrigidRegistrationSteps:10},
]
const results=[]
try {
  const opened=await call({op:'open',preset:'tshirt'})
  const before=await call({op:'snapshot'})
  assert.equal(opened.revision,before.revision)
  for(const candidate of policies){
    const {name,...settings}=candidate
    const start=process.hrtime.bigint()
    const outcome=await call({op:'preassemble-preview',revision:before.revision,
      steps:20,strainLimitPercent:5,fromRest:true,...settings})
    const wallMs=Number(process.hrtime.bigint()-start)/1e6
    assert.equal(outcome.format,'exo-offbody-assembly-preview.v1')
    assert.equal(outcome.committed,false)
    assert.equal(outcome.sweptContactCertified,false)
    assert.equal(outcome.avatarReentryValidated,false)
    assert.equal(outcome.stagedAvatarEndpointChecked,true)
    assert.equal(outcome.stepsAccepted,20)
    assert.ok(outcome.principalExtensionMaxPercent <= 5.0001)
    assert.ok(outcome.finalSeamGapMm < outcome.initialSeamGapMm)
    assert.ok(outcome.finalSeamGapMm <= outcome.terminalSeamGapMm+1e-6)
    assert.equal(outcome.positions.length,before.positions.length)
    const after=await call({op:'snapshot'})
    assert.equal(after.revision,before.revision,'Preview changed document revision')
    assert.equal(after.time,before.time,'Preview changed simulation clock')
    assert.deepEqual(after.positions,before.positions,'Preview changed live cloth state')
    results.push({name,wallMs:+wallMs.toFixed(1),
      initialMaxGapMm:outcome.initialSeamGapMm,
      postRegistrationGapMm:outcome.postRegistrationSeamGapMm,
      finalMaxGapMm:outcome.finalSeamGapMm,
      finalRmsGapMm:outcome.finalSeamRmsMm,
      principalExtensionMaxPercent:outcome.principalExtensionMaxPercent,
      acceptedRigidRegistrations:outcome.rigidRegistrationAccepted,
      acceptedNonrigidRegistrations:outcome.nonrigidRegistrationAccepted,
      acceptedDynamicNonrigidBlocks:outcome.nonrigidBlockAccepted,
      rejectedDynamicStrainTrials:outcome.nonrigidDynamicRejectionDiagnostics?.strainTrials,
      fitApproved:false,avatarReentryValidated:false,continuousCollisionCertified:false})
  }
  assert.equal(new Set(results.map(row=>row.initialMaxGapMm)).size,1,'Fixture changed between candidates')
  assert.ok(results[2].finalMaxGapMm < results[1].finalMaxGapMm,
    'Hybrid regression: the independently registered off-body trial must beat rigid-only on this fixture')
  assert.ok(results[1].finalMaxGapMm < results[0].finalMaxGapMm,
    'Rigid-registration research pass failed to beat default controlled VBD')
  const summary={pass:true,experimental:true,readOnly:true,saveRoundTripChecked:false,
    liveGarmentUnchanged:true,uiUnchanged:true,
    comparison:'same native binary, same T-shirt, 20 constrained VBD steps; registration has additional work',
    baselineMaxGapMm:results[0].finalMaxGapMm,
    bestMaxGapMm:results[2].finalMaxGapMm,
    savedMaxGapMm:results[0].finalMaxGapMm-results[2].finalMaxGapMm,
    canPromoteToProduction:false,reason:'open seams; off-body avatar entry and swept CCD unverified',
    results}
  console.log(JSON.stringify(summary,null,2))
} catch(error){
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),stderr:errorStream.slice(-600)},null,2))
  process.exitCode=1
} finally {
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
  rmSync(workspace,{recursive:true,force:true})
}
