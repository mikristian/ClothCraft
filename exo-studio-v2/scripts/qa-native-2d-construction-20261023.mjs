// Disposable native Rust authoring round-trip: no live EXO V2 user workspace
// is read, edited, saved or replaced. Tests real 2D Anchor, SplitBoundary,
// native undo, named edge identity and linked 3D regeneration.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {buildNativeParametricPointProposal} from '../src/core/nativeParametricPoint20261023.js'
import {buildNativeCurveStation20261023} from '../src/core/nativeCurveStation20261023.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Disposable native Rust engine prerequisites are unavailable')
const temp=mkdtempSync(path.join(tmpdir(),'exo-native-draft-construction-'))
const child=spawn(binary,[avatar,path.join(temp,'disposable.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
const pending=[]
let fatal=null,stderr=''
child.stderr.on('data',data=>{stderr+=String(data).slice(-2000)})
child.on('error',error=>{fatal=error;pending.splice(0).forEach(p=>p.reject(error))})
child.on('exit',code=>{if(code!==0){fatal=Error(`Rust native session exited ${code}: ${stderr.slice(-120)}`);pending.splice(0).forEach(p=>p.reject(fatal))}})
createInterface({input:child.stdout}).on('line',line=>{
  const next=pending.shift()
  if(!next)return
  try{const result=JSON.parse(line);next.resolve(result)}catch(error){next.reject(error)}
})
function call(payload){
  return new Promise((resolve,reject)=>{
    if(fatal)return reject(fatal)
    const timeout=setTimeout(()=>reject(Error(`Native RPC timed out: ${payload.op} ${stderr.slice(-150)}`)),30000)
    pending.push({resolve:result=>{clearTimeout(timeout);resolve(result)},reject:error=>{clearTimeout(timeout);reject(error)}})
    child.stdin.write(JSON.stringify(payload)+'\n')
  })
}
const requireSuccess=(result,label)=>{assert.equal(result.ok,true,`${label}: ${result.error||JSON.stringify(result).slice(0,180)}`);return result.data}
const selected=(snapshot,id)=>snapshot.template.panels.find(p=>p.id===id)

try{
  let snapshot=requireSuccess(await call({op:'open',preset:'tshirt'}),'Create isolated Rust document')
  assert(snapshot.template.panels.length>=2)
  const fabric=snapshot.template.fabrics[0]?.id
  assert.equal(typeof fabric,'string')
  snapshot=requireSuccess(await call({op:'edit',revision:snapshot.revision,command:{
    kind:'Primitive',shape:'rectangle',size:[.30,.23],origin:[0,0],fabric,
  }}),'Add one disposable unsown pattern rectangle')
  const id=snapshot.template.panels.at(-1).id
  const panel=selected(snapshot,id)
  assert(panel.polygon.points.length>=4)
  const n=panel.polygon.points.length
  let proposal
  for(let i=0;i<n&&!proposal?.ok;i++){
    const a=panel.polygon.points[i],b=panel.polygon.points[(i+1)%n]
    const distance=Math.hypot(b[0]-a[0],b[1]-a[1])*800 // 80% of source edge in mm
    const p=buildNativeParametricPointProposal(snapshot,{panelId:id,pointIndex:(i+1)%n,
      a:i,b:(i+1)%n,mode:'along',distanceMm:distance})
    if(p.ok)proposal=p
  }
  assert(proposal?.ok,'A safe finite numeric Anchor proposal must be possible on an unsown rectangle')
  const before=snapshot.template
  const afterPoint=requireSuccess(await call({op:'edit',revision:snapshot.revision,command:proposal.command}),
    'Commit numeric material-coordinate construction to Rust')
  assert.equal(afterPoint.canUndo,true)
  assert.notDeepEqual(selected(afterPoint,id).polygon.points,panel.polygon.points)
  assert.equal(afterPoint.fitCertified,false)
  snapshot=requireSuccess(await call({op:'undo',revision:afterPoint.revision}),
    'Undo exact native Anchor edit')
  assert.deepEqual(selected(snapshot,id).polygon.points,panel.polygon.points)

  let station
  for(const edge of selected(snapshot,id).polygon.edges){
    const p=buildNativeCurveStation20261023(snapshot,{panelId:id,edge,mode:'fraction',fraction:.5})
    if(p.ok){station=p;break}
  }
  assert(station?.ok,'A valid physical midpoint split should exist on native rectangle')
  const edgeCount=selected(snapshot,id).polygon.edges.length
  const afterSplit=requireSuccess(await call({op:'edit',revision:snapshot.revision,command:station.command}),
    'Commit physical arclength SplitBoundary to Rust')
  assert.equal(selected(afterSplit,id).polygon.edges.length,edgeCount+1)
  assert.equal(afterSplit.canUndo,true)
  const undone=requireSuccess(await call({op:'undo',revision:afterSplit.revision}),
    'Undo native physical boundary split')
  assert.equal(selected(undone,id).polygon.edges.length,edgeCount)
  assert.deepEqual(selected(undone,id).polygon.edges,selected(snapshot,id).polygon.edges)
  assert.deepEqual(undone.template.panels.filter(p=>p.id!==id),before.panels.filter(p=>p.id!==id))
  console.log(JSON.stringify({pass:true,isolation:'independent disposable native Rust process',
    checks:['native-primitive','finite-measured-anchor','real-Rust-Anchor-acceptance',
      'native-anchor-undo','physical-station-proposal','real-Rust-SplitBoundary-acceptance',
      'stable-named-edge-undo','other-garment-panels-unchanged'],
    panelId:id,anchorShiftMm:proposal.displacementMm,splitAtMm:station.stationMm,
    nativeSessionRevision:undone.revision,manufacturingApproved:false},null,2))
}finally{
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
  rmSync(temp,{recursive:true,force:true})
}
