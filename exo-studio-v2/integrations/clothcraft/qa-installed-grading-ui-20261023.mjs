// Native grading dialogs: edit only a disposable Rust garment fixture.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-grade-popup-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary='/Users/mikylecouto/Applications/EXO ClothCraft Studio V2.app/Contents/Resources/research/oss/clothcraft/target/debug/exo-session'
assert(existsSync(binary),'Native Rust binary required')
const port=6300+Math.floor(Math.random()*150),native='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+(port+200)
const children=[],requests=[],responses=[],errors=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<130;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1100)})).ok)return}catch{}await sleep(200)}
 throw Error('Fixture not responding: '+url)
}
function width(snapshot,panelId){
 const points=snapshot?.template?.panels?.find(p=>p.id===panelId)?.polygon?.points||[]
 return points.length>1?(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*1000:NaN
}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'
 })
 launch(path.join(root,'node_modules/.bin/vite'),['preview','--outDir','/tmp/exo-v2-grading-release-20261023','--host','127.0.0.1','--port',String(port+200),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1660,height:1010}})
 page.setDefaultTimeout(20000)
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  let payload={};try{payload=route.request().postDataJSON()}catch{}
  requests.push(payload)
  const response=await route.fetch({url:native+'/workspace',headers})
  try{const json=await response.json();responses.push({op:payload.op,body:json.data||json,error:json.error})}catch{}
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 await page.locator('[data-clo-slot="2d:A06"]').click()
 const primitive=page.locator('[data-native-base-polygon="true"]')
 await primitive.waitFor({state:'visible'})
 await primitive.getByRole('button',{name:'Create native pattern'}).click()
 await primitive.waitFor({state:'hidden',timeout:15000})
 const created=responses.filter(r=>r.body?.template?.panels?.length>2).at(-1)?.body
 const fresh=created?.template?.panels?.at(-1)
 assert(fresh?.id,'Disposable unsewn rectangle required for grading')
 const a16=page.locator('[data-clo-slot="2d:A16"]')
 const a17=page.locator('[data-clo-slot="2d:A17"]')
 const modal=page.locator('[data-clo-floating-widget="grading"]')
 await a16.click()
 await modal.waitFor({state:'visible'})
 await modal.getByRole('tab',{name:'Resize'}).click()
 assert.equal(await a16.getAttribute('aria-pressed'),'true')
 assert.equal(await modal.locator('[data-grading-variant]').getAttribute('data-grading-variant'),'manual')
 await modal.getByRole('combobox',{name:'Pattern to grade'}).selectOption(fresh.id)
 const widthInput=modal.getByRole('spinbutton',{name:'Grade width delta millimetres'})
 await widthInput.fill('')
 assert.equal(await modal.locator('[data-native-grade-apply]').isDisabled(),true,'Blank grade must not become zero')
 await widthInput.fill('-500')
 assert.equal(await modal.locator('[data-native-grade-apply]').isDisabled(),true,'Collapsed pattern must be blocked')
 await widthInput.fill('17')
 assert.match(await modal.locator('[data-grade-dimensions]').innerText(),/Before:.*mm/)
 const initial=await modal.boundingBox(),header=await modal.locator('.clo-floating-tool-header').boundingBox()
 await page.mouse.move(header.x+header.width/2,header.y+header.height/2)
 await page.mouse.down()
 await page.mouse.move(header.x+header.width/2-78,header.y+header.height/2+83,{steps:8})
 await page.mouse.up()
 const moved=await modal.boundingBox()
 assert(Math.abs(moved.x-initial.x)>35&&Math.abs(moved.y-initial.y)>35,'Floating grading widget must be draggable')
 await modal.getByRole('combobox',{name:'Pattern to grade'}).selectOption(fresh.id)
 await modal.getByRole('spinbutton',{name:'Grade width delta millimetres'}).fill('17')
 await modal.getByRole('spinbutton',{name:'Grade height delta millimetres'}).fill('9')
 assert.match(await modal.locator('.clo-grading-preview').innerText(),/17.*9.*mm/)
 const manualScreenshot=path.join(root,'docs/qa/grading-release-20261023','manual.png')
 await page.screenshot({path:manualScreenshot})
 const before=responses.filter(r=>r.body?.template?.panels?.length>2).at(-1)?.body
 await modal.locator('[data-native-grade-apply="true"]').click()
 await modal.waitFor({state:'hidden',timeout:15000})
 const firstRequest=requests.filter(r=>r.op==='grade-pattern').at(-1)
 assert.equal(firstRequest?.panel,fresh.id)
 assert.equal(firstRequest.width_delta_mm,17)
 assert.equal(firstRequest.height_delta_mm,9)
 const firstResult=responses.filter(r=>r.op==='grade-pattern').at(-1)?.body
 assert(Math.abs(width(firstResult,fresh.id)-width(before,fresh.id)-17)<.01,'Manual Rust grade must change polygon width 17 mm')
 assert.equal(await a16.getAttribute('aria-pressed'),'false','Blue selection must clear when grade applies')
 await a17.click()
 await modal.waitFor({state:'visible'})
 await modal.getByRole('tab',{name:'Resize'}).click()
 assert.equal(await a17.getAttribute('aria-pressed'),'true')
 assert.equal(await modal.locator('[data-grading-variant]').getAttribute('data-grading-variant'),'auto')
 await modal.getByRole('combobox',{name:'Pattern to grade'}).selectOption(fresh.id)
 await modal.getByRole('combobox',{name:'Auto grading increment'}).selectOption('-1')
 await modal.getByRole('spinbutton',{name:'Grade width per size millimetres'}).fill('12.5')
 await modal.getByRole('spinbutton',{name:'Grade height per size millimetres'}).fill('6.25')
 assert.match(await modal.locator('.clo-grading-preview').innerText(),/-12.5.*-6.25.*mm/)
 const autoScreenshot=path.join(root,'docs/qa/grading-release-20261023','auto.png')
 await page.screenshot({path:autoScreenshot})
 await modal.locator('[data-native-grade-apply="true"]').click()
 await modal.waitFor({state:'hidden',timeout:15000})
 const secondRequest=requests.filter(r=>r.op==='grade-pattern').at(-1)
 assert.equal(secondRequest.width_delta_mm,-12.5)
 assert.equal(secondRequest.height_delta_mm,-6.25)
 const secondResult=responses.filter(r=>r.op==='grade-pattern').at(-1)?.body
 assert(Math.abs(width(secondResult,fresh.id)-width(firstResult,fresh.id)+12.5)<.01,'Auto Rust grade must shrink polygon width 12.5 mm')
 const rpc=async body=>{const r=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json();assert.equal(v.ok,true,v.error);return v.data}
 const saved=await rpc({op:'save'})
 const reopened=await rpc({op:'open',project:saved.project})
 assert.deepEqual(reopened.template.panels.find(p=>p.id===fresh.id).polygon,secondResult.template.panels.find(p=>p.id===fresh.id).polygon,'Graded shape must survive reopen')
 await a16.click()
 await modal.waitFor({state:'visible'})
 await modal.getByRole('tab',{name:'Resize'}).click()
 const downloadPromise=page.waitForEvent('download')
 await modal.getByRole('button',{name:'Export reference sheet',exact:true}).click()
 const download=await downloadPromise
 const svg=readFileSync(await download.path(),'utf8')
 assert.match(svg,/width="[0-9.]+mm" height="[0-9.]+mm"/)
 assert.match(svg,/data-print-calibration="100mm"/)
 const printResult=await page.evaluate(text=>{const svg=new DOMParser().parseFromString(text,'image/svg+xml').documentElement;return {width:svg.getAttribute('width'),height:svg.getAttribute('height'),viewBox:svg.getAttribute('viewBox'),calibration:svg.querySelector('rect')?.getAttribute('width'),error:svg.querySelector('parsererror')?.textContent}},svg)
 assert(!printResult.error);assert.equal(printResult.calibration,'100')
 assert.equal(parseFloat(printResult.width),Number(printResult.viewBox.split(' ')[2]))
 assert.equal(parseFloat(printResult.height),Number(printResult.viewBox.split(' ')[3]))
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,manualDeltaMm:17,autoDeltaMm:-12.5,drag:[Math.round(moved.x-initial.x),Math.round(moved.y-initial.y)],validation:true,customIncrements:true,saveReopen:true,printResult,screenshots:[manualScreenshot,autoScreenshot],errors}))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
