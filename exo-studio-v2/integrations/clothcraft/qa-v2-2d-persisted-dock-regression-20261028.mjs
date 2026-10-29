/** Isolated actual native T-shirt SVG contract, screenshots + CSS, not synthetic canvas. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5994,uiPort=5386
const native='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const output=mkdtempSync(path.join(tmpdir(),'exo-no-navy-mesh-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const children=[]
const ready=async url=>{for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}throw Error('Service unavailable '+url)}
let browser,stage='startup'
const errors=[]
try{
 const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,detached:true,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:bin,EXO_CLOTHCRAFT_GPU:'0'}});children.push(child)
 await Promise.all([ready(native+'/health'),ready(ui)])
 const html=await fetch(ui).then(r=>r.text())
 assert.match(html,/assets\/index-/,'real installed page required')
 stage='real rust tee'
 const opened=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})}).then(r=>r.json())
 assert(opened.ok,`Real tee preset failure: ${opened.error}`)
 stage='browser'
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1550,height:900}})
 const page=await context.newPage()
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/workspace',async route=>{const headers={...route.request().headers()};delete headers.origin;const res=await route.fetch({url:native+'/workspace',headers});await route.fulfill({response:res,headers:{...res.headers(),'access-control-allow-origin':ui}})})
 await page.addInitScript(()=>{localStorage.setItem('exo.widget.dock-side.grading-quick-toolbar.v1','left');localStorage.setItem('exo.widget.bottom-docked.grading-quick-toolbar.v2','true');localStorage.setItem('exo.patternFocusWorkspace.v1','true');localStorage.setItem('garment-studio-show-top-tabs','false')})
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=persisted-side-dock-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel="front"]').first().waitFor({timeout:35000})
 stage='focused 2d'
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 await page.evaluate(()=>{window.__renderSentry=[];document.addEventListener('visibilitychange',()=>window.__renderSentry.push(document.visibilityState))})
 const board=page.locator('.cc-board').first()
 const renderState=await page.evaluate(()=>{const selectors=['.cc-embedded-root.cc-embedded-2d','.cc-embedded-main','.cc-viewport-2d','.cc-board','.cc-board svg','.exo-grade-side-dock-host[data-exo-dock-edge=left]','.exo-grade-side-dock-host[data-exo-dock-edge=right]'];return Object.fromEntries(selectors.map(sel=>{const el=document.querySelector(sel);if(!el)return [sel,null];const r=el.getBoundingClientRect(),css=getComputedStyle(el);return [sel,{x:r.x,y:r.y,width:r.width,height:r.height,display:css.display,visibility:css.visibility,opacity:css.opacity,position:css.position,children:el.children.length}]}))})
 console.log('RENDER_GEOMETRY '+JSON.stringify(renderState))
 const viewport=renderState['.cc-viewport-2d'],canvas=renderState['.cc-board'];
 assert(viewport&&viewport.width>=400&&viewport.height>=300,`2D viewport collapsed or hidden: ${JSON.stringify(renderState)}`)
 assert(canvas&&canvas.width>=400&&canvas.height>=300,`2D canvas collapsed or hidden: ${JSON.stringify(renderState)}`)
 const results=await board.locator('[data-pattern-surface="drafting-paper"]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.panel,valid:n.dataset.patternOutlineValid,computedFill:getComputedStyle(n).fill,rawFill:n.getAttribute('fill'),d:n.getAttribute('d'),segments:(n.getAttribute('d')||'').match(/M/g)?.length||0})))
 assert(results.length>=2,'Must render at least two independent tee pieces')
 assert(results.every(row=>row.valid==='true'&&row.segments===1),`Every tee piece must be a single closed perimeter, never triangle mesh: ${JSON.stringify(results.map(x=>({...x,d:x.d?.slice(0,120)})))}`)
 assert(results.every(row=>row.computedFill!=='rgb(0, 0, 0)'),`Unexpected black fill: ${JSON.stringify(results.map(x=>({id:x.id,fill:x.computedFill})))}`)
 assert.deepEqual(errors,[])
 const accidental=await board.locator('[data-pattern-visual-grainline]').count()
 assert.equal(accidental,0,'Never render inferred grainline markers as giant navy shapes')
 const shapeCount=await board.locator('[data-pattern-surface="drafting-paper"]').count()
 assert(shapeCount>=2,'Expected front and back T-shirt patterns')
 const quick=page.getByRole('button',{name:'Grading Toolbar',exact:true});if(await quick.count())await quick.first().click();
 await page.waitForTimeout(900)
 const viewportAfter=await page.locator('.cc-viewport-2d').boundingBox();
 const canvasAfter=await page.locator('.cc-board').boundingBox();
 console.log('AFTER_SIDE_DOCK',JSON.stringify({viewportAfter,canvasAfter,errors}))
 assert(viewportAfter?.width>400&&viewportAfter?.height>300&&canvasAfter?.height>300,'Docked grading toolbar collapsed 2D viewport')
 const widget=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]');
 if(await widget.count()){console.log('PERSISTED_WIDGET',JSON.stringify({edge:await widget.getAttribute('data-exo-docked-edge'),rect:await widget.boundingBox()}))}
 const screenshot=path.join(output,'actual-native-tshirt-2d.png')
 await board.screenshot({path:screenshot})
 console.log(JSON.stringify({passed:true,stage,unauthoredGrainlines:accidental,panels:results.map(({id,valid,computedFill,rawFill,segments})=>({id,valid,computedFill,rawFill,segments})),screenshot,errors}))
} catch(e){console.error(JSON.stringify({passed:false,stage,error:e.stack||e.message,errors}));process.exitCode=1}
finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{};await sleep(200);for(const child of children)try{process.kill(-child.pid,'SIGKILL')}catch{}; /* keep screenshot for local review; no user documents touched */}
