import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-shirt-guides-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Rust session executable missing')
const port=42000+Math.floor(Math.random()*13000),api=`http://127.0.0.1:${port}`,ui=`http://127.0.0.1:${port+1}`
const children=[],errors=[]
function launch(bin,args,env={}) {
 const child=spawn(bin,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
 children.push(child)
}
async function ready(url) {
 for(let i=0;i<160;i++) {
  try{if((await fetch(url,{signal:AbortSignal.timeout(800)})).ok)return}catch{}
  await pause(200)
 }
 throw new Error('Timed out '+url)
}
async function snapshot() {
 const r=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
 const body=await r.json()
 assert(body.ok,JSON.stringify(body.error))
 return body.data
}
let browser,report={passed:false,output,apiPort:port,uiPort:port+1}
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+1),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1750,height:1100}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:api+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=native-shirt-guides',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:60000})
 const before=await snapshot()
 const found=await page.locator('.cc-board').evaluate(board=>{
  const groups=[...board.querySelectorAll('[data-2d-guide-panel]')]
  return groups.map(group=>({
   panel:group.dataset['2dGuidePanel'],
   types:[...group.querySelectorAll('[data-2d-construction]')].map(el=>el.dataset['2dConstruction']),
   elements:[...group.querySelectorAll('[data-2d-construction]')].map(el=>({
    tag:el.tagName.toLowerCase(),color:el.getAttribute('stroke'),
    valid:['x1','y1','x2','y2'].every(n=>Number.isFinite(Number(el.getAttribute(n))))
   }))
  }))
 })
 const types=new Set(found.flatMap(group=>group.types))
 for(const name of ['center-front','chest','belly','hem-upper','hem-lower','notch-tick'])
  assert(types.has(name),`Missing rendered 2D guide: ${name}; found ${[...types]}`)
 assert(found.flatMap(x=>x.elements).every(e=>e.tag==='line'&&e.valid),'Guide must be a finite SVG line')
 const blue=found.flatMap(x=>x.elements).filter(e=>['#285caa'].includes(e.color)).length
 const red=found.flatMap(x=>x.elements).filter(e=>e.color==='#c34448').length
 assert(blue>=5&&red>=1,`Invalid SVG guide colors: blue=${blue} red=${red}`)
 const stage=await page.locator('.cc-scene canvas').first().evaluate(el=>({
  curved:el.dataset.nativePreDrapeCurved,depth:Number(el.dataset.nativePreDrapeDepth)
 }))
 assert(['true','false'].includes(stage.curved),'Pre-drape curvature status missing')
 assert(Number.isFinite(stage.depth)&&stage.depth>=0,'Pre-drape depth invalid')
 if(before.time===0&&stage.curved==='true')assert(stage.depth>0,'Curved time-zero stage must have depth')
 const after=await snapshot()
 assert.deepEqual(after.template,before.template,'Rust template changed during read-only QA')
 assert.deepEqual(after.positions,before.positions,'Rust source positions changed during read-only QA')
 assert.deepEqual(after.triangles,before.triangles,'Rust triangles changed during read-only QA')
 assert.deepEqual(errors,[],'Browser page errors')
 await page.screenshot({path:path.join(output,'native-shirt-guides.png')})
 report={...report,passed:true,guidePanels:found,blueCount:blue,redCount:red,stage,
  rustSnapshotUnchanged:true,sourceTime:before.time,sourceRevision:before.revision,pageErrors:errors,
  limitation:stage.curved==='false'?'Native snapshot did not activate curved staged geometry; depth status was observed only.':'Curved staged preview confirmed through canvas dataset; pixel-based silhouette not measured.'}
}catch(error){report={...report,error:String(error?.stack||error),pageErrors:errors};process.exitCode=1}
finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
 writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify(report,null,2))
}
