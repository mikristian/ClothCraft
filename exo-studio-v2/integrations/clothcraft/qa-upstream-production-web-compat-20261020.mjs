// Disposable source UI and isolated Rust dart-fit integration QA.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(process.env.HOME,'Applications/EXO ClothCraft Studio V2 QA.app/Contents/Resources/research/oss/clothcraft/target/debug/exo-session')
const source='http://127.0.0.1:5386'
const temp=mkdtempSync(path.join(tmpdir(),'exo-upstream-installed-solver-'))
mkdirSync(path.join(temp,'workspace'))
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const port=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>s.close(()=>resolve(s.address()?.port||s._handle?.getsockname()?.port)))})
const report={script:'qa-upstream-production-web-compat-20261020.mjs',sourceUI:source,mode:'regular production V2 static frontend, all native calls rerouted to disposable merged-solver session',temporaryDirectory:temp,assertions:[],events:[],errors:[]}
let child,browser
try{
 assert(existsSync(binary),'Compiled native executable missing')
 const p=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n))})})
 const base=`http://127.0.0.1:${p}`
 report.privateBackend=base
 child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,EXO_CLOTHCRAFT_PORT:String(p),EXO_CLOTHCRAFT_OUTPUT_DIR:temp,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft-upstream-solver-review-20261020'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
 child.stderr.on('data',v=>report.errors.push(String(v).slice(0,500)))
 let healthy=false
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).nativeReady){healthy=true;break}}catch{}await sleep(150)}
 assert(healthy,'Private native backend did not become ready')
 const rpc=async body=>{const r=await fetch(base+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const data=await r.json();assert(data.ok,`Native ${body.op}: ${data.error}`);return data.data}
 let s=await rpc({op:'open',preset:'tshirt'})
 s=await rpc({op:'edit',revision:s.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric:s.template.fabrics[0].id}})
 const panel=s.template.panels.at(-1),a=panel.polygon.points[0],b=panel.polygon.points[1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2]
 s=await rpc({op:'edit',revision:s.revision,command:{kind:'DartCutSew',panel:panel.id,edge:panel.polygon.edges[0],left_t:.425,right_t:.575,apex:[mid[0]-dy/len*.08,mid[1]+dx/len*.08]}})
 const dartId=s.template.seams.at(-1).id
 const initial=s.dartFit.find(v=>v.seamId===dartId)
 assert(initial&&Number.isFinite(initial.maxGapMm)&&Number.isFinite(initial.rmsGapMm),'Initial native dartFit metric missing/nonfinite')
 report.initial={revision:s.revision,dart:initial}
 report.assertions.push('native 0-step dartFit finite')
 for(const n of [4,4,2])s=await rpc({op:'step',revision:s.revision,steps:n})
 const measured=await rpc({op:'snapshot'})
 const dart=measured.dartFit.find(v=>v.seamId===dartId)
 assert(dart&&Number.isFinite(dart.maxGapMm)&&Number.isFinite(dart.rmsGapMm),'10-step native dartFit nonfinite')
 assert(dart.maxGapMm<initial.maxGapMm&&dart.rmsGapMm<initial.rmsGapMm,'10-step dart did not improve both max and RMS')
 report.after10={revision:measured.revision,dart}
 report.assertions.push('10 native steps improve max and RMS')
 const ui=await fetch(source,{signal:AbortSignal.timeout(4000)})
 assert(ui.ok,'Source Vite 5297 unavailable')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']})
 const page=await browser.newPage({viewport:{width:1600,height:1000}})
 page.on('pageerror',error=>report.errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const body=route.request().postDataJSON();report.events.push(body.op)
  const response=await fetch(base+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(50000)})
  await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()})
 })
 await page.goto(source+'/?desktop=1&engine=clothcraft&qa=dart-fit-inspector',{waitUntil:'domcontentloaded',timeout:35000})
 const canvas=page.locator('.cc-viewport-3d canvas').first()
 await canvas.waitFor({state:'attached',timeout:35000})
 await page.waitForFunction(()=>{
  const e=document.querySelector('.cc-viewport-3d canvas');
  return Boolean(e)&&Number(e.dataset.native3dMeshTriangles)>0;
 },null,{timeout:25000})
 const canvasAttrs=await canvas.evaluate(n=>({revision:n.dataset.native3dMeshRevision,triangles:Number(n.dataset.native3dMeshTriangles),vertices:Number(n.dataset.native3dMeshVertices)}))
 assert(canvasAttrs.triangles>0&&canvasAttrs.vertices>0,'Legacy 3D mesh did not render')
 report.canvas=canvasAttrs
 const svg=page.locator('.cc-viewport-2d svg')
 await svg.first().waitFor({state:'attached',timeout:20000})
 report.twoD={svgs:await svg.count(),paperPaths:await page.locator('[data-pattern-surface="drafting-paper"]').count()}
 assert(report.twoD.svgs>0&&report.twoD.paperPaths>0,'Regular 2D drafting screen did not consume merged native snapshot')
 const screenshot=path.join(root,'docs/qa/upstream-solver-qa-app-20261020/production-web-with-merged-native-private.png')
 mkdirSync(path.dirname(screenshot),{recursive:true})
 await page.screenshot({path:screenshot,timeout:20000})
 report.screenshot=screenshot
 report.assertions.push('regular production V2 frontend shows real 2D pattern and actual 3D native mesh using disposable merged solver')
 report.pass=true
 console.log(JSON.stringify(report,null,2))
}catch(error){report.pass=false;report.failure=String(error.stack||error);console.error(JSON.stringify(report,null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});child?.kill('SIGTERM')}
