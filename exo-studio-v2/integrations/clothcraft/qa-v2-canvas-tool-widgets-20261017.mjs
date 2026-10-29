// Disposable native Rust + Vite browser acceptance for canvas tool widgets.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-canvas-widgets-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Native Rust exo-session required')
const port=6650+Math.floor(Math.random()*120),native='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+(port+200)
 const children=[],requests=[],responses=[],checks=[],errors=[],failures=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}await sleep(250)}
 throw Error('Timed out waiting for '+url)
}
function check(name,condition){assert(condition,name);checks.push(name)}
function soft(name,condition){if(condition)checks.push(name);else failures.push(name)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+200),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1660,height:1010}})
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
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 const svg=page.locator('.cc-board svg').first()
 const pattern=page.locator('.cc-board path[data-panel]').first()
 const centroid=await pattern.evaluate(element=>{
  const box=element.getBoundingClientRect()
  return {x:box.x+box.width/2,y:box.y+box.height/2}
 })
 const outside=await svg.evaluate(element=>{const b=element.getBoundingClientRect();return {x:b.right-18,y:b.bottom-18}})
 const a05=page.locator('[data-clo-slot="2d:A05"]')
 await a05.click()
 check('A05 selects native internal line',await svg.getAttribute('data-native-tool')==='internal')
 await page.mouse.click(outside.x,outside.y)
 const validation=page.locator('[data-clo-floating-widget="pattern-validation"]')
 await validation.waitFor({state:'visible',timeout:5000})
 check('Outside pattern displays floating validation',await validation.isVisible())
 const before=await validation.boundingBox()
 const header=await validation.locator('.clo-floating-tool-header').boundingBox()
 await page.mouse.move(header.x+header.width/2,header.y+header.height/2)
 await page.mouse.down()
 await page.mouse.move(header.x+header.width/2-70,header.y+header.height/2+55,{steps:9})
 await page.mouse.up()
 const after=await validation.boundingBox()
 check('Validation widget is draggable',Math.abs(after.x-before.x)>30&&Math.abs(after.y-before.y)>25)
 const screenshot=path.join(root,'screenshots','exo-v2-canvas-tool-widgets-20261017.png')
 await page.screenshot({path:screenshot})
 await validation.getByRole('button',{name:'OK'}).click()
 const findValid=await page.evaluate(()=>{
  const hit=document.querySelector('.cc-board path[data-panel]')
  const svg=hit?.ownerSVGElement
  const bounds=hit?.getBBox()
  if(!bounds||!svg)return null
  const p=svg.createSVGPoint()
  for(let y=.25;y<=.75;y+=.1)for(let x=.25;x<=.75;x+=.1){
   p.x=bounds.x+bounds.width*x;p.y=bounds.y+bounds.height*y
   if(!hit.isPointInFill(p))continue
   const q=p.matrixTransform(hit.getScreenCTM())
   return {x:q.x,y:q.y}
  }
  return null
 })
 check('A05 native pattern point found',Boolean(findValid))
 await page.mouse.click(findValid.x,findValid.y)
 await sleep(150)
 await page.mouse.click(findValid.x+3,findValid.y+4)
 await sleep(150)
 await page.keyboard.press('Enter')
 await sleep(350)
 soft('A05 inside drawing invokes native edit',requests.some(r=>r.op==='edit'&&r.command?.kind==='InternalLine'))
 // Pleat guides require a four-corner rectangle. Create one through the native authoring dialog.
 await page.locator('[data-clo-slot="2d:A06"]').click()
 const rectangle=page.locator('[data-native-base-polygon="true"]')
 await rectangle.waitFor({state:'visible'})
 await rectangle.getByRole('button',{name:'Create native pattern'}).click()
 await rectangle.waitFor({state:'hidden',timeout:15000})
 const newPanel=responses.filter(r=>r.body?.template?.panels?.length>2).at(-1)?.body?.template?.panels?.at(-1)?.id
 check('Native rectangle created for pleat target',Boolean(newPanel))
 const pleatPoint=await page.locator('.cc-board path[data-panel]').last().evaluate(hit=>{
  const all=[...document.querySelectorAll('.cc-board path[data-panel]')]
  const p=hit.ownerSVGElement.createSVGPoint(),bounds=hit.getBBox()
  for(let yi=1;yi<19;yi++)for(let xi=1;xi<19;xi++){
   p.x=bounds.x+bounds.width*xi/20;p.y=bounds.y+bounds.height*yi/20
   if(!hit.isPointInFill(p))continue
   const q=p.matrixTransform(hit.getScreenCTM())
   const overlapped=all.slice(0,-1).some(other=>{
    const local=other.ownerSVGElement.createSVGPoint();local.x=q.x;local.y=q.y
    const uv=local.matrixTransform(other.getScreenCTM().inverse())
    return other.isPointInFill(uv)
   })
   if(!overlapped)return {x:q.x,y:q.y,unobstructed:true}
  }
  p.x=bounds.x+bounds.width/2;p.y=bounds.y+bounds.height/2
  const q=p.matrixTransform(hit.getScreenCTM())
  return {x:q.x,y:q.y,unobstructed:false}
 })
 soft('Pleat rectangle has unobstructed drawing point',pleatPoint.unobstructed)
 await page.locator('[data-clo-slot="2d:A15"]').click()
 check('A15 pleat tool selected',await page.locator('[data-clo-slot="2d:A15"]').getAttribute('aria-pressed')==='true')
 check('Pleat cursor displays fold icon',(await svg.evaluate(e=>getComputedStyle(e).cursor)).includes('svg'))
 check('Pleat does not open floating dialog',await page.locator('[data-clo-floating-widget="pleat"]').count()===0)
 check('Pleat does not open property editor',await page.locator('[data-native-pleat-guides]').count()===0)
 await page.mouse.click(pleatPoint.x,pleatPoint.y)
 await sleep(700)
 soft('A15 invokes native Rust pleat guides',requests.some(r=>r.op==='pleat-guides'))
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
 await sleep(400)
 soft('Pleat retains native Undo',requests.some(r=>r.op==='undo'))
 await page.locator('[data-clo-slot="2d:A10"]').click()
 const walk=page.locator('[data-clo-floating-widget="walk"]')
 await walk.waitFor({state:'visible',timeout:5000})
 check('A10 Walk uses Steam-style inset',await walk.locator('.clo-finishing-inset').count()>0)
 check('A10 Walk dialog has draggable header',await walk.locator('.clo-floating-tool-header').count()===1)
 await page.screenshot({path:screenshot})
 check('No browser exceptions',errors.length===0)
 console.log(JSON.stringify({pass:failures.length===0,checks,failures,screenshot,requestOps:requests.map(r=>r.op),errors}))
 if(failures.length)process.exitCode=1
}catch(error){
 console.error(JSON.stringify({pass:false,checks,error:String(error),requests:requests.map(r=>r.op),errors,screenshot:path.join(root,'screenshots','exo-v2-canvas-tool-widgets-20261017.png')}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
