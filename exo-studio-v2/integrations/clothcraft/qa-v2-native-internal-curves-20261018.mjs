// Real native Rust + browser; all edits happen inside a disposable workspace.
import assert from 'node:assert/strict'
import {PATTERN_VISUAL} from '../../src/core/patternVisualTokens.js'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-internal-curve-'))
mkdirSync(path.join(output,'workspace'))
const port=5437,webPort=5284,base='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+webPort
const children=[],errors=[],failures=[]
function launch(file,args,env={}){
  const child=spawn(file,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error('Server not ready: '+url)
}
async function command(body){
  const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json()
  assert(result.ok,result.error||JSON.stringify(result))
  return result.data
}
let browser,page
try{
  for(const checkPort of [port,webPort]){
    const probe=createServer(); await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(checkPort,'127.0.0.1',resolve)}); await new Promise(resolve=>probe.close(resolve))
  }
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:base})
  await Promise.all([ready(base+'/health'),ready(ui)])
  await command({op:'open',preset:'tshirt'})
  const before=await command({op:'snapshot'})
  await command({op:'edit',revision:before.revision,command:{
    kind:'InternalLine',panel:'front',points:[[.4,.26],[.6,.26]],tangents:[[0,0],[0,0]]
  }})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',response=>{if(response.status()>=400&&response.url().includes('/workspace'))failures.push(response.status())})
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  const line=board.locator('[data-native-internal-line="front:line_1"]')
  await line.waitFor({timeout:60000})
  const firstCurve=await line.locator('polyline[data-guide-curve]').first().getAttribute('points')
  assert.equal(firstCurve.trim().split(/\s+/).length,33,'Must sample cubic from Rust data')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('svg[data-native-tool="curve"]').waitFor({timeout:15000})
  const click=await line.locator('[data-internal-curve-hit]').first().evaluate(el=>{
    const values=el.getAttribute('points').trim().split(/\s+/)
    const q=values[Math.floor(values.length/2)].split(',').map(Number)
    const p=new DOMPoint(q[0],q[1]).matrixTransform(el.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.click(click.x,click.y)
  await board.locator('[data-internal-curve-handle="front:line_1:0"]').waitFor({timeout:25000})
  const converted=await command({op:'snapshot'})
  const original=converted.template.panels.find(p=>p.id==='front').polygon.lines[0]
  assert(original.tangents.every(t=>Math.hypot(...t)>.01),'Curve conversion must create actual tangents')
  const straight=await line.locator('polyline[data-guide-curve]').first().getAttribute('points')
  // Cubic speed along a straight segment changes after inserting collinear
  // handles. The physical stroke stays exactly straight, even if its uniformly
  // sampled parameter points are spaced differently.
  const straightSamples=straight.trim().split(/\s+/).map(item=>item.split(',').map(Number))
  assert(straightSamples.every(([x,y],i)=>Math.abs(y-.26)<1e-9&&
    x>=.4-1e-9&&x<=.6+1e-9&&(i===0||x>=straightSamples[i-1][0])),
  'Collinear tangent conversion must preserve the material-space straight stroke')
  const handle=board.locator('[data-internal-curve-handle="front:line_1:0"]')
  const location=await handle.evaluate(el=>{
    const b=el.getBoundingClientRect()
    return {x:b.x+b.width/2,y:b.y+b.height/2}
  })
  await page.mouse.move(location.x,location.y)
  await page.mouse.down()
  await page.mouse.move(location.x+12,location.y-26,{steps:8})
  await page.mouse.up()
  let changed
  for(let i=0;i<45;i++){
    changed=await command({op:'snapshot'})
    if(changed.revision>converted.revision)break
    await sleep(400)
  }
  assert(changed.revision>converted.revision,'Handle drag must commit native Rust Shape')
  const edited=changed.template.panels.find(p=>p.id==='front').polygon.lines[0]
  const moved=Math.hypot(...edited.tangents[0].map((n,i)=>n-original.tangents[0][i]))
  assert(moved>.006,'Native tangent unchanged after drag')
  assert.equal(edited.id,original.id,'Stable native line ID must survive edit')
  await page.waitForFunction(old=>document.querySelector('[data-native-internal-line="front:line_1"] polyline[data-guide-curve]')
    ?.getAttribute('points')!==old,straight,{timeout:20000})
  const curved=await line.locator('polyline[data-guide-curve]').first().getAttribute('points')
  assert.notEqual(curved,straight,'Rendered line must follow changed tangent')
  await page.reload({waitUntil:'domcontentloaded'})
  await board.locator('[data-native-internal-line="front:line_1"] polyline[data-guide-curve]').first().waitFor({timeout:25000})
  const reloaded=await board.locator('[data-native-internal-line="front:line_1"] polyline[data-guide-curve]').first().getAttribute('points')
  assert.equal(reloaded,curved,'Reload must preserve saved curved geometry')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  const pick=await board.locator('[data-native-internal-line="front:line_1"] polyline[data-guide-curve]').first().evaluate(el=>{
    const q=el.getAttribute('points').trim().split(/\s+/)[8].split(',').map(Number)
    const p=new DOMPoint(q[0],q[1]).matrixTransform(el.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.move(pick.x,pick.y)
  await page.waitForFunction(()=>document.querySelector('[data-guide-id="front:native:line_1:0"]')?.getAttribute('data-hovered')==='true',{},{timeout:5000})
  await page.mouse.click(pick.x,pick.y)
  await page.waitForFunction(expected=>document.querySelector('[data-guide-id="front:native:line_1:0"] polyline')?.getAttribute('stroke')===expected,PATTERN_VISUAL.selectedInternalLine,{timeout:5000})
  assert.equal(errors.length,0,'Browser page errors')
  assert.equal(failures.length,0,'Workspace HTTP errors')
  const screenshot=path.join(output,'native-internal-curve.png')
  await board.screenshot({path:screenshot})
  // Illustrator/CLO-like quick straightening of a selected spline, while
  // preserving its stable source ID and original anchor positions.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('svg[data-native-tool="curve"]').waitFor()
  const straightHit=await board.locator('[data-internal-curve-hit="front:line_1:0"]').evaluate(el=>{
    const samples=el.getAttribute('points').trim().split(/\s+/)
    const pair=samples[16].split(',').map(Number)
    const p=new DOMPoint(pair[0],pair[1]).matrixTransform(el.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.keyboard.down('Alt')
  try{await page.mouse.click(straightHit.x,straightHit.y)}finally{await page.keyboard.up('Alt')}
  let flattened
  for(let i=0;i<45;i++){
    flattened=await command({op:'snapshot'})
    if(flattened.revision>changed.revision)break
    await sleep(400)
  }
  assert(flattened.revision>changed.revision,'Option-click should persist straightening')
  const flattenedLine=flattened.template.panels.find(p=>p.id==='front').polygon.lines[0]
  assert(flattenedLine.tangents.every(t=>Math.hypot(...t)<1e-9),'Option-click did not reset native tangents')
  assert.equal(flattenedLine.id,edited.id,'Straighten should keep authored line ID')
  console.log(JSON.stringify({pass:true,revision:changed.revision,lineId:edited.id,tangentDisplacement:moved,
    curveSamples:curved.trim().split(/\s+/).length,straightenedRevision:flattened.revision,screenshot,errors,failures},null,2))
}catch(error){
  const screenshot=path.join(output,'native-internal-curve-failure.png')
  await page?.screenshot({path:screenshot}).catch(()=>{})
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),screenshot,errors,failures},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
