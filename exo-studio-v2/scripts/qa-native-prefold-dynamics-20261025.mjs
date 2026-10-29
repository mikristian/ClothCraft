// Isolated physical tuck-fold dynamics in the experimental Rust stdio adapter.
// No native builds, save RPCs, temporary files, installed app or live garments.
// Usage: node scripts/qa-native-prefold-dynamics-20261025.mjs
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const bin=path.resolve(process.env.EXO_PREFOLD_BIN||path.join(root,'research/oss/clothcraft/target/debug/exo-session'))
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
const steps=process.env.EXO_PREFOLD_STEPS===undefined?12:Number(process.env.EXO_PREFOLD_STEPS)
assert(Number.isSafeInteger(steps)&&steps>=1&&steps<=120,
  'Prefold dynamics fixture supports 1–120 bounded solver steps')
const maxSeamGapMm=2
const maxFiberExtensionPercent=100
assert(existsSync(bin),`Compile experimental binary separately first: ${bin}`)
assert(existsSync(avatar),'Bundled mannequin missing')

// The executable's second argument is used only for explicit save operations.
// This script never sends save; avoid even creating a disposable file.
const child=spawn(bin,[avatar],{cwd:root,stdio:['pipe','pipe','pipe'],
  env:{...process.env,EXO_CLOTHCRAFT_GPU:'0',RAYON_NUM_THREADS:'2'}})
let pending=null,ended=false,stderr=''
child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-3000)})
child.on('error',error=>{ended=true;pending?.reject(error);pending=null})
child.on('exit',(code,signal)=>{
  ended=true;pending?.reject(Error(`Native process exited ${code??signal}: ${stderr}`));pending=null
})
createInterface({input:child.stdout}).on('line',line=>{
  const waiter=pending;pending=null
  if(!waiter)return
  try{waiter.resolve(JSON.parse(line))}catch(error){waiter.reject(error)}
})
function rpc(payload){
  assert(!ended&&!pending,'Native process unavailable or previous request pending')
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending=null;reject(Error(`Native request timed out: ${payload.op}; ${stderr}`))},30000)
    pending={resolve:answer=>{clearTimeout(timeout);resolve(answer)},reject:error=>{clearTimeout(timeout);reject(error)}}
    child.stdin.write(JSON.stringify(payload)+'\n')
  })
}
async function checked(payload){
  const answer=await rpc(payload)
  assert(answer.ok,`${payload.op} failed: ${answer.error||'unknown native error'}`)
  return answer.data
}
const edit=(state,command)=>checked({op:'edit',revision:state.revision,command})
const mm=metres=>Number.isFinite(metres)?metres*1000:null
function describe(state,step){
  const seam=state.seams.find(item=>item.kind==='sewn_tuck_fold')
  assert(seam,`Missing physical tuck seam on step ${step}`)
  const metric=state.metrics||{}
  return {step,time:state.time,revision:state.revision,seamGapMm:mm(seam.gap_m),
    seamRmsMm:mm(seam.rms_gap_m),fiberExtensionPercent:metric.extension_max_percent??null,
    extensionP95Percent:metric.extension_p95_percent??null,
    residualRmsN:metric.residual_rms_n??null,contacts:metric.contacts??null,
    minimumContactDistanceM:metric.minimum_distance_m??null,
    vertices:state.positions.length}
}
let trace=[],lastGood=null,failedStep=null,errorMessage=null
try{
  let state=await checked({op:'open',preset:'tshirt'})
  const initialPanelIds=state.template.panels.map(panel=>panel.id)
  assert(initialPanelIds.length>0,'Preset supplied no panels')
  state=await edit(state,{kind:'Primitive',shape:'rectangle',size:[.3,.2],origin:[0,0],fabric:state.template.fabrics[0].id})
  const fresh=state.template.panels.find(panel=>!initialPanelIds.includes(panel.id))
  assert(fresh?.polygon?.points?.length===4,'Failed to create editable rectangular panel')
  for(const panel of initialPanelIds)state=await edit(state,{kind:'RemovePanel',panel})
  assert.equal(state.template.panels.length,1,'Preset panels were not fully removed')
  assert.equal(state.template.panels[0].id,fresh.id,'Unexpected surviving panel')
  assert.equal(state.template.seams.length,0,'Preset seams survived in isolated fixture')
  state=await edit(state,{kind:'Place',panel:fresh.id,
    placement:{translation:[4,4,4],rotation_degrees:[0,0,0]}})
  const selected=state.template.panels[0]
  assert.deepEqual(selected.placement.translation,[4,4,4])
  const points=selected.polygon.points
  assert(Math.abs(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))-.3)<1e-9)
  assert(Math.abs(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))-.2)<1e-9)
  const sourceEdge=selected.polygon.edges[0]
  assert(sourceEdge,'Rectangle has no boundary edge')
  // 18 mm intake on the 300 mm source edge; 45 mm uncut tuck depth.
  state=await edit(state,{kind:'TuckFoldSew',panel:fresh.id,edge:sourceEdge,
    left_t:.35,right_t:.41,depth_m:.045})
  assert.equal(state.template.panels.length,1)
  assert.equal(state.seams.filter(s=>s.kind==='sewn_tuck_fold').length,1)
  const before=describe(state,0)
  lastGood=state
  for(let step=1;step<=steps;step++){
    const outcome=await rpc({op:'step',revision:state.revision,steps:1})
    if(!outcome.ok){
      failedStep=step;errorMessage=String(outcome.error||'unknown solver error')
      const rolledBack=await checked({op:'snapshot'})
      assert.equal(rolledBack.revision,state.revision,'Rejected step changed document revision')
      assert.deepEqual(rolledBack.positions,state.positions,'Rejected step changed cloth vertices')
      break
    }
    state=outcome.data
    const measure=describe(state,step)
    trace.push(measure)
    lastGood=state
    assert(Number.isFinite(measure.seamGapMm)&&measure.seamGapMm>=0,'Invalid measured seam gap')
    assert(Number.isFinite(measure.fiberExtensionPercent),'Missing finite native strain metric')
    assert(Number.isFinite(measure.residualRmsN),'Missing finite native residual')
    assert(Number.isFinite(measure.contacts)&&measure.contacts>=0,'Missing finite contact count')
    assert(state.positions.every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)),
      'Non-finite native cloth positions')
  }
  const after=describe(lastGood,trace.length)
  const completed=trace.length===steps&&failedStep===null
  const pass=completed&&after.seamGapMm<=maxSeamGapMm&&
    after.fiberExtensionPercent<=maxFiberExtensionPercent&&
    Number.isFinite(after.residualRmsN)&&Number.isFinite(after.contacts)
  console.log(JSON.stringify({pass,fixture:'isolated 300x200mm rectangle at [4,4,4] metres',
    pattern:{sizeMm:[300,200],translationM:[4,4,4],sourceEdge,
      leftT:.35,rightT:.41,intakeMm:18,depthMm:45},
    presetPanelsRemoved:initialPanelIds,stepTarget:steps,stepsAccepted:trace.length,
    stepRejected:failedStep,error:errorMessage,
    acceptance:{maxSeamGapMm,maxFiberExtensionPercent,requiresAllSteps:true},
    before,after,trace,transactionalRollbackChecked:failedStep!==null,
    noSavedFiles:true,manufacturingApproved:false},null,2))
  if(!pass)process.exitCode=1
}catch(error){
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),
    stepsAccepted:trace.length,stepRejected:failedStep,nativeStderr:stderr},null,2))
  process.exitCode=1
}finally{
  child.stdin.end()
  if(!ended)child.kill('SIGTERM')
}
