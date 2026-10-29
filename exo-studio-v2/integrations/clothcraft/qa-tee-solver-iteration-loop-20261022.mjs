// Bounded, resumable *research-only* Native VBD/OGC T-shirt parameter loop.
// IMPORTANT: ClothCraft's basic('tshirt') here is a TWO-PANEL front/back
// engineering preset, NOT the FOUR-PANEL EXO Foundation Tee with sleeves.
// No cargo build, project save, UI action, network write, app installation or
// garment mutation. Uses the already compiled experimental exo-session.
//
// node integrations/clothcraft/qa-tee-solver-iteration-loop-20261022.mjs --dry-run
// EXO_TEE_LOOP_MAX_TRIALS=3 npm run qa:tee-iteration-loop
//
// Loop execution deliberately ends after a small safe batch. Each new
// invocation resumes from a versioned checkpoint; NEVER loops unattended
// indefinitely and NEVER promotes an experimental pose into a live garment.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statfsSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'

const root = process.cwd()
const binary = path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar = path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const report = path.join(root,'docs/qa/clothcraft-tee-loop-20261022.json')
const VERSION = 'exo-tee-constraint-loop.v1'
const fixtureDescription = 'ClothCraft two-panel tshirt engineering preset, not EXO four-panel Foundation Tee'
const MIN_FREE_BYTES = 1024 ** 3 // 1 GiB: research QA only, NOT sufficient for a Rust build.
const maxTrials = Number(process.env.EXO_TEE_LOOP_MAX_TRIALS ?? 3)
const timeBudgetMs = Number(process.env.EXO_TEE_LOOP_TIME_BUDGET_MS ?? 180000)
const dryRun = process.argv.includes('--dry-run')
assert(Number.isInteger(maxTrials) && maxTrials >= 1 && maxTrials <= 6,'max trials must be 1..6')
assert(Number.isFinite(timeBudgetMs) && timeBudgetMs >= 15000 && timeBudgetMs <= 600000,'time budget must be 15..600 seconds')

// Each candidate varies preassembly ONLY; dynamic VBD count, rest garment,
// rigid avatar, material ceiling and CPU threads are identical.
const cases = [
  {id:'vbd20-reference', rigidRegistrationSteps:0,nonrigidRegistrationSteps:0,nonrigidSeamSweeps:0,nonrigidFabricRings:0},
  {id:'rigid40', rigidRegistrationSteps:40,nonrigidRegistrationSteps:0,nonrigidSeamSweeps:0,nonrigidFabricRings:0},
  {id:'rigid40-nonrigid10-r2-s1', rigidRegistrationSteps:40,nonrigidRegistrationSteps:10,nonrigidSeamSweeps:1,nonrigidFabricRings:2},
  {id:'rigid40-nonrigid20-r2-s1', rigidRegistrationSteps:40,nonrigidRegistrationSteps:20,nonrigidSeamSweeps:1,nonrigidFabricRings:2},
  {id:'rigid40-nonrigid20-r1-s1', rigidRegistrationSteps:40,nonrigidRegistrationSteps:20,nonrigidSeamSweeps:1,nonrigidFabricRings:1},
  {id:'rigid40-nonrigid10-r2-s2', rigidRegistrationSteps:40,nonrigidRegistrationSteps:10,nonrigidSeamSweeps:2,nonrigidFabricRings:2},
  {id:'rigid30-nonrigid20-r2-s1', rigidRegistrationSteps:30,nonrigidRegistrationSteps:20,nonrigidSeamSweeps:1,nonrigidFabricRings:2},
  {id:'rigid40-nonrigid15-r2-s2', rigidRegistrationSteps:40,nonrigidRegistrationSteps:15,nonrigidSeamSweeps:2,nonrigidFabricRings:2},
  {id:'rigid20-nonrigid20-r2-s1', rigidRegistrationSteps:20,nonrigidRegistrationSteps:20,nonrigidSeamSweeps:1,nonrigidFabricRings:2},
  {id:'rigid40-nonrigid20-r2-s2', rigidRegistrationSteps:40,nonrigidRegistrationSteps:20,nonrigidSeamSweeps:2,nonrigidFabricRings:2},
]

