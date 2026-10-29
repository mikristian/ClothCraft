// Disposable browser/Rust regression for real CLO YKK hardware attachment.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,readFileSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-ykk-anchor-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Missing compiled native exo-session')
const nativePort=5963,webPort=5964,native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${webPort}`
const children=[],events=[]
const run=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,env:{...process.env,...env},detached:true,stdio:['ignore','pipe','pipe']})
  children.push(child)
  for(const [stream,label] of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',chunk=>events.push({source:label,log:String(chunk).slice(0,1000)}))
}
const wait=async url=>{for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await pause(250)}throw Error(`Service unavailable ${url}`)}
const api=async(op,fields={})=>{const r=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,...fields})});const result=await r.json();assert(result.ok,JSON.stringify(result));return result.data}
let browser,page
const diagnostics={output,console:[],pageErrors:[],failedRequests:[],glbResponses:[],nativeCalls:[]}
try{
  run(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
  run(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([wait(native+'/health'),wait(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1680,height:1000}})
  page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')diagnostics.console.push(`${msg.type()}: ${msg.text()}`)})
  page.on('pageerror',e=>diagnostics.pageErrors.push(e.stack||e.message))
  page.on('requestfailed',request=>diagnostics.failedRequests.push(`${request.url()} ${request.failure()?.errorText}`))
  page.on('response',response=>{if(response.url().includes('/clo-hardware-converted/'))diagnostics.glbResponses.push(`${response.status()} ${response.url()}`)})
  await page.route('**/workspace',async route=>{const request=route.request();if(request.method()==='POST')try{diagnostics.nativeCalls.push(request.postDataJSON())}catch{};const headers={...request.headers()};delete headers.origin;const response=await route.fetch({url:native+'/workspace',headers});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})})
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=native-ykk-anchor',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:60000})
  await page.getByRole('button',{name:/Hardware and Trims/i}).first().click()
  await page.locator('[data-clo-imported-library-toggle]').click()
  await page.locator('.clo-imported-tile').first().waitFor({timeout:30000})
  await page.getByRole('textbox',{name:'Search imported hardware'}).fill('YKK')
  const ykkCount=await page.locator('.clo-imported-tile').count()
  assert(ykkCount>0,`No YKK results ${ykkCount}`)
  await page.locator('.clo-imported-tile').first().click()
  await page.locator('[data-clo-imported-place]').click()
  await page.waitForTimeout(1500)
  const first=await api('snapshot')
  diagnostics.firstPlacement=first.importedHardware
  assert.equal(first.importedHardware?.length,1,'UI placement did not persist in native Rust')
  const id=first.importedHardware[0].id
  const check=async()=>page.locator('.cc-viewport-3d canvas').first().evaluate(canvas=>({expected:canvas.dataset.nativeImportedHardwareExpected,count:canvas.dataset.nativeImportedHardwareCount,error:canvas.dataset.importedHardwareLoadError,rect:canvas.getBoundingClientRect().toJSON()}))
  await page.waitForTimeout(3500)
  diagnostics.firstCanvas=await check()
  const inspector=page.locator('[data-imported-hardware-editor="placed"]')
  diagnostics.inspectorCount=await inspector.count()
  // Capture load status before asserting; absence is a real failure with actionable evidence.
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.nativeImportedHardwareCount||0)>=1,null,{timeout:15000}).catch(()=>{})
  diagnostics.finalCanvas=await check()
  assert(Number(diagnostics.finalCanvas.count)>=1,`Native GLB missing: ${JSON.stringify(diagnostics)}`)
  assert.equal(await inspector.count(),1,'Placed asset did not appear in Property Editor')
  const before=first.importedHardware[0]
  const x=inspector.locator('[data-imported-hardware-property="x"] input[type="number"]')
  const y=inspector.locator('[data-imported-hardware-property="y"] input[type="number"]')
  assert(await x.count()&&await y.count(),'Missing native x/y inspector controls')
  await x.fill('14');await x.press('Tab')
  await y.fill('12');await y.press('Tab')
  await page.waitForTimeout(900)
  const edited=await api('snapshot')
  const moved=edited.importedHardware.find(item=>item.id===id)
  assert(moved,'Hardware disappeared after edit')
  assert.notDeepEqual(moved.positionMm.slice(0,2),before.positionMm.slice(0,2),'Native x/y edits did not change saved anchor coordinates')
  diagnostics.edited=moved
  diagnostics.editedCanvas=await check()
  assert(Number(diagnostics.editedCanvas.count)>=1,'Rendered GLB vanished after x/y edit')
  await api('save')
  const stored=JSON.parse(readFileSync(path.join(output,'workspace','fitting-project.json'),'utf8'))
  assert.deepEqual(stored.importedHardware.find(item=>item.id===id).positionMm.slice(0,2),moved.positionMm.slice(0,2))
  const reopened=await api('open',{project:stored})
  assert.deepEqual(reopened.importedHardware.find(item=>item.id===id).positionMm.slice(0,2),moved.positionMm.slice(0,2))
  await page.waitForTimeout(800)
  diagnostics.reopenedCanvas=await check()
  assert(Number(diagnostics.reopenedCanvas.count)>=1,'Reopened placement is not visible on cloth')
  console.log(JSON.stringify({pass:true,ykkCount,assetId:moved.assetId,beforeMm:before.positionMm,afterMm:moved.positionMm,canvas:diagnostics.reopenedCanvas,output},null,2))
}catch(error){
  diagnostics.failure=error.stack||String(error)
  diagnostics.serverLogs=events.slice(-35)
  console.error(JSON.stringify(diagnostics,null,2))
  process.exitCode=1
}finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}
