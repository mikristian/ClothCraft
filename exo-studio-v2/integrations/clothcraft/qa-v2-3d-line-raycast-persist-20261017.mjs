// Live 3D ray-hit acceptance; isolated temporary native Rust workspace.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-3d-line-hit-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Built native exo-session required')
const nativePort=String(6100+Math.floor(Math.random()*200)),uiPort=String(Number(nativePort)+300)
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`,children=[]
function launch(command,args,env={}){const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(child)}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error(`Fixture unavailable ${url}`)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',uiPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 console.error('QA fixture servers ready')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],requests=[],snapshots=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const request=route.request(),body=request.method()==='POST'?request.postDataJSON():{}
  requests.push(body)
  const headers={...request.headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  try{const json=await response.json();const s=json.data||json;if(s?.template?.panels&&Number.isFinite(s.revision))snapshots.push(s)}catch{}
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 console.error('QA board ready')
 const slot=page.locator('[data-clo-slot="3d:B03"]')
 assert.equal(await slot.getAttribute('data-clo-implementation'),'native')
 await slot.click()
 const canvas=page.locator('.cc-viewport-3d canvas').first()
 await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.internalLine3dMode==='on')
 await page.evaluate(()=>{window.__exo3dLineEvents=[];window.addEventListener('exo-clothcraft-3d-internal-line',event=>window.__exo3dLineEvents.push(event.detail))})
 const initial=snapshots.at(-1)
 assert(initial?.template?.panels?.length,'No native garment snapshot')
 const counts=()=>Object.fromEntries((snapshots.at(-1)?.template?.panels||[]).map(p=>[p.id,p.polygon?.lines?.length||0]))
 const baseline=counts(),bounds=await canvas.boundingBox()
 const baselineRendered=Number(await canvas.getAttribute('data-native3d-internal-line-count')||0)
 const renderedCount=async()=>Number(await canvas.getAttribute('data-native3d-internal-line-count')||0)
 const expectRendered=async(expected,stage)=>{
  await page.waitForFunction(n=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.native3dInternalLineCount)===n,expected,{timeout:15000})
  assert.equal(await renderedCount(),expected,`${stage}: rendered native 3D internal line count`)
 }
 assert(bounds?.width>100&&bounds.height>100)
 const probe=[]
 // Each probe is a real canvas mouse click and Three.Raycaster garment hit.
 for(const xf of [.35,.42,.49,.56,.63,.70]){
  for(const yf of [.25,.35,.45,.55,.65,.75]){
   await page.keyboard.press('Escape')
   const x=Math.round(bounds.x+bounds.width*xf),y=Math.round(bounds.y+bounds.height*yf)
   await page.mouse.click(x,y)
   const pointCount=Number(await canvas.getAttribute('data-internal-line3d-points'))
   if(pointCount===1)probe.push({x,y,panel:await canvas.getAttribute('data-internal-line3d-panel')})
  }
 }
 const pair=probe.flatMap((a,i)=>probe.slice(i+1).filter(b=>b.panel===a.panel&&Math.hypot(a.x-b.x,a.y-b.y)>30).map(b=>[a,b]))[0]
 assert(pair,`Could not locate two unobstructed 3D canvas ray hits on the same panel: ${JSON.stringify(probe)}`)
 await page.keyboard.press('Escape')
 for(const {x,y} of pair)await page.mouse.click(x,y)
 await page.waitForFunction(()=>window.__exo3dLineEvents?.length===1,{timeout:15000})
 const event=await page.evaluate(()=>window.__exo3dLineEvents[0])
 assert.equal(event.panel,pair[0].panel)
 assert(event.points.every(p=>p.length===2&&p.every(Number.isFinite)))
 const separation=Math.hypot(event.points[0][0]-event.points[1][0],event.points[0][1]-event.points[1][1])
 assert(separation>=.001&&separation<=5,`Material line length outside native authoring domain: ${separation}m`)
 await page.waitForFunction(([id,before])=>window.__exo3dLineEvents?.length===1&&Boolean(document.querySelector('.cc-viewport-3d canvas')), [event.panel,baseline[event.panel]])
 for(let i=0;i<100&&!snapshots.some(s=>(s.template.panels.find(p=>p.id===event.panel)?.polygon?.lines?.length||0)===baseline[event.panel]+1);i++)await sleep(100)
 const written=snapshots.find(s=>(s.template.panels.find(p=>p.id===event.panel)?.polygon?.lines?.length||0)===baseline[event.panel]+1)
 assert(written,`Native InternalLine was not persisted after ray clicks: ${JSON.stringify(requests.filter(r=>r.op==='edit').slice(-3))}`)
 console.error('QA native line authored')
 await expectRendered(baselineRendered+1,'after native authoring')
 console.error('QA authored line rendered')
 const renderedAfterCreation=await renderedCount()
 const authored=written.template.panels.find(p=>p.id===event.panel).polygon.lines.at(-1)
 assert.equal(authored.points.length,2)
 for(let i=0;i<2;i++)for(let j=0;j<2;j++)assert(Math.abs(authored.points[i][j]-event.points[i][j])<1e-4,'Native coordinates mismatch Three interpolated UV metres')
 const rpc=async body=>{const response=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const json=await response.json();assert(json.ok!==false,JSON.stringify(json));return json.data||json}
 const reloadNativeView=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.locator('.cc-viewport-3d canvas').first().waitFor()}
 let s=await rpc({op:'undo',revision:written.revision})
 await reloadNativeView()
 await expectRendered(baselineRendered,'after Undo')
 console.error('QA Undo rendered')
 assert.equal((s.template.panels.find(p=>p.id===event.panel).polygon.lines?.length||0),baseline[event.panel]);const undoRevision=s.revision
 s=await rpc({op:'redo',revision:s.revision})
 await reloadNativeView()
 await expectRendered(baselineRendered+1,'after Redo')
 console.error('QA Redo rendered')
 assert.equal((s.template.panels.find(p=>p.id===event.panel).polygon.lines?.length||0),baseline[event.panel]+1);const redoRevision=s.revision
 // Selecting another native toolbar tool must preserve Rust-authored geometry.
 await page.locator('[data-clo-slot="3d:B02"]').click()
 await expectRendered(baselineRendered+1,'after tool switch')
 console.error('QA tool switch rendered')
 const renderedAfterToolSwitch=await renderedCount()
 const saved=await rpc({op:'save'});s=await rpc({op:'open',project:saved.project});assert.equal((s.template.panels.find(p=>p.id===event.panel).polygon.lines?.length||0),baseline[event.panel]+1)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.cc-viewport-3d canvas').first().waitFor()
 await page.waitForFunction(n=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.native3dInternalLineCount)===n,baselineRendered+1,{timeout:30000})
 const renderedAfterReopen=Number(await page.locator('.cc-viewport-3d canvas').first().getAttribute('data-native3d-internal-line-count'))
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,realMouseRayHits:pair,materialUvMetres:event.points,materialLengthMm:separation*1000,panel:event.panel,initialRevision:initial.revision,writtenRevision:written.revision,undoRevision,redoRevision,reopenedRevision:s.revision,pointsFromNative:authored.points,renderedBaseline:baselineRendered,renderedAfterCreation,renderedAfterUndo:baselineRendered,renderedAfterRedo:baselineRendered+1,renderedAfterToolSwitch,renderedAfterReopen,probeHits:probe.length,output},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
