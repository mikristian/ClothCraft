// Independent, disposable Rust-backed browser acceptance for left CLO 3D A05/A06/A07.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-left-3d-sewing-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Disposable native fixture requires a built Rust exo-session binary')
const nativePort=String(5700+Math.floor(Math.random()*200)),uiPort=String(Number(nativePort)+300)
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`,children=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error(`Fixture unavailable: ${url}`)}
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',uiPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[],requests=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',request=>{if(request.url().endsWith('/workspace')&&request.method()==='POST'){try{requests.push(request.postDataJSON())}catch{}}})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft`,{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 const keys=['3d:A05','3d:A06','3d:A07']
 const buttons=Object.fromEntries(keys.map(key=>[key,page.locator(`[data-clo-slot="${key}"]`)]))
 for(const key of keys){assert.equal(await buttons[key].getAttribute('data-clo-implementation'),'native');assert.equal(await buttons[key].isEnabled(),true)}
 const panel=page.locator('[data-native-sewing-panel="true"]')
 async function expectPressed(key){
  await page.waitForFunction(selected=>['3d:A05','3d:A06','3d:A07'].every(id=>document.querySelector(`[data-clo-slot="${id}"]`)?.getAttribute('aria-pressed')===String(id===selected)),key)
  for(const id of keys)assert.equal(await buttons[id].evaluate(el=>el.classList.contains('active')),id===key,`Highlight differs from aria-pressed for ${id}`)
 }
 await buttons['3d:A06'].click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
 await expectPressed('3d:A06')
 assert.equal(await panel.count(),0,'Segment Sewing should start directly without a popup')
 assert.match(await page.locator('[data-segment-sew-hint]').innerText(),/Hover over a seam edge/)
 assert.match(await page.locator('.cc-board svg').first().evaluate(el=>getComputedStyle(el).cursor),/sewing-machine\.svg/)
 // Select one real native board edge; changing tools must drop this partial pair.
 await page.locator('.cc-board [data-segment-sew-candidate]').first().evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})))
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewStage==='second')
 assert.match(await page.locator('[data-segment-sew-hint]').innerText(),/Click the matching edge/)
 await buttons['3d:A07'].click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 await expectPressed('3d:A07')
 assert.equal(await panel.count(),0,'Free Sewing should also work directly')
 assert.equal(await page.locator('.cc-board').getAttribute('data-free-sew-stage'),'0','Stale segment range carried into free mode')
 assert.match(await page.locator('[data-free-sew-hint]').innerText(),/Click the start point of edge A/)
 assert.equal(await page.getByRole('checkbox',{name:'Allow Free Sewing easing'}).isChecked(),true)
 await page.locator('.cc-board [data-free-sew-candidate]').first().evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})))
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewStage==='1')
 assert.equal(await page.locator('[data-free-sew-marker]').count(),1)
 await buttons['3d:A06'].click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
 await expectPressed('3d:A06')
 assert.equal(await panel.count(),0)
 assert.equal(await page.locator('.cc-board').getAttribute('data-segment-sew-stage'),'first','Stale free edge carried into segment mode')
 await buttons['3d:A07'].click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 await expectPressed('3d:A07')
 assert.equal(await page.locator('.cc-board').getAttribute('data-free-sew-stage'),'0','Free Sewing points should clear after tool switch')
 await buttons['3d:A05'].click()
 await expectPressed('3d:A05')
 assert.equal(await panel.count(),0)
 assert(requests.some(request=>request.op==='snapshot'),'No real native Rust snapshot request observed')
 assert.deepEqual(errors,[],'Browser runtime errors')
 console.log(JSON.stringify({pass:true,nativeRustFixture:true,clicks:keys,exclusivePressed:true,highlightMatches:true,segmentFullRange:true,freeEditableRange:true,rangeReset:true,staleEdgesCleared:true,requests:requests.length,output},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
