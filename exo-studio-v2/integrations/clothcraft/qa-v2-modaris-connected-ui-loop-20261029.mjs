// Connected Modaris-style 2D UI smoke test against an isolated real Rust session.
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
  const svg=board.locator('svg[data-native-tool]')
  const choose=async(tool)=>{
    await page.evaluate(name=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:name}})),tool)
    await board.locator(`svg[data-native-tool="${tool}"]`).waitFor({state:'visible'})
  }
  const count=()=>svg.getAttribute('data-vector-draft-count')
  // Exercise actual toolbar clicks as well as the custom-event command router.
  const selectButton=board.locator('[data-tool-family="select"]>button')
  const polygonButton=board.locator('[data-tool-family="polygon"]>button')
  await selectButton.waitFor({state:'visible'})
  await selectButton.click()
  await board.locator('svg[data-native-tool="select"]').waitFor({state:'visible'})
  await polygonButton.waitFor({state:'visible'})
  await polygonButton.click()
  await board.locator('svg[data-native-tool="polygon"]').waitFor({state:'visible'})
  await choose('vector-pen')
  const pen=board.locator('[data-tool-family="vector-pen"]>button')
  const direct=board.locator('[data-tool-family="direct-select"]>button')
  const polygon=board.locator('[data-tool-family="polygon"]>button')
  await pen.waitFor({state:'visible'});await direct.waitFor({state:'visible'});await polygon.waitFor({state:'visible'})
  const positions=await Promise.all([pen.boundingBox(),direct.boundingBox(),polygon.boundingBox()])
  assert(positions.every(Boolean)&&Math.abs(positions[0].y-positions[1].y)<6&&positions[1].x<positions[0].x,
    'Direct Selection must be immediately left of Pen/Pencil')
  assert(positions[2].y>positions[0].y,'Draw Pattern Polygon belongs lower in the toolbar')
  await svg.focus()
  await page.keyboard.down('Alt')
  await board.locator('svg[data-native-tool="anchor-point"][data-option-anchor-active="true"]').waitFor({state:'visible'})
  await page.keyboard.up('Alt')
  await board.locator('svg[data-native-tool="vector-pen"][data-option-anchor-active="false"]').waitFor({state:'visible'})
  await svg.focus()
  await page.keyboard.down('Shift')
  await board.locator('svg[data-native-tool="anchor-point"][data-shift-anchor-active="true"]').waitFor({state:'visible'})
  await page.keyboard.up('Shift')
  await board.locator('svg[data-native-tool="vector-pen"]').waitFor({state:'visible'})
  await choose('vector-pencil')
  await svg.focus()
  await page.keyboard.down('Alt')
  await board.locator('svg[data-native-tool="anchor-point"][data-option-anchor-active="true"]').waitFor({state:'visible'})
  await page.keyboard.up('Alt')
  await board.locator('svg[data-native-tool="vector-pencil"]').waitFor({state:'visible'})
  await choose('vector-pen')
  const start=await screenAt([-.55,.64]),middle=await screenAt([-.30,.64])
  console.log('PEN_SCREEN_POINTS',JSON.stringify({start,middle}))
  await page.mouse.move(start.x,start.y)
  await page.mouse.down();await page.mouse.up()
  console.log('FIRST_PEN_CLICK',await count())
  await page.mouse.move(middle.x,middle.y)
  await page.mouse.down();await page.mouse.up()
  console.log('PEN_ANCHOR_COUNT_BEFORE_ESCAPE',await count())
  assert.equal(await count(),'2','Both Pen clicks must create real anchors without a hover flyout stealing the first')
  await svg.focus()
  const before=await count()
  await page.keyboard.press('Escape')
  assert.equal(await count(),'0','Escape releases the active Pen contour')
  assert.equal(await board.getAttribute('data-pen-open-contours'),'1','Escape preserves the contour independently')
  assert.equal(await board.locator('[data-parked-pen-anchor]').count(),Number(before),
    'Escape must leave every drawn anchor intact')
  assert.equal(await board.getAttribute('data-pen-paused'),'true')
  const fresh=await screenAt([-.02,.45])
  await page.mouse.move(fresh.x,fresh.y)
  await page.mouse.down();await page.mouse.up()
  assert.equal(await count(),'1','After Escape a new click must start a new contour, not continue the old one')
  assert.equal(await board.getAttribute('data-pen-open-contours'),'1','Starting a new contour must keep the first parked contour')
  await svg.focus()
  await page.keyboard.press('Escape')
  assert.equal(await count(),'0')
  assert.equal(await board.getAttribute('data-pen-open-contours'),'2','The new contour also parks independently')
  assert.equal(await board.locator('[data-parked-pen-anchor]').count(),Number(before)+1,
    'Both prior points and the new path remain visible')
  await page.keyboard.down('Alt')
  await board.locator('svg[data-native-tool="anchor-point"][data-option-anchor-active="true"]').waitFor({state:'visible'})
  assert.equal(await board.locator('[data-parked-pen-anchor]').count(),Number(before)+1)
  // Option must be a usable convert-anchor gesture, not only a visual tool
  // switch. Holding it during a drag must create an actual cubic tangent.
  await page.mouse.move(middle.x,middle.y)
  await page.mouse.down()
  await page.mouse.move(middle.x+17,middle.y-13,{steps:7})
  await page.mouse.up()
  const convertedDuringOption=await board.locator('[data-vector-pen-handle]').count()
  assert(convertedDuringOption>=2,'Option-drag must convert the draft corner into a curved anchor')
  await page.keyboard.up('Alt')
  await board.locator('svg[data-native-tool="vector-pen"]').waitFor({state:'visible'})
  assert.equal(await count(),before)
  await choose('direct-select')
  assert.equal(await count(),before,'Standalone Direct Selection preserves current Pen draft')
  const priorHandles=await board.locator('[data-vector-pen-handle]').count()
  await board.locator('[data-vector-pen-anchor-hit="0"]:not([data-parked-pen-anchor])').dblclick({force:true})
  const draftKnob=board.locator('[data-anchor-circle-kind="draft"] [data-anchor-curve-handle="true"]')
  await draftKnob.waitFor({state:'visible'})
  assert.equal(await board.locator('[data-anchor-curve-popup="true"]').count(),0,
    'Rectangular curve editor must not appear after double-click')
  const dk=await draftKnob.boundingBox()
  await page.mouse.move(dk.x+dk.width/2,dk.y+dk.height/2)
  await page.mouse.down()
  await page.mouse.move(dk.x+dk.width/2+20,dk.y+dk.height/2+22,{steps:8})
  await page.mouse.up()
  const afterHandles=await board.locator('[data-vector-pen-handle]').count()
  assert(afterHandles>priorHandles,'Dragging the circular draft knob creates Bézier handles')
  await choose('vector-pen')
  await svg.click({button:'right',position:{x:260,y:195}})
  const mirror=board.getByRole('menuitemcheckbox',{name:'Mirror'})
  await mirror.waitFor({state:'visible'})
  await mirror.click()
  assert.equal(await board.locator('[data-pencil-mirror-active]').count(),1)
  await choose('vector-pencil')
  await svg.click({button:'right',position:{x:260,y:195}})
  await mirror.waitFor({state:'visible'})
  assert.equal(await mirror.getAttribute('aria-checked'),'true')
  const grip=board.getByRole('button',{name:'Move anchor toolbar'})
  await choose('direct-select')
  await grip.waitFor({state:'visible'})
  const startBox=await grip.boundingBox()
  await page.mouse.move(startBox.x+startBox.width/2,startBox.y+startBox.height/2)
  await page.mouse.down()
  await page.mouse.move(startBox.x+startBox.width/2-62,startBox.y+startBox.height/2+58,{steps:6})
  await page.mouse.up()
  const finalBox=await grip.boundingBox()
  assert(Math.hypot(finalBox.x-startBox.x,finalBox.y-startBox.y)>10,'Toolbar grip should move the toolbar')
  // Check the OTHER Direct Selection path as well: an actual native Rust
  // garment vertex, after choosing a panel, must open the curve dialog.
  await choose('select')
  await board.locator('[data-panel="front"][data-pattern-surface="drafting-paper"]').click({force:true})
  await choose('direct-select')
  const nativeVertex=board.locator('[data-pattern-anchor-index][data-panel-id="front"]').first()
  await nativeVertex.waitFor({state:'visible'})
  await nativeVertex.dblclick({force:true})
  const nativeKnob=board.locator('[data-anchor-circle-kind="native"] [data-anchor-curve-handle="true"]')
  await nativeKnob.waitFor({state:'visible'})
  assert.equal(await board.locator('[data-anchor-circle-radius-guide="true"]').count(),1)
  const nk=await nativeKnob.boundingBox()
  await page.mouse.move(nk.x+nk.width/2,nk.y+nk.height/2)
  await page.mouse.down()
  await page.mouse.move(nk.x+nk.width/2+8,nk.y+nk.height/2+14,{steps:7})
  assert(await board.locator('[data-anchor-circle-tangent-guide]').count()>=1,
    'The native curve circle must show editable tangent guidelines during drag')
  await page.mouse.up()
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,selectToolbarClick:true,polygonToolbarClick:true,sideBySide:true,optionPen:true,optionPencil:true,optionCurveDrag:true,shiftPreserved:true,escapeKeepsPoints:true,directSelectDoubleClick:true,mirror:true,anchorToolbarDraggable:true,errors},null,2))
}catch(error){
  const screenshot=path.join(output,'vector-pen-pencil-failure.png')
  await page?.screenshot({path:screenshot}).catch(()=>{})
  console.error(JSON.stringify({pass:false,output,screenshot,error:String(error.stack||error),errors,failed},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
