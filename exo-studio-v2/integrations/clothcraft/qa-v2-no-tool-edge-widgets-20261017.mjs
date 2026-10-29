// Disposable Rust + Vite + Chrome regression of tool overlays, native inspector and cursor.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,existsSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-no-tool-widgets-'))
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(bin),'Rust session binary missing')
const port=26000+Math.floor(Math.random()*10000),api='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+(port+1)
const children=[],errors=[],checks=[],absent=['.cc-board-context-tools','.cc-segment-sewing-hint','.cc-embedded-bottom','.clo-floating-tool']
const start=(bin,args,env={})=>{const child=spawn(bin,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
const ready=async url=>{for(let i=0;i<150;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(160)}throw Error('Timeout '+url)}
let browser
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:bin,EXO_CLOTHCRAFT_GPU:'0'})
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+1),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1750,height:1100}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{const headers={...route.request().headers()};delete headers.origin;const response=await route.fetch({url:api+'/workspace',headers});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})})
 await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=no-tool-widgets',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board svg').first().waitFor({timeout:55000})
 const check=async(id,cursorName,propertySelector)=>{
  const button=page.locator('[data-clo-slot="'+id+'"]').first()
  await button.click()
  await sleep(220)
  const overlays=await page.evaluate(selectors=>selectors.map(selector=>({selector,visible:[...document.querySelectorAll(selector)].some(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})})),absent)
  assert(overlays.every(o=>!o.visible),id+' overlay found: '+JSON.stringify(overlays))
  const cursor=await page.locator('.cc-board svg').first().evaluate(e=>getComputedStyle(e).cursor)
  if(cursorName)assert(cursor.includes(cursorName),id+' canvas cursor '+cursor)
  let property=null
  if(propertySelector){
   const ctl=page.locator(propertySelector).first()
   await ctl.waitFor({state:'visible',timeout:5500})
   assert(await ctl.evaluate(e=>!!e.closest('.clo-pe-list')),id+' essential settings absent from Property Editor')
   property=propertySelector
  }
  checks.push({id,cursor,overlays,property,pass:true})
 }
 await check('2d:B02','sewing-machine.svg')
 await check('2d:B03','sewing-machine.svg','[data-native-free-sewing-settings]')
 await check('2d:A04','cad-polygon.svg')
 await check('2d:A05','cad-pen.svg')
 await check('2d:A08','cad-notch.svg')
 await check('2d:A03',null,'[data-native-fullness]')
 await check('2d:B04')
 await check('2d:A16',null,'[data-native-grade-pattern]')
 await check('2d:B15',null,'[data-native-fill-panel]')
 assert.deepEqual(errors,[],'Browser page errors')
 console.log(JSON.stringify({pass:true,output,checks,errors},null,2))
 writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,checks,errors},null,2))
}catch(error){
 const report={pass:false,output,checks,error:error.stack||String(error),errors}
 writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2))
 console.error(JSON.stringify(report,null,2))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
