// Real pointer selection, movement, measurements and Rust persistence.
// Runs against a disposable native workspace and a dedicated Vite port.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-2d-graphic-drag-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativePort=6490+Math.floor(Math.random()*80),uiPort=nativePort+170
const native='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort,children=[]
const requests=[],errors=[]
function launch(command,args,env={}){const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
async function ready(url){for(let i=0;i<125;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error('Fixture unavailable: '+url)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1040}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  let request={}
  try{request=route.request().postDataJSON()}catch{}
  requests.push(request)
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel="front"]').first().waitFor({timeout:45000})
 await page.getByRole('tab',{name:'Graphic',exact:true}).click()
 const editor=page.locator('#cc-native-graphic-editor .cc-graphic-editor')
 await editor.waitFor({state:'visible',timeout:15000})
 const art='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#e35238"/></svg>'
 await editor.locator('input[type=file]').first().setInputFiles({name:'drag-test.svg',mimeType:'image/svg+xml',buffer:Buffer.from(art)})
 const graphic=page.locator('.cc-board image[data-2d-graphic]').first()
 await graphic.waitFor({state:'visible',timeout:20000})
 const id=await graphic.getAttribute('data-2d-graphic')
 assert(id,'2D graphic id')
 const selected=page.locator('[data-2d-graphic-item="'+id+'"]')
 const measurement=page.locator('[data-2d-graphic-measure-box="'+id+'"]')
 await measurement.waitFor({state:'attached'})
 assert.equal(await measurement.getAttribute('data-measurements-visible'),'true','Default selected graphic rulers enabled')
 assert.equal(Number(await measurement.getAttribute('data-graphic-width-mm')),100)
 const toggle=page.getByRole('button',{name:'Show graphic measurement box'})
 assert.equal(await toggle.getAttribute('aria-pressed'),'true')
 await toggle.click()
 assert.equal(await measurement.getAttribute('data-measurements-visible'),'false')
 assert.equal(await toggle.getAttribute('aria-pressed'),'false')
 assert.equal(await measurement.locator('rect').count(),0,'OFF removes the visible graphic bounds')
 assert.equal(await editor.getByRole('checkbox',{name:'Show graphic measurements in 2D'}).isChecked(),false)
 await editor.getByRole('checkbox',{name:'Show graphic measurements in 2D'}).check()
 assert.equal(await measurement.getAttribute('data-measurements-visible'),'true')
 const x=editor.getByRole('spinbutton',{name:'X position (mm)'})
 const y=editor.getByRole('spinbutton',{name:'Y position (mm)'})
 const initialX=Number(await x.inputValue()),initialY=Number(await y.inputValue())
 const firstBox=await graphic.boundingBox()
 assert(firstBox?.width>10&&firstBox.height>10,'Visible graphic box')
 const cx=firstBox.x+firstBox.width/2,cy=firstBox.y+firstBox.height/2
 assert.equal(await page.locator('[data-2d-graphic-hit="'+id+'"]').getAttribute('pointer-events'),'all',
  'Graphic must be directly selectable from the 2D canvas')
 await page.mouse.move(cx,cy)
 await page.mouse.down()
 await page.mouse.move(cx+8,cy+5,{steps:8})
 await page.mouse.up()
 await page.waitForFunction(({initialX,initialY})=>{
  const inputs=document.querySelectorAll('#cc-native-graphic-editor .cc-graphic-number-grid input')
  return inputs.length>=2&&(Math.abs(Number(inputs[0].value)-initialX)>2||Math.abs(Number(inputs[1].value)-initialY)>2)
 },{initialX,initialY},{timeout:8000})
 const movedX=Number(await x.inputValue()),movedY=Number(await y.inputValue())
 assert(Math.abs(movedX-initialX)>2,'Drag must change material-space X')
 assert(Math.abs(movedY-initialY)>2,'Drag must change material-space Y')
 assert.equal(await selected.getAttribute('data-graphic-selected'),'true')
 const screenshot=path.join(root,'screenshots','exo-v2-2d-graphic-selection-measurements-20261017.png')
 await page.screenshot({path:screenshot})
 await page.waitForFunction(()=>document.querySelector('.cc-notice')?.textContent.includes('Rust saved the artwork'),null,{timeout:12000})
 assert(requests.filter(r=>r.op==='graphics-set').some(r=>r.printGraphics?.some(g=>g.id===id&&Math.abs(g.positionMm[0]-movedX)<.2&&Math.abs(g.positionMm[1]-movedY)<.2)),'Position must be saved through native graphics-set')
 // Clicking artwork on the pattern reselects it and opens the Graphic
 // inspector, even after the user navigated to another object category.
 await page.getByRole('tab',{name:'Fabric',exact:true}).click()
 await page.locator('[data-2d-graphic-hit="'+id+'"]').click()
 await page.waitForFunction(()=>document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.includes('Graphic'),null,{timeout:5000})
 assert.equal(await page.locator('[data-2d-graphic-item="'+id+'"]').getAttribute('data-graphic-selected'),'true')
 await page.locator('#cc-native-graphic-editor .cc-graphic-number-grid input').first().waitFor()
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-2d-graphic="'+id+'"]').waitFor({state:'visible',timeout:35000})
 await page.getByRole('tab',{name:'Graphic',exact:true}).click()
 const reloaded=page.locator('#cc-native-graphic-editor .cc-graphic-number-grid input')
 await reloaded.first().waitFor({timeout:15000})
 assert(Math.abs(Number(await reloaded.nth(0).inputValue())-movedX)<.2)
 assert(Math.abs(Number(await reloaded.nth(1).inputValue())-movedY)<.2)
 assert.equal(await page.getByRole('button',{name:'Show graphic measurement box'}).getAttribute('aria-pressed'),'true')
 assert.deepEqual(errors,[],'No React or WebGL errors')
 console.log(JSON.stringify({pass:true,selectedId:id,initialMm:[initialX,initialY],movedMm:[movedX,movedY],measurementToggle:true,nativePersisted:true,reload:true,errors,screenshot},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