const stat = () => {
  const disk=statfsSync(root)
  return disk.bavail * disk.bsize
}
const binaryHash = () => createHash('sha256').update(readFileSync(binary)).digest('hex')
assert(existsSync(binary) && existsSync(avatar),'Existing experimental native executable/avatar required; builds prohibited')
const executableSHA256 = binaryHash()
const parametersHash = createHash('sha256').update(JSON.stringify(cases)).digest('hex')
const expected = {version:VERSION,executableSHA256,parametersHash,stepCount:20,principalStrainCapPercent:5}
const stored = existsSync(report) ? JSON.parse(readFileSync(report,'utf8')) : null
if (stored) for (const [key,value] of Object.entries(expected))
  assert.equal(stored[key],value,`Existing checkpoint ${key} changed: do not merge incompatible measurements`)
const rows = stored?.results || []
assert(Array.isArray(rows) && rows.every(row => cases.some(item=>item.id===row.id)),
  'Stored results contain unrecognized or non-array entries')
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Duplicate checkpoint case')
const remaining = cases.filter(item => !rows.some(row=>row.id===item.id))
const best = list => list.filter(item=>item.valid && item.maxGapMm < 10 && item.sweptCCDVerified===true)
const Pareto = list => list.filter(a => !list.some(b =>
  a!==b && b.valid && (b.maxGapMm <= a.maxGapMm && b.rmsGapMm <= a.rmsGapMm) &&
  (b.maxGapMm < a.maxGapMm || b.rmsGapMm < a.rmsGapMm)))

function checkpoint() {
  mkdirSync(path.dirname(report),{recursive:true})
  const content=JSON.stringify({...expected,results:rows,completed:rows.length===cases.length,
    fixtureDescription,fixturePanelCount:2,
    boundedResearch:true,installedAppUnchanged:true,storedGarmentUnchanged:true,
    fitCertified:false,sweptCCDVerified:false,saveRoundTripChecked:false,
    lastChecked:new Date().toISOString()},null,2)+'\n'
  assert(Buffer.byteLength(content)<65536,'Refuse oversized loop checkpoint')
  const temp=`${report}.tmp-${process.pid}`
  try{
    writeFileSync(temp,content,{flag:'wx'})
    renameSync(temp,report)
  }finally{if(existsSync(temp))rmSync(temp)}
}

if(dryRun){
  console.log(JSON.stringify({dryRun:true,availableGiB:+(stat()/1024**3).toFixed(2),
    checkpoint:report,completed:rows.length,remaining:remaining.map(x=>x.id),
    maxTrials,timeBudgetMs,oneByteSafeNoNativeBuild:true},null,2))
  process.exit(0)
}
if (stat() < MIN_FREE_BYTES) {
  console.error(JSON.stringify({pass:false,stopped:'disk headroom under 1 GiB',
    availableGiB:+(stat()/1024**3).toFixed(2),existingCompleted:rows.length}))
  process.exit(2)
}
if (remaining.length===0){
  console.log(JSON.stringify({pass:true,complete:true,fixtureDescription,completed:rows.length,checkpoint:report,
    fitCertified:false,needNewPhysicallyValidSolver:true},null,2))
  process.exit(0)
}

