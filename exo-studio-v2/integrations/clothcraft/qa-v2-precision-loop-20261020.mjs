// Full UI -> edit-seam -> Shape -> compiled Rust -> save/reopen against an
// isolated throwaway solver. Every /workspace request is intercepted and
// forwarded to a PRIVATE port; NEVER writes to the installed native garment.
import assert from 'node:assert/strict'
import {evaluateFreeCurve} from '../../src/core/nativeFreeCurvePoints.js'
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const scratch=mkdtempSync(path.join(tmpdir(),'exo-ui-curve-native-'))
mkdirSync(path.join(scratch,'workspace'))
const port=5689,base=`http://127.0.0.1:${port}`
const ui=process.env.EXO_CURVE_QA_UI||'http://127.0.0.1:5284'
const targetEdge=process.env.EXO_CURVE_QA_EDGE||'front:side-left'
const proc=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,detached:true,stdio:'ignore',env:{...process.env,
    EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,
    EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')},
})
let browser=null
const calls=[]
const rpc=async input=>{
  const response=await fetch(base+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(input),
    signal:AbortSignal.timeout(30000)})
  const result=await response.json()
  assert(result.ok,'Isolated native operation failed: '+JSON.stringify({input,error:result.error}))
  return result.data
}
try{
  let ready=false
  for(let i=0;i<60;i++){
    try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(300)});if(r.ok){ready=true;break}}catch{}
    await sleep(250)
  }
  assert(ready,'Disposable native session did not start')
  const initial=await rpc({op:'open',preset:'tshirt'})
  const edge=targetEdge.split(':')[1],panel=targetEdge.split(':')[0]
  const old=initial.template.panels.find(p=>p.id===panel).polygon
  const oldSeams=initial.template.seams.filter(s=>/shoulder|side/.test(s.id))
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:Number(process.env.EXO_CURVE_QA_WIDTH)||1728,height:1040}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/workspace',async route=>{
    const req=route.request(),body=req.postDataJSON()
    calls.push({op:body.op,kind:body.command?.kind,edge:body.command?.polygon?.edges?.[0],seam:body.seam})
    try{
      const response=await fetch(base+'/workspace',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
        signal:AbortSignal.timeout(25000)})
      const json=await response.text()
      await route.fulfill({status:response.status,body:json,contentType:'application/json'})
    }catch(e){await route.fulfill({status:500,body:JSON.stringify({ok:false,error:String(e)}),contentType:'application/json'})}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=disposable-curve-native',
    {waitUntil:'domcontentloaded',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true})
  await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('2d')
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  const target=board.locator(`[data-2d-edge-hit="${targetEdge}"]`).first()
  await target.waitFor({state:'attached',timeout:30000})
  const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
  if(await edit.count())await edit.first().click()
  const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true})
  if(await curve.count())await curve.first().click()
  else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('svg[data-native-tool="curve"]').waitFor({timeout:8000})
  await board.getByRole('button',{name:'Frame all',exact:true}).click()
  const station=board.locator(`[data-side-edit-station="${targetEdge}:between"] circle:first-child`)
  await station.waitFor({state:'attached'})
  const stationT=Number(await station.locator('..').getAttribute('data-side-edit-station-t'))
  const originalStation=evaluateFreeCurve(old,edge,stationT)
  const dragAt=async(locator,dx,dy)=>{
    const box=await locator.boundingBox();assert(box)
    const pixelsPerMetre=await locator.evaluate(n=>{const m=n.getScreenCTM();return Math.hypot(m.a,m.b)})
    dx*=pixelsPerMetre*.001;dy*=pixelsPerMetre*.001
    const x=box.x+box.width/2,y=box.y+box.height/2
    assert(await locator.evaluate((node,{x,y})=>node.contains(document.elementFromPoint(x,y)),{x,y}),'Gesture target is obstructed')
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up()
  }
  const trace=async label=>console.log('TRACE',label,await board.locator(`[data-free-curve-point^="${targetEdge}:"] > circle:first-child`).evaluateAll(ns=>ns.map(n=>[n.getAttribute('cx'),n.getAttribute('cy')])));
  const paper=board.locator(`[data-2d-pattern-piece="${panel}"] [data-pattern-surface="drafting-paper"]`)
  const surface=board.locator('svg[data-native-tool="curve"]')
  const cancelDrag=async(locator,kind)=>{
    const before=await paper.getAttribute('d'),box=await locator.boundingBox();assert(box)
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down()
    await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2+5,{steps:5})
    const view=await surface.getAttribute('viewBox');await page.mouse.wheel(0,100)
    assert.equal(await surface.getAttribute('viewBox'),view,'Wheel changed drag coordinate frame')
    if(kind==='escape')await page.keyboard.press('Escape')
    else await surface.dispatchEvent('pointercancel',{pointerId:1,bubbles:true})
    await page.mouse.up()
    assert.equal(await paper.getAttribute('d'),before,kind+' did not restore paper')
    assert.equal((await rpc({op:'snapshot'})).revision,initial.revision,'Cancel mutated native project')
  }
  await cancelDrag(station,'escape')
  await cancelDrag(station,'pointercancel')
  await dragAt(station,16,0);await trace("station")
  const knot=board.locator(`[data-free-curve-point^="${targetEdge}:"]`).first()
  await knot.waitFor({state:'attached'})
  const count=await knot.count()
  await dragAt(knot.locator('circle').first(),.5,.25);await trace("knot")
  assert.equal(await knot.count(),count,'Second drag lost staged free knot')
  await cancelDrag(knot.locator('circle').first(),'escape');await trace('cancel')
  for(const side of ['in','out']){
    const tangent=board.locator(`[data-free-curve-tangent-handle^="${targetEdge}:"][data-free-curve-tangent-handle$=":${side}"]`).first()
    await page.keyboard.down('Alt');await dragAt(tangent,3,-2);await page.keyboard.up('Alt');await trace(side)
    assert.equal(await knot.count(),count,'Tangent drag lost staged knot')
  }
  const apply=board.locator(`[data-enable-curve-seam-ease="${targetEdge}"]`)
  await apply.waitFor({timeout:8000})
  assert.match(await apply.innerText(),/Apply this yellow curve/)
  const before=await rpc({op:'snapshot'})
  assert.equal(before.revision,initial.revision,'Staging a curve edited the native garment')
  await apply.click()
  try{
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-free-curve-tool-guide] [role="status"]')]
      .some(node=>/Native Rust committed this curve/.test(node.textContent)),null,{timeout:25000})
  }catch(error){
    console.log('COMMIT_DIAGNOSTIC',JSON.stringify({
      calls:calls.filter(c=>['edit-seam','edit'].includes(c.op)),
      status:await page.locator('[data-free-curve-tool-guide]').allTextContents(),
      bridge:(await rpc({op:'snapshot'})).revision,
    }))
    throw error
  }
  assert(calls.some(call=>call.op==='edit'&&call.kind==='Shape'),'Explicit Apply must issue an actual native Shape')
  const compiled=await rpc({op:'snapshot'})
  assert(compiled.revision>initial.revision,'UI did not commit Rust Shape')
  const next=compiled.template.panels.find(p=>p.id===panel).polygon
  assert.notDeepEqual(next.free_curve_points?.[edge],old.free_curve_points?.[edge],`Compiled ${targetEdge} knot unchanged`)
  const movedKnot=next.free_curve_points[edge].find(k=>Math.abs(k.t-stationT)<1e-6)
  assert(movedKnot,'Applied knot station missing')
  assert(Math.hypot(movedKnot.position[0]-originalStation[0]-(next.points[0][0]-old.points[0][0])-.0165,movedKnot.position[1]-originalStation[1]-(next.points[0][1]-old.points[0][1])-.00025)<1e-6,'Physical drag relative to unchanged material anchor was not retained: '+JSON.stringify({actual:movedKnot.position,origin:originalStation,t:stationT}))
  assert.notDeepEqual(compiled.positions,initial.positions,'3D garment positions unchanged')
  assert(compiled.triangles.length>0,'Native mesh was not regenerated')
  const range=compiled.panels.find(p=>p.id===panel),chain=range.boundaries[edge].map(i=>compiled.uv[i])
  const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
  const maxError=Math.max(...Array.from({length:129},(_,i)=>{const p=evaluateFreeCurve(next,edge,i/128);return Math.min(...chain.slice(1).map((b,j)=>distance(p,chain[j],b)))}))
  assert(maxError<.0015,'Authored curve differs from compiled Rust boundary by '+maxError+' m')
  const oldIndices=initial.panels.find(p=>p.id===panel).boundaries[edge]
  assert.notDeepEqual(range.boundaries[edge].map(i=>compiled.positions[i]),oldIndices.map(i=>initial.positions[i]),'Corresponding 3D edge unchanged')
  assert.deepEqual(compiled.template.seams.map(s=>s.id),initial.template.seams.map(s=>s.id),'Sewing identity changed')
  const enabled=compiled.template.seams.filter(s=>s.allow_ease&&(/shoulder|side/.test(s.id)))
  assert(enabled.length>=2,'Mirrored cutline must enable BOTH sewn relationships')
  assert.equal(compiled.template.seams.length,initial.template.seams.length)
  await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('split')
  const canvas=page.locator('canvas[data-native3d-mesh-revision]').first()
  await page.waitForFunction(revision=>[...document.querySelectorAll('canvas[data-native3d-mesh-revision]')].some(c=>Number(c.dataset.native3dMeshRevision)===revision),compiled.revision,{timeout:15000})
  assert.equal(Number(await canvas.getAttribute('data-native3d-mesh-triangles')),compiled.triangles.length,'Renderer did not consume committed Rust mesh')
  mkdirSync(path.join(root,'docs/qa/precision-loop-20261020'),{recursive:true})
  await page.screenshot({path:path.join(root,'docs/qa/precision-loop-20261020',targetEdge.replace(':','-')+'-'+page.viewportSize().width+'.png')})
  await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('2d')
  await board.getByRole('button',{name:'Frame all',exact:true}).click()
  await dragAt(knot.locator('circle').first(),5,0)
  assert.equal((await rpc({op:'snapshot'})).revision,compiled.revision,'Already eased curve bypassed Apply')
  await board.locator('[data-discard-curve-proposal]').click()
  assert.deepEqual((await rpc({op:'snapshot'})).template.panels.find(p=>p.id===panel).polygon,next,'Discard changed native contour')
  const undone=await rpc({op:'undo',revision:compiled.revision})
  assert.deepEqual(undone.template.panels.find(p=>p.id===panel).polygon,old,'Undo did not restore original contour')
  const redone=await rpc({op:'redo',revision:undone.revision})
  assert.deepEqual(redone.template.panels.find(p=>p.id===panel).polygon,next,'Redo did not restore applied contour')
  const saved=await rpc({op:'save'})
  const reopened=await rpc({op:'open',project:saved.project})
  assert.deepEqual(reopened.template.panels.find(p=>p.id===panel).polygon.free_curve_points[edge],next.free_curve_points[edge])
  assert.deepEqual(errors,[],'Browser errors during real curve commit')
  console.log(JSON.stringify({pass:true,isolated:true,edge:targetEdge,
    revisionBefore:initial.revision,revisionAfter:compiled.revision,
    nativeShapeChanged:true,physicalDragMm:[16.5,.25],precisionFollowupMm:[.5,.25],previewRustMaxErrorMm:maxError*1000,threeDEdgeChanged:true,rendererRevisionVerified:compiled.revision,cancelModes:['escape','pointercancel'],repeatedKnotAndTangentDrags:true,meshTriangles:compiled.triangles.length,
    enabledSeams:enabled.map(s=>s.id),
    seamCountPreserved:true,undoRedo:true,discardAfterEase:true,saveReopen:true,browserErrors:errors,
    editSequence:calls.filter(c=>c.op==='edit-seam'||c.op==='edit')},null,2))
}finally{
  await browser?.close()
  try{process.kill(-proc.pid,'SIGTERM')}catch{}
  rmSync(scratch,{recursive:true,force:true})
}
