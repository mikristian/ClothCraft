/**
 * Isolated native Rust HTTP integration. Tests transactional guarantees for
 * an actual saved two-panel XS–XXL binding graph. Never touches installed
 * EXO, active sessions, user workspaces or app bundle.
 *
 * Run: node integrations/clothcraft/qa-v2-native-atomic-regeneration-rollback-20261028.mjs
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {
  verifyNativeSixSizePreview20261028 as checkPreview,
  verifyNativeSixSizeCommit20261028 as checkCommit,
} from '../../src/core/nativeSixSizeCommandContract20261028.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'A compiled native Rust exo-session is required')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-six-size-rollback-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
async function port(){
  const s=createServer()
  await new Promise((yes,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',yes)})
  const p=s.address().port
  await new Promise(resolve=>s.close(resolve))
  return p
}
const nativePort=await port(),native=`http://127.0.0.1:${nativePort}`
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,detached:true,stdio:'ignore',env:{...process.env,
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
  },
})
let state=null,stage='server'
const raw=async payload=>{
  const response=await fetch(native+'/workspace',{method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({revision:state?.revision,...payload})})
  const answer=await response.json()
  if(answer?.ok&&answer.data?.template)state=answer.data
  return answer
}
const execute=async payload=>{
  const response=await raw(payload)
  assert(response.ok,`Native ${payload.op} failed: ${response.error||JSON.stringify(response)}`)
  return response.data
}
const snapshot=()=>execute({op:'snapshot'})
const project=async()=>(await execute({op:'save'})).project
const unchanged=async(revision,previous)=>{
  const current=await snapshot()
  assert.equal(current.revision,revision,'Rejected operation changed the native revision')
  assert.deepEqual(await project(),previous,'Rejected operation changed the saved Rust garment')
}
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const stats={rejectedAttempts:0}
try{
  for(let i=0;i<120;i++){
    if(child.exitCode!==null||child.signalCode!==null)throw Error('Disposable Rust service terminated')
    try{if((await fetch(native+'/health',{signal:AbortSignal.timeout(1000)})).ok)break}catch{}
    await sleep(250)
    if(i===119)throw Error('Isolated native Rust server did not start')
  }
  stage='seed source'
  await execute({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await execute({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const oldIds=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await execute({op:'edit',command:{
    kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]],
  }})
  const ids=state.template.panels.filter(p=>!oldIds.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2,'Need two real independent Rust panels')
  // The same isolated garment also carries physical named CUT widths and
  // notches. The test will check all six regenerated CUT boundaries against
  // the independently saved graded source, not merely accept a receipt.
  const authored=await project()
  for(const panel of authored.template.panels){
    const poly=panel.polygon
    if(!poly)continue
    poly.seam_allowances=Object.fromEntries(poly.edges.map(edge=>[edge,.01]))
    if(ids.includes(panel.id))
      poly.notches={[poly.edges[0]]:[{t:.25,depth_m:.004}]}
  }
  authored.state=null
  authored.mesh_signature=null
  await execute({op:'open',project:authored})
  await execute({op:'bindings-store',nativeBindings:{
    measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}},
    bindings:ids.map((panelId,index)=>({id:`width_${index}`,panelId,pointIndex:1,
      mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})),
  }})
  const base=structuredClone(state.template)
  await execute({op:'grade-run-commit',gradeRun:{
    schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(base),
    gradedTemplates:sizes.map(size=>{
      const t=structuredClone(base)
      for(const id of ids)t.panels.find(p=>p.id===id).polygon.points[1][0]+=offsets[size]
      return t
    }),
    pomSpecs:[{id:'width-pom',label:'Pattern width',panelId:ids[0],
      kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:50,
      targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}],
  }})
  const before=structuredClone(await snapshot()),original=await project()
  assert.equal(before.gradeRunPersisted,true)
  assert.equal(before.nativePointBindings.active,true)
  stage='adversarial rollback before valid commit'
  for(const payload of [
    {op:'bindings-grade-regenerate',overrides:{width:420}},
    {op:'bindings-grade-regenerate',overrides:{halfWidth:1e8}},
    {op:'bindings-grade-regenerate',overrides:{missing:210}},
    {op:'bindings-grade-regenerate',revision:before.revision-1,overrides:{halfWidth:210}},
    {op:'bindings-grade-regenerate-preview',overrides:{width:420}},
  ]){
    const outcome=await raw(payload)
    assert.equal(outcome.ok,false,`Invalid native command was unexpectedly approved: ${JSON.stringify(payload)}`)
    stats.rejectedAttempts++
    await unchanged(before.revision,original)
  }
  stage='read-only six-size preview'
  const overrides={halfWidth:210}
  const preview=await execute({op:'bindings-grade-regenerate-preview',overrides})
  const reviewed=checkPreview(before,overrides,preview)
  assert.equal(reviewed.ok,true,reviewed.reason)
  assert.equal(preview.changedPanels,2)
  assert.equal(preview.bySize.length,6)
  assert(Array.isArray(preview.perSizeIntegrity),
    'Built native Rust session must supply the new per-size physical CUT and sewing integrity receipt')
  assert.equal(preview.perSizeIntegrity.length,6)
  for(const [i,row] of preview.perSizeIntegrity.entries()){
    assert.equal(row.size,sizes[i])
    assert.equal(row.notchCount,2)
    assert.equal(row.nativeCutAndSewValidated,true)
    assert.equal(row.industrialPanelCount,before.template.panels.length)
  }
  await unchanged(before.revision,original)
  stage='qualified single native commit'
  const after=await execute({op:'bindings-grade-regenerate',overrides})
  const receipt=checkCommit(before,reviewed,after)
  assert.equal(receipt.ok,true,receipt.reason)
  assert.equal(receipt.committedRevision,before.revision+1)
  const committed=await project()
  assert(committed.grade_run)
  for(const [i,size] of sizes.entries()){
    for(const id of ids){
      const panel=committed.grade_run.gradedTemplates[i].panels.find(p=>p.id===id)
      assert(panel)
      assert(Math.abs(panel.polygon.points[1][0]-(.42+offsets[size]))<1e-8,
        `Regenerated ${size}/${id} mismatched the native six-size chart`)
    }
  }
  stage='independent real physical CUT/notch readback'
  const cuts=await execute({op:'grade-run-cutlines'})
  assert.equal(cuts.format,'exo-native-graded-cutlines.v1')
  assert.equal(cuts.manufacturerReady,false)
  assert.equal(cuts.cuttingAuthorized,false)
  assert.equal(cuts.sizes.length,6)
  let verifiedNotches=0
  for(const [i,row] of cuts.sizes.entries()){
    assert.equal(row.size,sizes[i])
    const saved=committed.grade_run.gradedTemplates[i]
    assert.equal(row.panels.length,saved.panels.length)
    for(const id of ids){
      const recorded=row.panels.find(p=>p.panel_id===id)
      const polygon=saved.panels.find(p=>p.id===id).polygon
      assert(recorded&&polygon)
      assert.deepEqual(recorded.cut.edges.map(e=>e.name),polygon.edges)
      assert(recorded.cut.area_m2>0&&Number.isFinite(recorded.cut.perimeter_m))
      assert(recorded.cut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-9))
      assert.equal(recorded.cut.notches.length,1)
      assert.equal(recorded.cut.notches[0].edge_id,polygon.edges[0])
      assert(Math.abs(recorded.cut.notches[0].depth_m-.004)<1e-9)
      verifiedNotches++
    }
  }
  assert.equal(verifiedNotches,12)
  assert.deepEqual(await execute({op:'grade-run-cutlines'}),cuts,
    'Rust factory-output readback must be deterministic on the same source revision')
  await unchanged(after.revision,committed)
  stage='reject stale and harmful postcommit edits'
  const stale=await raw({op:'bindings-grade-regenerate',revision:before.revision,overrides:{halfWidth:220}})
  assert.equal(stale.ok,false,'Native stale revision unexpectedly committed')
  stats.rejectedAttempts++
  await unchanged(after.revision,committed)
  stage='one native Undo and Redo'
  await execute({op:'undo'})
  assert.deepEqual(await project(),original,'Undo failed to restore the entire six-size graph')
  await execute({op:'redo'})
  assert.deepEqual(await project(),committed,'Redo failed to restore the entire six-size graph')
  stage='durable save and reopen'
  await execute({op:'open',project:structuredClone(committed)})
  assert.deepEqual(await project(),committed,'Native reopen changed the committed saved catalog')
  console.log(JSON.stringify({passed:true,realRust:true,fixture:'isolated saved two-panel six-size garment',
    panels:2,sizes:6,sourceRevision:before.revision,committedRevision:after.revision,
    rejectedWithoutMutation:stats.rejectedAttempts,previewReadOnly:true,
    oneNativeRevision:true,sourceGeometryAndGradesUpdated:true,
    actualCutlinesAcrossSixSizes:true,physicalNotchesVerified:verifiedNotches,
    compiledRustPerSizeIntegrity:true,
    unchangedReadOnlyFactoryInspection:true,undoRedo:true,saveReopen:true,
    manufacturingApproved:false}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack,
    rejected:stats.rejectedAttempts}))
  process.exitCode=1
}finally{
  try{process.kill(-child.pid,'SIGTERM')}catch{}
  await sleep(200)
  try{process.kill(-child.pid,'SIGKILL')}catch{}
  rmSync(output,{recursive:true,force:true})
}
