// Isolated Rust + Vite + Chrome QA for active EXO tool cursors.
// All garment state is temporary; this script never opens a user project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-free-sewing-cursors-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const port=6750+Math.floor(Math.random()*100),api='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+(port+130)
const children=[],errors=[],checks=[]
const start=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,env:{...process.env,...env},detached:true,stdio:'ignore'})
  children.push(child)
}
const ready=async url=>{
  for(let n=0;n<160;n++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await delay(200)}
  throw Error('QA service could not start: '+url)
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+130),'--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api,
  })
  await Promise.all([ready(api+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1680,height:1060}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:api+'/workspace',headers,timeout:45000})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=free-sewing-cursors',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board'),svg=board.locator('svg[data-native-tool]')
  await board.locator('[data-edge]').first().waitFor({timeout:60000})
  const button=slot=>page.locator('[data-clo-slot="'+slot+'"]')
  const svgCursor=()=>svg.evaluate(element=>getComputedStyle(element).cursor)
  const canvas=page.locator('.cc-viewport-3d canvas').first()
  const canvasCursor=()=>canvas.evaluate(element=>({tool:element.dataset.activeToolCursor,cursor:getComputedStyle(element).cursor}))
  for(const file of ['sewing-machine.svg','cad-not ch.svg'.replace(' ',''),'cad-points.svg','cad-pen.svg','cad-measure.svg','cad-brush.svg','cad-move.svg']){
    assert.equal((await page.request.get(ui+'/cursors/'+file)).status(),200,'Cursor asset missing: '+file)
  }
  await button('2d:B02').click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
  assert.match(await svgCursor(),/sewing-machine\.svg/)
  checks.push('Segment Sewing: sewing-machine pointer')

  await button('2d:B03').click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
  assert.match(await svgCursor(),/sewing-machine\.svg/,'Free Sewing cursor missing')
  assert(await board.locator('[data-free-sew-candidate="true"]').count()>5,'Free Sewing edges missing')
  assert.match(await board.locator('[data-free-sew-hint]').innerText(),/Free Sewing/)
  const edge=board.locator('[data-free-sew-candidate="true"]').first()
  assert.match(await edge.evaluate(element=>getComputedStyle(element).cursor),/sewing-machine\.svg/)
  await edge.evaluate(element=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})))
  await page.waitForFunction(()=>/EDGE A/.test(document.querySelector('.cc-native-sewing-pair')?.textContent||''),null,{timeout:6000})
  checks.push('Free Sewing: mouse icon, selectable edges, single-edge selection, hint')

  for(const [slot,tool,icon] of [
    ['2d:A02','point','cad-points.svg'],['2d:A08','notch','cad-notch.svg'],
    ['2d:A04','polygon','cad-polygon.svg'],['2d:A05','internal','cad-pen.svg'],
  ]){
    await button(slot).click()
    await page.waitForFunction(tool=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool===tool,tool)
    assert.match(await svgCursor(),new RegExp(icon.replace('.','\\.')),'Incorrect 2D '+tool+' cursor')
    checks.push('2D '+tool+': custom cursor')
  }
  await button('2d:A01').click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='select')
  assert.doesNotMatch(await svgCursor(),/sewing-machine\.svg/,'Sewing pointer leaked into selection')
  checks.push('Leaving Free Sewing clears the sewing-machine pointer')

  for(const [slot,tool,icon] of [
    ['3d:A20','garment-measure','cad-measure.svg'],
    ['3d:B03','line-3d','cad-pen.svg'],
    ['3d:A03','mesh-brush','cad-brush.svg'],
    ['3d:A02','move','cad-move.svg'],
  ]){
    await button(slot).click()
    await page.waitForFunction(tool=>document.querySelector('.cc-viewport-3d canvas')?.dataset.activeToolCursor===tool,tool,{timeout:12000})
    const result=await canvasCursor()
    assert.match(result.cursor,new RegExp(icon.replace('.','\\.')),'Incorrect 3D '+tool+' cursor')
    checks.push('3D '+tool+': custom cursor')
  }
  assert.deepEqual(errors,[],'Browser JavaScript errors')
  console.log(JSON.stringify({pass:true,checks,errors,isolatedWorkspace:output},null,2))
}catch(error){
  console.error(JSON.stringify({pass:false,error:error.stack||String(error),checks,errors,isolatedWorkspace:output},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
