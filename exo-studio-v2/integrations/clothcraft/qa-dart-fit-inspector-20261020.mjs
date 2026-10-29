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
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const source='http://127.0.0.1:5297'
const temp=mkdtempSync(path.join(tmpdir(),'exo-dart-fit-inspector-'))
mkdirSync(path.join(temp,'workspace'))
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const port=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>s.close(()=>resolve(s.address()?.port||s._handle?.getsockname()?.port)))})
const report={script:'qa-dart-fit-inspector-20261020.mjs',sourceUI:source,mode:'source full UI (embedded inspector also checked if rendered)',temporaryDirectory:temp,assertions:[],events:[],errors:[]}
let child,browser
try{
 assert(existsSync(binary),'Compiled native executable missing')
 const p=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n))})})
 const base=`http://127.0.0.1:${p}`
 report.privateBackend=base
 child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,EXO_CLOTHCRAFT_PORT:String(p),EXO_CLOTHCRAFT_OUTPUT_DIR:temp,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
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
 await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.nativeDartCount==='1',null,{timeout:25000})
 const fitNav=page.getByRole('button',{name:'Fit',exact:true}).first()
 if(await fitNav.count())await fitNav.click()
 const fitSelect=page.getByRole('combobox',{name:'EXO workspace section'})
 if(await fitSelect.count())await fitSelect.selectOption('Fit')
 const inspector=page.locator('[data-dart-fit-inspector="true"]')
 await inspector.first().waitFor({state:'attached',timeout:20000})
 const fitLine=page.locator(`[data-dart-fit-seam="${dartId}"]`).first()
 await fitLine.waitFor({state:'attached',timeout:20000})
 const gap=Number(await fitLine.getAttribute('data-dart-gap-mm'))
 const rms=Number(await fitLine.getAttribute('data-dart-rms-mm'))
 assert(Math.abs(gap-dart.maxGapMm)<1e-7&&Math.abs(rms-dart.rmsGapMm)<1e-7,`DOM mismatch ${gap}/${rms} vs ${dart.maxGapMm}/${dart.rmsGapMm}`)
 report.inspector={instances:await inspector.count(),visible:await inspector.first().isVisible(),gapMm:gap,rmsMm:rms}
 report.assertions.push('actual Fit inspector DOM matches native max/RMS')
 const attrs=await canvas.evaluate(n=>({count:n.dataset.nativeDartCount,max:n.dataset.nativeDartMaxGapMm,revision:n.dataset.native3dMeshRevision??null}))
 assert.equal(attrs.count,'1','Three.js native dart count')
 assert(Number.isFinite(Number(attrs.max))&&Math.abs(Number(attrs.max)-dart.maxGapMm)<1e-7,`Three.js max gap mismatch ${attrs.max} versus ${dart.maxGapMm}`)
 assert.equal(Number(attrs.revision),measured.revision,'Three.js must consume the exact native mesh revision')
 report.canvas=attrs
 report.assertions.push('Three.js canvas count/max gap matches native snapshot')
 report.pass=true
 console.log(JSON.stringify(report,null,2))
}catch(error){report.pass=false;report.failure=String(error.stack||error);console.error(JSON.stringify(report,null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});child?.kill('SIGTERM')}
