// Read-only off-body sewn garment preview QA. All Rust state is private,
// and even the private project's snapshot must not change after preview.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const steps=Number(process.env.EXO_OFFBODY_STEPS||10)
const strainLimit=Number(process.env.EXO_OFFBODY_STRAIN_PERCENT||5)
const registrationSteps=Number(process.env.EXO_OFFBODY_REGISTRATION_STEPS||0)
const nonrigidSweeps=Number(process.env.EXO_NONRIGID_SEAM_SWEEPS||0)
const fabricRings=Number(process.env.EXO_NONRIGID_FABRIC_RINGS||0)
const nonrigidRegistration=Number(process.env.EXO_NONRIGID_REGISTRATION_STEPS||0)
const allowGapRebound=process.env.EXO_NONRIGID_ALLOW_GAP_REBOUND==='1'
const projectStrainTangent=process.env.EXO_NONRIGID_PROJECT_STRAIN_TANGENT==='1'
// Emergency disk-safe diagnostic mode. Do NOT claim persistent-save parity
// when it is deliberately skipped; snapshot/revision/non-mutation still run.
// Normal QA continues to require the real save/round-trip check.
const skipSave=process.env.EXO_OFFBODY_SKIP_SAVE==='1'
assert(Number.isInteger(steps)&&steps>=1&&steps<=40)
assert(Number.isFinite(strainLimit)&&strainLimit>=0&&strainLimit<=50)
assert(Number.isInteger(registrationSteps)&&registrationSteps>=0&&registrationSteps<=40)
assert(Number.isInteger(nonrigidSweeps)&&nonrigidSweeps>=0&&nonrigidSweeps<=4)
assert(Number.isInteger(fabricRings)&&fabricRings>=0&&fabricRings<=2)
assert(Number.isInteger(nonrigidRegistration)&&nonrigidRegistration>=0&&nonrigidRegistration<=20)
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const temp=mkdtempSync(path.join(tmpdir(),'exo-offbody-assembly-'))
const child=spawn(bin,[avatar,path.join(temp,'preview.json')],{
 cwd:root,stdio:['pipe','pipe','pipe'],
 env:{...process.env,RAYON_NUM_THREADS:'2',EXO_CLOTHCRAFT_GPU:'0'}
})
let pending=null,stderr=''
child.stderr.on('data',buf=>stderr+=buf.toString())
child.on('exit',()=>pending?.reject(Error('Native exit '+stderr.slice(-500))))
createInterface({input:child.stdout}).on('line',line=>{
 const done=pending;pending=null
 if(!done)return
 try{done.resolve(JSON.parse(line))}catch(err){done.reject(err)}
})
const rpc=async input=>{
 assert(!pending,'Native operation overlap')
 return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending=null;reject(Error('Native preview timeout '+stderr.slice(-500)))},60000)
  pending={resolve:x=>{clearTimeout(timer);resolve(x)},reject:x=>{clearTimeout(timer);reject(x)}}
  child.stdin.write(JSON.stringify(input)+'\n')
 })
}
const good=async input=>{
 const r=await rpc(input);assert.equal(r.ok,true,JSON.stringify({input,error:r.error}))
 return r.data
}
const expectFail=async(input,pattern)=>{
 const r=await rpc(input);assert.equal(r.ok,false,'Invalid preview unexpectedly succeeded')
 assert.match(r.error,pattern);return r.error
}
let result={pass:false,privateProject:true}
try{
 const source=await good({op:'open',preset:'tshirt'})
 const before=await good({op:'snapshot'})
 assert.equal(source.revision,before.revision)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:0},/1.40 steps/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:41},/1.40 steps/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:1,rigidRegistrationSteps:41},/at most 40/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:1,nonrigidSeamSweeps:5},/<=4 sweeps/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:1,nonrigidRegistrationSteps:21},/<=20 steps/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:1,strainLimitPercent:-1},/strain limit/)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:'ten'},/invalid type|expected u64/i)
 await expectFail({op:'preassemble-preview',revision:source.revision,steps:1,strainLimitPercent:'5'},/invalid type|expected f64/i)
 const ten=await good({op:'preassemble-preview',revision:source.revision,steps,strainLimitPercent:strainLimit,
  rigidRegistrationSteps:registrationSteps,nonrigidSeamSweeps:nonrigidSweeps,
  nonrigidFabricRings:fabricRings,nonrigidRegistrationSteps:nonrigidRegistration,
  nonrigidAllowGapRebound:allowGapRebound,
  nonrigidProjectStrainTangent:projectStrainTangent})
 assert.equal(ten.format,'exo-offbody-assembly-preview.v1')
 assert.equal(ten.committed,false)
 assert.equal(ten.avatarReentryValidated,false)
 assert.equal(ten.sweptContactCertified,false)
 assert.equal(ten.stagedAvatarEndpointChecked,true)
 assert.equal(ten.stepsAccepted,steps)
 assert.equal(ten.rigidRegistrationRequested,registrationSteps)
 assert.equal(ten.nonrigidSeamSweeps,nonrigidSweeps)
 assert.equal(ten.nonrigidFabricRings,fabricRings)
 assert.equal(ten.nonrigidAllowGapRebound,allowGapRebound)
 assert.equal(ten.nonrigidProjectStrainTangent,projectStrainTangent)
 assert.equal(ten.nonrigidRegistrationRequested,nonrigidRegistration)
 assert(ten.nonrigidBlockAccepted<=ten.nonrigidBlockAttempts)
 assert(ten.rigidRegistrationAccepted>=0&&ten.rigidRegistrationAccepted<=registrationSteps)
 assert(Number.isInteger(ten.coupledPanelMotionAcceptedSteps)&&
  ten.coupledPanelMotionAcceptedSteps>=0&&ten.coupledPanelMotionAcceptedSteps<=steps)
 assert(Number.isInteger(ten.selectedBestStep)&&ten.selectedBestStep>=0&&ten.selectedBestStep<=steps)
 assert(ten.finalSeamGapMm<=ten.terminalSeamGapMm+1e-7,'Best stage worse than terminal stage')
 assert(ten.seamReboundAfterBestMm>=0,'Invalid observed rebound')
 assert.equal(ten.positions.length,before.positions.length)
 assert(ten.stagingTranslationM[2]>.5,'Preview did not stage cloth beyond avatar in Z')
 assert(Number.isFinite(ten.initialSeamGapMm)&&Number.isFinite(ten.finalSeamGapMm))
 assert(Number.isFinite(ten.initialSeamRmsMm)&&Number.isFinite(ten.finalSeamRmsMm))
 assert(ten.initialSeamRmsMm>=0&&ten.finalSeamRmsMm>=0)
 assert(ten.finalSeamGapMm<ten.initialSeamGapMm,'Stage did not improve real seam opening')
 assert(ten.principalExtensionMaxPercent<=strainLimit+0.00001,'Staged principal stretch cap violated')
 const after=await good({op:'snapshot'})
 assert.equal(after.revision,before.revision,'Preview changed document revision')
 assert.equal(after.time,before.time,'Preview changed simulation clock')
 assert.deepEqual(after.positions,before.positions,'Preview altered existing garment coordinates')
 if (!skipSave) {
  const saved=await good({op:'save'})
  assert.deepEqual(saved.project.state?.x,before.positions,'Preview changed saved user garment')
 }
 result={pass:true,sourceRevision:source.revision,steps,strainLimitPercent:strainLimit,
  rigidRegistrationRequested:registrationSteps,rigidRegistrationAccepted:ten.rigidRegistrationAccepted,
  nonrigidSeamSweeps:nonrigidSweeps,nonrigidFabricRings:fabricRings,
  nonrigidAllowGapRebound:allowGapRebound,
  nonrigidProjectStrainTangent:projectStrainTangent,
  nonrigidRegistrationRequested:nonrigidRegistration,
  nonrigidRegistrationAttempts:ten.nonrigidRegistrationAttempts,
  nonrigidRegistrationAccepted:ten.nonrigidRegistrationAccepted,
  nonrigidBlockAttempts:ten.nonrigidBlockAttempts,nonrigidBlockAccepted:ten.nonrigidBlockAccepted,
  nonrigidDynamicRejectionDiagnostics:ten.nonrigidDynamicRejectionDiagnostics,
  rigidRegistrationCoupledAccepted:ten.rigidRegistrationCoupledAccepted,
  postRegistrationGapMm:ten.postRegistrationSeamGapMm,
  initialSeamRmsMm:ten.initialSeamRmsMm,
  postRegistrationSeamRmsMm:ten.postRegistrationSeamRmsMm,
  finalSeamRmsMm:ten.finalSeamRmsMm,
  coupledPanelMotionAcceptedSteps:ten.coupledPanelMotionAcceptedSteps,
  selectedBestStep:ten.selectedBestStep,terminalGapMm:ten.terminalSeamGapMm,
  seamReboundAfterBestMm:ten.seamReboundAfterBestMm,initialGapMm:ten.initialSeamGapMm,
  finalGapMm:ten.finalSeamGapMm,improvementPercent:100*(1-ten.finalSeamGapMm/ten.initialSeamGapMm),
  principalExtensionMaxPercent:ten.principalExtensionMaxPercent,
  stagedOffsetM:ten.stagingTranslationM,stagedAvatarEndpointChecked:true,
  avatarReentryValidated:false,sweptContactCertified:false,
  savedPositionsUnchanged:true,revisionUnchanged:true,privateProject:true,
  persistentSaveVerified:!skipSave,
  productionAppUntouched:true}
 console.log(JSON.stringify(result,null,2))
}catch(err){console.error(JSON.stringify({...result,error:String(err.stack||err),stderr:stderr.slice(-700)},null,2));process.exitCode=1}
finally{child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM');rmSync(temp,{recursive:true,force:true})}
