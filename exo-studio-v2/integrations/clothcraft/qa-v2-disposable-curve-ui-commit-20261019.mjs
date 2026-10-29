// Full UI -> edit-seam -> Shape -> compiled Rust -> save/reopen against an
// isolated throwaway solver. Every /workspace request is intercepted and
// forwarded to a PRIVATE port; NEVER writes to the installed native garment.
import assert from 'node:assert/strict'
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
const port=5687,base=`http://127.0.0.1:${port}`
const ui=process.env.EXO_CURVE_QA_UI||'http://127.0.0.1:5284'
const targetEdge=process.env.EXO_CURVE_QA_EDGE||'front:shoulder-left'
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
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
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
  if(await twoD.count())await twoD.first().click()
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  const target=board.locator(`[data-2d-edge-hit="${targetEdge}"]`).first()
  await target.waitFor({state:'attached',timeout:30000})
  const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
  if(await edit.count())await edit.first().click()
  const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true})
  if(await curve.count())await curve.first().click()
  else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('svg[data-native-tool="curve"]').waitFor({timeout:8000})
  const midpoint=await target.evaluate(node=>{
    const p=node.points.getItem(Math.floor(node.points.numberOfItems/2))
    const q=new DOMPoint(p.x,p.y).matrixTransform(node.getScreenCTM())
    return {x:q.x,y:q.y}
  })
  await page.mouse.click(midpoint.x,midpoint.y)
  const h=board.locator(`[data-curve-handle^="${targetEdge}:"]`).first()
  await h.waitFor({state:'attached',timeout:7000})
  const box=await h.boundingBox()
  assert(box,'Selected edge handle is not visible')
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2-12,{steps:8})
  await page.mouse.up()
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
  assert.notDeepEqual(next.curves?.[edge],old.curves?.[edge],`Compiled ${targetEdge} cubic unchanged`)
  assert(compiled.triangles.length>0,'Native mesh was not regenerated')
  const enabled=compiled.template.seams.filter(s=>s.allow_ease&&(/shoulder|side/.test(s.id)))
  assert(enabled.length>=2,'Mirrored cutline must enable BOTH sewn relationships')
  assert.equal(compiled.template.seams.length,initial.template.seams.length)
  const saved=await rpc({op:'save'})
  const reopened=await rpc({op:'open',project:saved.project})
  assert.deepEqual(reopened.template.panels.find(p=>p.id===panel).polygon.curves[edge],next.curves[edge])
  assert.deepEqual(errors,[],'Browser errors during real curve commit')
  console.log(JSON.stringify({pass:true,isolated:true,edge:targetEdge,
    revisionBefore:initial.revision,revisionAfter:compiled.revision,
    nativeShapeChanged:true,meshTriangles:compiled.triangles.length,
    enabledSeams:enabled.map(s=>s.id),
    seamCountPreserved:true,saveReopen:true,browserErrors:errors,
    editSequence:calls.filter(c=>c.op==='edit-seam'||c.op==='edit')},null,2))
}finally{
  await browser?.close()
  try{process.kill(-proc.pid,'SIGTERM')}catch{}
  rmSync(scratch,{recursive:true,force:true})
}
