// Isolated real Rust/Chromium QA for VectorCraft-inspired optional Pen/Pencil.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {EXO_RIGHT_EXTRA_TOOLS} from '../../src/core/exoExtraToolCatalog.js'
import {teeBalanceNotchCommands} from '../../src/core/patternSewingNotches.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-vectorcraft-native-'))
mkdirSync(path.join(output,'workspace'))
const base='http://127.0.0.1:5437',ui='http://127.0.0.1:5284'
const processes=[],errors=[],failed=[],submittedPolygons=[]
function launch(file,args,env={}){
  const c=spawn(file,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  processes.push(c)
}
async function ready(url){
  for(let i=0;i<130;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
    await sleep(280)
  }
  throw Error('Service unavailable '+url)
}
async function call(body){
  const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json()
  assert(result.ok,result.error||JSON.stringify(result))
  return result.data
}
let browser,page
try{
  for(const id of ['vector-pen','vector-pencil'])
    assert(EXO_RIGHT_EXTRA_TOOLS.some(tool=>tool.id===id&&tool.action===id),'Tool Index missing '+id)
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5437',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:base})
  await Promise.all([ready(base+'/health'),ready(ui)])
  await call({op:'open',preset:'tshirt'})
  const original=await call({op:'snapshot'})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',async response=>{
    if(response.status()>=400&&response.url().includes('/workspace'))
      failed.push({status:response.status(),request:response.request().postData()?.slice(0,400),
        result:await response.text().catch(()=>null)})
  })
  page.on('request',request=>{
    if(!request.url().endsWith('/workspace')||request.method()!=='POST')return
    try{
      const body=request.postDataJSON(),poly=body?.command
      if(poly?.kind==='Polygon')submittedPolygons.push(poly)
    }catch{}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  await board.locator('[data-2d-guide-panel="front"]').waitFor({timeout:60000})
  const screenAt=async([x,y])=>board.locator('svg[data-native-tool]').evaluate((svg,[x,y])=>{
    const point=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM())
    return {x:point.x,y:point.y}
  },[x,y])
  const start=await screenAt([-.55,.2]),mid=await screenAt([-.30,.20]),end=await screenAt([-.38,.48])
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'vector-pen'}})))
  await board.locator('svg[data-native-tool="vector-pen"]').waitFor({timeout:10000})
  // Click/drag at each anchor, creating native tangent vectors in metres.
  console.log('POSITIONS',JSON.stringify({start,mid,end}));
  for(const [j,[point,dx,dy]] of [[start,22,-16],[mid,10,18],[end,-12,8]].entries()){
    await page.mouse.move(point.x,point.y)
    await page.mouse.down()
    await page.mouse.move(point.x+dx,point.y+dy,{steps:8})
    await page.mouse.up()
    console.log('PEN_STEP',j,await board.locator('[data-vector-pen-anchor]').count(),await board.locator('svg[data-native-tool]').getAttribute('data-vector-draft-count'),await board.locator('svg[data-native-tool]').getAttribute('data-native-tool'))
  }
  assert.equal(await board.locator('[data-vector-pen-anchor]').count(),3,'Pen anchors should remain editable during draft')
  await page.keyboard.press('Enter')
  let saved
  for(let i=0;i<45;i++){
    saved=await call({op:'snapshot'})
    if(saved.revision>original.revision)break
    await sleep(400)
  }
  assert(saved.revision>original.revision,'Pen must create a native garment pattern')
  const pattern=saved.template.panels.find(p=>p.id.startsWith('panel_'))
  assert(pattern?.polygon?.points?.length===3,'Pen must author three native points')
  assert(Object.values(pattern.polygon.curves||{}).length>=1,'Pen must preserve Bézier handles as cubic source')
  await board.locator('[data-panel="panel_1"]').first().waitFor({state:'attached',timeout:8000}).catch(()=>{})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'vector-pencil'}})))
  await board.locator('svg[data-native-tool="vector-pencil"]').waitFor({timeout:10000})
  await sleep(600)
  const circle=await board.locator('svg[data-native-tool]').evaluate(svg=>{
    const matrix=svg.getScreenCTM()
    return Array.from({length:46},(_,i)=>{
      const theta=2*Math.PI*i/45
      const p=new DOMPoint(-.12+.13*Math.cos(theta),-.15+.12*Math.sin(theta)).matrixTransform(matrix)
      return {x:p.x,y:p.y}
    })
  })
  console.log('PENCIL_EXPECTED_SCREEN',JSON.stringify({first:circle[0],quarter:circle[11],half:circle[23],last:circle.at(-1)}))
  await page.mouse.move(circle[0].x,circle[0].y)
  await page.mouse.down()
  for(const p of circle.slice(1))await page.mouse.move(p.x,p.y)
  await page.mouse.up()
  let afterPencil
  for(let i=0;i<45;i++){
    afterPencil=await call({op:'snapshot'})
    if(afterPencil.revision>saved.revision)break
    await sleep(400)
  }
  console.log('PENCIL_SUBMITTED',JSON.stringify(submittedPolygons.map(poly=>{
    const points=poly.points||[]
    const pairs=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]))
    return {count:points.length,first:points.slice(0,5),last:points.slice(-5),maxJump:Math.max(...pairs)}
  })))
  assert(afterPencil.revision>saved.revision,'Pencil must create a native garment pattern')
  const created=afterPencil.template.panels.filter(p=>p.id.startsWith('panel_'))
  assert(created.length===2,'Pen and Pencil must create separate persistent panels')
  assert(created[1].polygon.points.length>=3&&created[1].polygon.points.length<=64,
    'Pencil simplification must preserve an editable capped anchor budget')
  assert(Object.keys(created[1].polygon.curves||{}).length>0,'Pencil must persist fitted native curve handles')
  const plannedMarks=teeBalanceNotchCommands(afterPencil.template)
  assert.equal(plannedMarks.length,6,'T-shirt requires two single front and two double back notch groups')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'sewing-match-notches'}})))
  let withNotches
  for(let i=0;i<90;i++){
    withNotches=await call({op:'snapshot'})
    const front=withNotches.template.panels.find(p=>p.id==='front')
    const back=withNotches.template.panels.find(p=>p.id==='back')
    const total=[front,back].reduce((n,p)=>n+Object.values(p.polygon?.notches||{}).reduce((m,v)=>m+v.length,0),0)
    if(total>=6)break
    await sleep(250)
  }
  const front=withNotches.template.panels.find(p=>p.id==='front')
  const back=withNotches.template.panels.find(p=>p.id==='back')
  assert.equal(Object.values(front.polygon.notches||{}).reduce((n,v)=>n+v.length,0),2,'Front needs single marks on both armholes')
  assert.equal(Object.values(back.polygon.notches||{}).reduce((n,v)=>n+v.length,0),4,'Back needs double marks on both armholes')
  const finalRevision=withNotches.revision
  assert.equal(errors.length,0,'Browser errors: '+errors.join(', '))
  assert.equal(failed.length,0,'Native API errors: '+failed.join(', '))
  const screenshot=path.join(output,'vector-pen-pencil-native.png')
  await board.screenshot({path:screenshot})
  console.log(JSON.stringify({pass:true,output,screenshot,revisions:[saved.revision,afterPencil.revision,finalRevision],
    penCurves:Object.keys(pattern.polygon.curves).length,pencilAnchors:created[1].polygon.points.length,
    pencilCurves:Object.keys(created[1].polygon.curves).length,notches:{front:2,back:4},errors,failed},null,2))
}catch(error){
  const screenshot=path.join(output,'vector-pen-pencil-failure.png')
  await page?.screenshot({path:screenshot}).catch(()=>{})
  console.error(JSON.stringify({pass:false,output,screenshot,error:String(error.stack||error),errors,failed},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
