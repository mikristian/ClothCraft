/** Isolated Rust + Vite + one Chrome industrial six-size UI acceptance. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5479,uiPort=5309
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-six-size-industrial-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const children=[]
const sizes=['XS','S','M','L','XL','XXL']
let browser
const start=(cmd,args,env={})=>{
  const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1250)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Isolated industrial service failed to start: ${url}`)
}
async function command(body){
  const response=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json()
  assert(result.ok,`Rust ${body.op} failed: ${result.error||JSON.stringify(result)}`)
  return result.data
}
try{
  assert(existsSync(session),'Build research/oss/clothcraft/target/debug/exo-session first')
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:native,
  })
  await Promise.all([ready(native+'/health'),ready(ui)])
  let snapshot=await command({op:'open',preset:'tshirt'})
  for(const seam of [...snapshot.template.seams]){
    snapshot=await command({op:'edit',revision:snapshot.revision,command:{kind:'RemoveSeam',seam:seam.id}})
  }
  const prior=new Set(snapshot.template.panels.map(piece=>piece.id))
  snapshot=await command({op:'edit',revision:snapshot.revision,command:{
    kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.3],[0,.3]],
  }})
  const panel=snapshot.template.panels.find(piece=>!prior.has(piece.id))
  assert(panel,'Disposable native rectangle missing')
  const edge=panel.polygon.edges[0]
  snapshot=await command({op:'edit',revision:snapshot.revision,command:{
    kind:'SeamAllowance',panel:panel.id,edge,width_m:.012,
  }})
  snapshot=await command({op:'edit',revision:snapshot.revision,command:{
    kind:'Notch',panel:panel.id,edge,t:.25,depth_m:.004,
  }})
  const base=structuredClone(snapshot.template)
  const gradeRun={schemaVersion:1,sizes,baseSize:'M',baseTemplate:base,
    gradedTemplates:sizes.map((size,i)=>{
      const copy=structuredClone(base)
      if(i!==2)copy.panels.find(piece=>piece.id===panel.id).polygon.points[1][0]+=(i-2)*.005
      return copy
    }),pomSpecs:[]}
  snapshot=await command({op:'grade-run-commit',revision:snapshot.revision,gradeRun})
  assert.equal(snapshot.gradeRunPersisted,true)
  const revision=snapshot.revision
  const directProof=await command({op:'grade-run-industrial-audit',revision,panel:panel.id})
  assert.deepEqual(directProof.sizes.map(item=>item.size),sizes)
  for(const item of directProof.sizes){
    const station=item.edges.find(row=>row.edgeId===edge)
    assert(station,'Real Rust proof missing authored seam edge')
    assert.equal(station.notches.length,1)
    assert(Math.abs(station.notches[0].fraction-.25)<1e-9)
    assert(Math.abs(station.allowanceM-.012)<1e-9)
  }
  browser=await chromium.launch({
    headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--disable-gpu','--no-first-run'],
  })
  const page=await browser.newPage({viewport:{width:1660,height:1050}})
  const errors=[],requests=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{
    if(request.url().endsWith('/workspace')&&request.method()==='POST'){
      try{requests.push(request.postDataJSON())}catch{}
    }
  })
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=industrial-six-size-ui-20261027',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{
    detail:{nativeAction:'pattern2d.editGrading'},
  })))
  const grading=page.locator('[data-native-grade-pattern="true"]')
  await grading.waitFor({state:'visible',timeout:15000})
  await grading.getByRole('tab',{name:'Seams & QA'}).click()
  const industrial=grading.locator('[data-native-six-size-industrial-audit="true"]')
  await industrial.waitFor({state:'visible',timeout:10000})
  await industrial.getByRole('combobox',{name:'Native industrial audit piece'}).selectOption(panel.id)
  const auditButton=industrial.getByRole('button',{name:'Measure all six industrial patterns'})
  assert.equal(await auditButton.isDisabled(),false,await industrial.innerText())
  await auditButton.click()
  const table=industrial.getByRole('table',{name:'Native industrial six-size physical measurements'})
  await table.waitFor({state:'visible',timeout:15000})
  const rows=table.locator('tbody tr')
  assert.equal(await rows.count(),sizes.length*panel.polygon.edges.length)
  for(const size of sizes){
    const row=rows.filter({hasText:edge}).filter({hasText:new RegExp(`^${size}${edge}`)})
    assert.equal(await row.count(),1,`Missing ${size} physical source edge: ${JSON.stringify((await rows.allTextContents()).slice(0,6))}`)
    const cells=await row.locator('td').allTextContents()
    assert.match(cells[0],/\d+\.\d{2} mm/)
    assert.match(cells[1],/12\.00 mm/)
    assert.match(cells[2],/\d+\.\d{2} mm at 25\.00%/)
  }
  assert(requests.some(item=>item.op==='grade-run-industrial-audit'&&item.panel===panel.id&&item.revision===revision),
    'Audit UI must call the real revision-checked Rust industrial RPC')
  const after=await command({op:'snapshot'})
  assert.equal(after.revision,revision,'Read-only industrial audit must not increment Rust revision')
  assert.deepEqual(after.template,base,'Read-only industrial audit must preserve source geometry')
  assert.deepEqual(errors,[],'No uncaught browser page errors are permitted')
  console.log(JSON.stringify({passed:true,realNative:true,uiMounted:true,sourcePanel:panel.id,
    sizeRows:sizes,physicalNotchStations:6,physicalAllowanceEdges:6,
    revisionUnchanged:true,pageErrors:errors.length,factoryApproved:false}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
