// Direct native stdio acceptance for atomic multi-pair, symmetric and seam-end edits.
// In-memory tshirt only: no service, save RPC, user project or installed app changes.
// Run after the prime builds the new binary on Expansion:
// EXO_SEWING_SESSION_BIN=/path/to/exo-session node scripts/qa-native-sewing-atomic-20261025.mjs
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const bin=path.resolve(process.env.EXO_SEWING_SESSION_BIN||path.join(root,'research/oss/clothcraft/target/debug/exo-session'))
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(bin),`Native sewing binary unavailable: ${bin}`)
assert(existsSync(avatar),`Bundled mannequin unavailable: ${avatar}`)

const child=spawn(bin,[avatar],{cwd:root,stdio:['pipe','pipe','pipe'],
  env:{...process.env,EXO_CLOTHCRAFT_GPU:'0',RAYON_NUM_THREADS:'2'}})
let pending=null,ended=false,stderr='',requests=0
child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-4000)})
child.on('error',error=>{ended=true;pending?.reject(error);pending=null})
child.on('exit',(code,signal)=>{
  ended=true;pending?.reject(Error(`Native exited (${code??signal}): ${stderr}`));pending=null
})
createInterface({input:child.stdout}).on('line',line=>{
  const waiter=pending
  if(!waiter){process.exitCode=1;child.kill();return}
  pending=null
  try{waiter.resolve(JSON.parse(line))}catch(error){waiter.reject(error)}
})
function rpc(payload){
  assert(!ended&&!pending,'Native process unavailable or response still pending')
  requests++
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{
      pending=null;child.kill('SIGKILL')
      reject(Error(`Timed out waiting for ${payload.op}: ${stderr}`))
    },30000)
    pending={resolve(value){clearTimeout(timeout);resolve(value)},reject(error){clearTimeout(timeout);reject(error)}}
    child.stdin.write(JSON.stringify(payload)+'\n')
  })
}
async function ok(payload){
  const result=await rpc(payload)
  assert.equal(result.ok,true,`${payload.op} rejected: ${result.error||'unknown error'}`)
  assert(result.data&&typeof result.data==='object',`No native data for ${payload.op}`)
  return result.data
}
async function rejected(payload,expected){
  const before=await ok({op:'snapshot'})
  const result=await rpc(payload)
  assert.equal(result.ok,false,`${payload.op} unexpectedly succeeded`)
  assert.match(String(result.error||''),expected,`Wrong ${payload.op} rejection`)
  const after=await ok({op:'snapshot'})
  assert.equal(after.revision,before.revision,'Rejected edit advanced revision')
  assert.deepEqual(after.template,before.template,'Rejected edit changed authored template')
  assert.deepEqual(after.positions,before.positions,'Rejected edit changed simulation positions')
  assert.equal(after.canUndo,before.canUndo,'Rejected edit altered undo history')
  assert.equal(after.canRedo,before.canRedo,'Rejected edit altered redo history')
}
const ref=(panel,edge,range=[0,1])=>({panel,edge,side:'top',range})
const pair=(edge,a='front',b='back',range=[0,1])=>({a:ref(a,edge,range),b:ref(b,edge,range),reverse:false,ease:false})
const edit=(state,command)=>ok({op:'edit',revision:state.revision,command})
const signature=state=>state.template.seams.map(s=>({id:s.id,a:s.a,b:s.b,reverse:s.reverse_b,ease:s.allow_ease}))
let final=null
try{
  let state=await ok({op:'open',preset:'tshirt'})
  assert.equal(state.revision,0)
  assert.deepEqual(state.template.panels.map(p=>p.id),['front','back'])
  assert(state.template.seams.length>=2,'Preset has no existing sewn construction')
  const initial=signature(state)
  for(const panel of state.template.panels){
    const edges=panel.polygon?.edges||[]
    for(const edge of ['neck-left','neck-right','neck-bottom','cuff-left','cuff-right','hem']){
      assert(edges.includes(edge),`Expected named edge ${panel.id}/${edge}`)
    }
  }

  // The previously free neck-left edge can support adjacent halves; this is
  // genuine 1:N interval ownership, not a duplicated overlapping boundary.
  const halfPairs=[
    {a:ref('front','neck-left',[0,.5]),b:ref('back','neck-left',[0,.5]),reverse:false,ease:false},
    {a:ref('front','neck-left',[.5,1]),b:ref('back','neck-left',[.5,1]),reverse:false,ease:false},
  ]
  state=await edit(state,{kind:'SewMany',pairs:halfPairs})
  assert.equal(state.revision,1,'SewMany must commit exactly once')
  assert.equal(state.template.seams.length,initial.length+2)
  const halves=state.template.seams.slice(-2)
  assert(halves.every(s=>s.a.edge==='neck-left'&&s.b.edge==='neck-left'))
  assert.deepEqual(halves.map(s=>s.a.range),[[0,.5],[.5,1]])
  assert.equal(new Set(halves.map(s=>s.id)).size,2,'Batch seam identities must be distinct')

  await rejected({op:'edit',revision:state.revision,command:{kind:'SewMany',pairs:[
    pair('neck-bottom'),pair('neck-left'),
  ]}},/already sewn|overlap|ownership/i)
  await rejected({op:'edit',revision:state.revision,command:{kind:'SewMany',pairs:[
    pair('neck-bottom'),pair('neck-bottom'),
  ]}},/already sewn|overlap|ownership/i)

  // The tshirt preset provides four explicit and free left/right cuff edges.
  state=await edit(state,{kind:'SewSymmetric',
    original:pair('cuff-left'),mirrored:pair('cuff-right')})
  assert.equal(state.revision,2,'Symmetric pair must commit in one revision')
  assert.equal(state.template.seams.length,initial.length+4)
  const mirrored=state.template.seams.slice(-2)
  assert.deepEqual(mirrored.map(s=>s.a.edge),['cuff-left','cuff-right'])
  assert.deepEqual(mirrored.map(s=>s.b.edge),['cuff-left','cuff-right'])
  assert.equal(new Set(mirrored.map(s=>s.id)).size,2)
  await rejected({op:'edit',revision:state.revision,command:{kind:'SewSymmetric',
    original:pair('neck-bottom'),mirrored:pair('cuff-left')}},/already sewn|overlap|ownership/i)

  const seam=halves[0].id
  const amendedA=ref('front','neck-left',[.1,.4])
  const amendedB=ref('back','neck-left',[.1,.4])
  const beforeEdit=signature(state)
  state=await ok({op:'edit-seam-ends',revision:state.revision,seam,a:amendedA,b:amendedB,
    reverse:true,ease:false,stiffness:5000})
  assert.equal(state.revision,3,'Edit Sewing must commit once')
  assert.equal(state.template.seams.find(s=>s.id===seam)?.id,seam)
  assert.deepEqual(state.template.seams.find(s=>s.id===seam).a.range,[.1,.4])
  assert.deepEqual(state.template.seams.find(s=>s.id===seam).b.range,[.1,.4])
  await rejected({op:'edit-seam-ends',revision:state.revision,seam,
    a:ref('front','neck-left',[.4,.7]),b:amendedB},/already sewn|overlap|ownership/i)
  await rejected({op:'edit-seam-ends',revision:state.revision,seam,
    a:ref('nonexistent','neck-left',[.1,.4]),b:amendedB},/missing|unknown|not found/i)
  await rejected({op:'edit-seam-ends',revision:state.revision,seam,
    a:ref('front','neck-left',[.6,.2]),b:amendedB},/valid|range|start|end|boundar/i)
  await rejected({op:'edit-seam-ends',revision:2,seam,a:amendedA,b:amendedB},/stale document revision/i)

  state=await ok({op:'undo',revision:state.revision})
  assert.equal(state.revision,4)
  assert.deepEqual(signature(state),beforeEdit,'Undo did not recover prior exact seam graph')
  assert.equal(state.canRedo,true)
  state=await ok({op:'redo',revision:state.revision})
  assert.equal(state.revision,5)
  assert.deepEqual(state.template.seams.find(s=>s.id===seam).a.range,[.1,.4])
  assert.equal(state.template.seams.length,initial.length+4)
  assert.equal(state.canUndo,true)
  // Observational native 3D seam closure probe. The initial snapshot has no
  // VBD metric until the first successful step; record that explicitly.
  // OGC/contact instability is reported, not interpreted as sewing failure.
  const physical={baselineSeams:initial.length,authoredSeams:state.template.seams.length,
    requestedSteps:3,acceptedSteps:0,beforeGapM:null,afterGapM:null,
    beforeGapSource:'unavailable until first successful VBD step',
    gapSamplesM:[],solverFailure:null,improved:null}
  assert.equal(initial.length,8,'Tshirt fixture changed its eight baseline seams')
  for(let attempt=1;attempt<=physical.requestedSteps;attempt++){
    const response=await rpc({op:'step',revision:state.revision,steps:1})
    if(!response.ok){
      physical.solverFailure={attempt,error:String(response.error||'unknown solver error')}
      const recovered=await ok({op:'snapshot'})
      assert.equal(recovered.revision,state.revision,'Failed solver step altered revision')
      assert.deepEqual(recovered.positions,state.positions,'Failed solver step changed cloth positions')
      state=recovered
      break
    }
    state=response.data
    assert.equal(state.revision,5+attempt,'Accepted physical step revision mismatch')
    const gap=state.metrics?.max_seam_gap_m
    if(typeof gap!=='number'||!Number.isFinite(gap)||gap<0){
      physical.solverFailure={attempt,error:'Step returned no finite nonnegative metrics.max_seam_gap_m'}
      break
    }
    physical.acceptedSteps++
    physical.gapSamplesM.push(gap)
    if(physical.beforeGapM===null){
      physical.beforeGapM=gap
      physical.beforeGapSource='first successful VBD step (baseline snapshot metric unavailable)'
    }
    physical.afterGapM=gap
  }
  physical.improved=physical.gapSamplesM.length>=2
    ?physical.afterGapM<physical.beforeGapM:null
  physical.afterGapMm=physical.afterGapM===null?null:physical.afterGapM*1000
  physical.beforeGapMm=physical.beforeGapM===null?null:physical.beforeGapM*1000
  final={pass:true,requests,initialSeams:initial.length,finalSeams:state.template.seams.length,
    sewingMany:true,oneToManyIntervals:2,symmetricPair:true,editSeamEnds:true,
    undoRedo:true,collisionRollback:true,staleRevisionRejected:true,
    physical,revision:state.revision,noSavedFiles:true,manufacturingApproved:false}
  console.log(JSON.stringify(final))
}catch(error){
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),requests,nativeStderr:stderr},null,2))
  process.exitCode=1
}finally{
  child.stdin.end()
  if(!ended)child.kill('SIGTERM')
}