const workspace=mkdtempSync(path.join(tmpdir(),'exo-tee-research-'))
const child=spawn(binary,[avatar,path.join(workspace,'never-save-garment.json')],{
  cwd:root,stdio:['pipe','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2',EXO_CLOTHCRAFT_GPU:'0'},
})
let pending=null,stderr='',ended=false
child.stderr.on('data',part=>{stderr=(stderr+part.toString()).slice(-2048)})
child.on('exit',()=>{ended=true;pending?.reject(Error(`Research native service ended: ${stderr}`));pending=null})
createInterface({input:child.stdout}).on('line',line=>{
  const response=pending;pending=null
  if(!response)return
  try{response.resolve(JSON.parse(line))}catch(err){response.reject(err)}
})
function request(value){
  assert(!pending&&!ended,'Overlapping or terminated native session')
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending=null;reject(Error('Native request deadline exceeded'))},90000)
    pending={resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}}
    child.stdin.write(JSON.stringify(value)+'\n')
  }).then(r=>{assert.equal(r.ok,true,JSON.stringify({error:r.error,op:value.op}));return r.data})
}
let completedThisRun=0
const started=Date.now()
try{
  const opened=await request({op:'open',preset:'tshirt'})
  const frozen=await request({op:'snapshot'})
  assert.equal(opened.revision,frozen.revision)
  assert.equal(frozen.panels.length,2,'Native preset changed: do not compare a different garment to saved two-panel results')
  const initialDigest = createHash('sha256').update(JSON.stringify(frozen.positions)).digest('hex')
  for (const config of remaining) {
    if(completedThisRun >= maxTrials || Date.now()-started >= timeBudgetMs)break
    if(stat() < MIN_FREE_BYTES){console.error('Stopping loop: free disk below research safety floor');break}
    const startedTrial=Date.now()
    const result=await request({op:'preassemble-preview',revision:frozen.revision,
      steps:20,strainLimitPercent:5,fromRest:true,
      rigidRegistrationSteps:config.rigidRegistrationSteps,
      nonrigidRegistrationSteps:config.nonrigidRegistrationSteps,
      nonrigidSeamSweeps:config.nonrigidSeamSweeps,
      nonrigidFabricRings:config.nonrigidFabricRings})
    const after=await request({op:'snapshot'})
    assert.equal(after.revision,frozen.revision,'Trial changed live revision')
    assert.equal(after.time,frozen.time,'Trial advanced original garment clock')
    assert.equal(createHash('sha256').update(JSON.stringify(after.positions)).digest('hex'),
      initialDigest,'Trial changed existing garment coordinates')
    assert.equal(result.format,'exo-offbody-assembly-preview.v1')
    assert.equal(result.committed,false)
    assert.equal(result.sweptContactCertified,false)
    assert.equal(result.avatarReentryValidated,false)
    assert.equal(result.stagedAvatarEndpointChecked,true)
    assert.equal(result.stepsAccepted,20)
    assert.ok(result.principalExtensionMaxPercent<=5.0001)
    assert.ok(result.finalSeamGapMm>=0 && result.finalSeamRmsMm>=0)
    assert.ok(result.finalSeamGapMm<=result.terminalSeamGapMm+1e-6)
    assert.equal(result.positions.length,frozen.positions.length)
    const row={id:config.id,
      maxGapMm:result.finalSeamGapMm,rmsGapMm:result.finalSeamRmsMm,
      strainPercent:result.principalExtensionMaxPercent,
      initialGapMm:result.initialSeamGapMm,wallMs:Date.now()-startedTrial,
      acceptedRigid:result.rigidRegistrationAccepted,
      acceptedNonrigid:result.nonrigidRegistrationAccepted,
      acceptedDynamicNonrigid:result.nonrigidBlockAccepted,
      rejectedStrainTrials:result.nonrigidDynamicRejectionDiagnostics?.strainTrials,
      valid:true,physicallyAccepted:false,sweptCCDVerified:false}
    rows.push(row)
    checkpoint() // atomic and <64 KiB; never stores private garment coordinates
    completedThisRun++
    console.log('ITERATION '+JSON.stringify(row))
  }
  const pareto=Pareto(rows)
  const bestMaxGap=rows.length ? [...rows].sort((a,b)=>a.maxGapMm-b.maxGapMm)[0]:null
  console.log('SUMMARY '+JSON.stringify({pass:true,checkpoint:report,
    fixtureDescription,
    completedThisRun,completedOverall:rows.length,totalCandidates:cases.length,
    bestMaxGap,bestFullyCertifiedCount:best(rows).length,
    pareto:pareto.map(x=>({id:x.id,maxGapMm:x.maxGapMm,rmsGapMm:x.rmsGapMm})),
    readyToPromote:false,remaining:cases.length-rows.length,
    diskFreeGiB:+(stat()/1024**3).toFixed(2)}))
}catch(err){
  console.error('FAILED '+JSON.stringify({error:String(err.stack||err),
    completedThisRun,checkpoint:report,stderr}))
  process.exitCode=1
}finally{
  child.stdin.end()
  if(!ended)child.kill('SIGTERM')
  rmSync(workspace,{recursive:true,force:true})
}
