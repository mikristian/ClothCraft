import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-wk-inline-'))
// Local native service intentionally allowlists 5286 as a trusted 2D host.
const api='http://127.0.0.1:5449',ui='http://127.0.0.1:5286'
const children=[]
const start=(cmd,args,env={})=>children.push(spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}}))
const wait=async url=>{
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(750)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Did not start '+url)
}
const call=async body=>{
  const response=await(await fetch(api+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json()
  assert.ok(response.ok,response.error||'native backend failed')
  return response.data
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5449',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([wait(ui),wait(api+'/health')])
  await call({op:'open',preset:'tshirt'})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  // Load Chromium as Chromium to avoid Vite's Safari compatibility redirects.
  // Once the app loads, emulate WKWebView's userAgent for the measurement
  // renderer. This exercises fallback geometry independent of SVG text.
  const page=await browser.newPage({viewport:{width:1510,height:965}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&wk=20261025',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board'),svg=board.locator('svg[data-native-tool]').first()
  await svg.waitFor({state:'visible',timeout:40000})
  await page.evaluate(()=>Object.defineProperty(navigator,'userAgent',{configurable:true,
    get:()=> 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'}))
  // EXO's minimal embedded workspace can omit the main-shell .workspaces
  // wrapper entirely; use the existing 2D event instead of assuming layout.
  await page.waitForTimeout(500)
  for(let attempt=0;attempt<4;attempt++){
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
      {detail:{tool:'vector-pen'}})))
    await page.waitForTimeout(200)
    if(await svg.getAttribute('data-native-tool')==='vector-pen')break
  }
  console.log('ACTIVE_TOOL_AFTER_SWITCH',await svg.getAttribute('data-native-tool'),
    'boardCount',await page.locator('.cc-board').count(),
    'penButtonCount',await page.locator('[data-pattern-design-tool="vector-pen"]').count())
  assert.equal(await svg.getAttribute('data-native-tool'),'vector-pen','2D tool switch failed')
  const rect=await svg.boundingBox()
  assert.ok(rect)
  const p1={x:rect.x+rect.width*.49,y:rect.y+rect.height*.76}
  const p2={x:p1.x+Math.min(125,rect.width*.16),y:p1.y+4}
  await page.mouse.click(p1.x,p1.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'1')
  await page.mouse.move(p2.x,p2.y,{steps:7})
  await board.locator('[data-native-line-measure="live"]').waitFor({state:'visible',timeout:7000})
  const live=board.locator('[data-native-line-measure="live"]')
  const previewMetres=Number(await live.getAttribute('data-pen-inline-visible-metres'))
  assert.ok(previewMetres>0)
  await page.mouse.click(p2.x,p2.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'2')
  const completed=board.locator('[data-native-line-measure="draft"][data-native-measure-segment="0"]')
  await completed.waitFor({state:'visible',timeout:7000})
  const committedMetres=Number(await completed.getAttribute('data-pen-inline-visible-metres'))
  assert.ok(committedMetres>0)
  const geometry=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(items=>
    items.map(item=>[Number(item.getAttribute('cx')),Number(item.getAttribute('cy'))]))
  assert.equal(geometry.length,2)
  const physical=Math.hypot(...geometry[1].map((v,i)=>v-geometry[0][i]))
  assert.ok(Math.abs(committedMetres-physical)<1e-7,'Finished segment label must match actual drafted material')
  const completedPosition=await completed.boundingBox()
  assert.ok(completedPosition&&Math.abs((completedPosition.x+completedPosition.width/2)-(p1.x+p2.x)/2)<35,
    'Completed measurement must sit next to the actual drafted line')

  // Selecting an existing real Rust pattern edge (the yellow highlight)
  // must expose its length locally, not only inside the right-hand inspector.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='point')
  const edge=board.locator('[data-2d-edge-hit]').first()
  await edge.waitFor({state:'attached',timeout:7000})
  const edgeKey=await edge.getAttribute('data-2d-edge-hit')
  const hit=await edge.evaluate(el=>{
    const p=el.getPointAtLength(el.getTotalLength()*.5).matrixTransform(el.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.click(hit.x,hit.y)
  const selected=board.locator('[data-native-line-measure="selected"]')
  await selected.waitFor({state:'visible',timeout:7000})
  assert.ok((await selected.textContent()).includes('mm'))
  const selectedMetres=Number(await selected.getAttribute('data-pen-inline-visible-metres'))
  assert.ok(selectedMetres>0,'Selected yellow Rust edge needs a nonzero physical arclength')
  assert.equal((await selected.getAttribute('data-native-measure-panel'))+':'+
    (await selected.getAttribute('data-native-measure-edge')),edgeKey)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,webkitUserAgent:true,layout:'2d-board',
    live:await live.count()>=0,finishedPenMetres:committedMetres,
    yellowEdgeMetres:selectedMetres,edgeKey,jsErrors:errors.length}))
}finally{
  await browser?.close()
  for(const child of children){
    try{process.kill(-child.pid,'SIGTERM')}catch{}
  }
}
