// Disposable live Rust/Vite/Chrome regression for CLO-inspired settings and
// tracing-photo entry points. All writes stay in isolated browser contexts.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-floating-settings-'))
// The native bridge intentionally accepts only audited browser origins.
// 5189 is an existing explicitly-allowed disposable QA origin.
const ui='http://127.0.0.1:5189',api='http://127.0.0.1:5775',children=[],report={output,checks:[]}
const run=(binary,args,env={})=>children.push(spawn(binary,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}}))
const ready=async url=>{for(let i=0;i<130;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(850)})).ok)return true}catch{}await new Promise(r=>setTimeout(r,200))}return false}
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9kK7oAAAAASUVORK5CYII=','base64')
let browser
try{
 const rust=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
 const hasRust=existsSync(rust)
 if(hasRust)run(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5775',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:rust,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 run(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5189','--strictPort'],hasRust?{VITE_CLOTHCRAFT_BRIDGE_URL:api}:{})
 assert(await ready(ui),'Vite unavailable')
 const nativeReady=hasRust&&await ready(api+'/health')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 for(const engine of (process.env.EXO_QA_ENGINE==='clothcraft'&&nativeReady)?['clothcraft']:(process.env.EXO_QA_ENGINE==='legacy'?['legacy']:(nativeReady?['legacy','clothcraft']:['legacy']))){
  const context=await browser.newContext({viewport:{width:1680,height:1050},acceptDownloads:true})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',e=>{errors.push(e.message);report.checks.push({engine:name,pageError:e.message})})
  if(engine==='clothcraft'){
   await page.route('**/workspace',async route=>{
    try{
     const response=await route.fetch({url:api+'/workspace',timeout:20000})
     await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
    }catch(error){await route.abort('failed');report.checks.push({engine:name,backendError:String(error)})}
   })
  }
  const name=engine==='legacy'?'legacy':'native'
  await page.goto(ui+`/?desktop=1&engine=${engine}&qa=floating-settings-${name}`,{waitUntil:'domcontentloaded'})
  const metadata=await page.evaluate(()=>({title:document.title,body:document.body?.innerText?.slice(0,500),mount:document.querySelector('#root')?.children?.length||0}))
  report.checks.push({engine:name,boot:metadata})
  const opener=page.getByRole('button',{name:'Open Studio Settings'})
  await opener.waitFor({timeout:20000});await opener.click()
  const dialog=page.getByTestId('studio-settings-dialog');await dialog.waitFor()
  assert.equal(await dialog.getAttribute('aria-modal'),'false')
  assert.equal(await page.getByTestId('studio-settings-overlay').evaluate(el=>getComputedStyle(el).pointerEvents),'none')
  const before=await dialog.boundingBox(),bar=page.getByTestId('studio-settings-titlebar'),head=await bar.boundingBox()
  await page.mouse.move(head.x+80,head.y+18);await page.mouse.down();await page.mouse.move(head.x+145,head.y+61,{steps:6});await page.mouse.up()
  const after=await dialog.boundingBox()
  assert(after.x>before.x+25&&after.y>before.y+15,'Settings window did not drag independently')
  report.checks.push({engine:name,settings:'movable nonmodal window',positionFrom:[Math.round(before.x),Math.round(before.y)],positionTo:[Math.round(after.x),Math.round(after.y)]})
  await page.mouse.move(after.x+after.width-3,after.y+after.height-3)
  await page.mouse.down()
  await page.mouse.move(after.x+after.width+70,after.y+after.height+54,{steps:8})
  await page.mouse.up()
  const resized=await dialog.boundingBox()
  assert(resized.width>after.width+30&&resized.height>after.height+20,'Settings widget cannot be resized')
  await page.waitForFunction(()=>{
    const rect=document.querySelector('[data-testid="studio-settings-dialog"]')?.getBoundingClientRect()
    const saved=JSON.parse(localStorage.getItem('exo.studioSettingsWindow.v1')||'null')
    return rect&&saved&&Math.abs(rect.width-saved.width)<4&&Math.abs(rect.height-saved.height)<4
  },null,{timeout:9000})
  const savedGeometry=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioSettingsWindow.v1')))
  assert(savedGeometry.width>=resized.width-3 && savedGeometry.height>=resized.height-3)
  report.checks.push({engine:name,settingsSize:'floating widget resized and saved',before:[Math.round(after.width),Math.round(after.height)],after:[Math.round(resized.width),Math.round(resized.height)]})
  await page.screenshot({path:path.join(output,`${name}-settings-widget.png`)}).catch(()=>{})
  await page.getByTestId('settings-tab-environment').click()
  await page.getByRole('combobox',{name:'Studio background mode'}).selectOption('color')
  await page.getByRole('textbox',{name:'Studio background hexadecimal color'}).fill('#131313')
  await page.getByRole('spinbutton',{name:'Horizontal (X)'}).fill('7')
  await page.getByRole('slider',{name:'Light intensity'}).fill('0.6')
  await page.waitForTimeout(200)
  const setting=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).appearance)
  assert.equal(setting.backgroundMode,'color')
  assert.equal(setting.lightPositionX,7)
  assert.equal(setting.lightIntensity,.6)
  const visible=engine==='legacy'?page.locator('.three-mount canvas').first():page.locator('.cc-viewport-3d canvas').first()
  await visible.waitFor({timeout:35000})
  await page.waitForFunction(engine=>{
   const cv=document.querySelector(engine==='legacy'?'.three-mount canvas':'.cc-viewport-3d canvas')
   return cv?.dataset.studioBackgroundMode==='color'&&cv?.dataset.studioLightPosition?.startsWith('7.00,')
  },engine,{timeout:18000})
  report.checks.push({engine:name,environment:'custom dark background and light transform updated live'})
  await page.getByTestId('studio-reset-environment').click()
  await page.waitForFunction(engine=>{
   const cv=document.querySelector(engine==='legacy'?'.three-mount canvas':'.cc-viewport-3d canvas')
   return cv?.dataset.studioBackgroundMode==='default'&&cv?.dataset.studioLightPosition?.startsWith('2.50,4.50,3.10')
  },engine,{timeout:16000})
  const neutral=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).appearance)
  assert.equal(neutral.backgroundMode,'default');assert.equal(neutral.lightIntensity,1)
  report.checks.push({engine:name,environmentReset:'factory gradient and key light position/intensity restored'})
  await page.getByTestId('settings-tab-workspace').click()
  assert.equal(await page.getByRole('button',{name:'Move 2D toolbar'}).count(),0,'2D toolbar should be locked by default')
  await page.getByRole('checkbox',{name:'Arrange toolbars'}).check()
  await page.getByRole('button',{name:'Move 2D toolbar'}).waitFor({timeout:9000})
  await page.getByRole('button',{name:'Move 3D toolbar'}).waitFor({timeout:9000})
  const leftOptions=page.getByRole('combobox',{name:'left toolbar dock'})
  await leftOptions.selectOption('top')
  await page.getByRole('button',{name:'Move 3d:A02 up in left toolbar'}).click()
  await page.getByRole('button',{name:'Move 2d:A02 up in right toolbar'}).click()
  await page.getByRole('button',{name:'Remove 3d:A03 from left toolbar'}).click()
  await page.getByRole('button',{name:'Remove 2d:A03 from right toolbar'}).click()
  const orderBeforeReload=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.leftToolbarIds)
  assert.deepEqual(orderBeforeReload.slice(0,2),['3d:A02','3d:A01'])
  const rightOrder=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.rightToolbarIds)
  assert.deepEqual(rightOrder.slice(0,2),['2d:A02','2d:A01'])
  const leftBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.leftToolbarDock)
  assert.equal(leftBefore,'top')
  await page.getByTestId('studio-settings-apply').click()
  await page.reload({waitUntil:'domcontentloaded'})
  assert.equal(await page.locator('[data-studio-customized="true"]').count(),1)
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.leftToolbarDock),'top')
  const realLeftBar=page.locator('.clo-observed-3d-bars.exo-reorderable-toolbar')
  await realLeftBar.waitFor({timeout:15000})
  assert.equal(await realLeftBar.getAttribute('data-toolbar-dock'),'top')
  assert.equal(await realLeftBar.evaluate(el=>getComputedStyle(el).position),'fixed')
  const posA1=await realLeftBar.locator('[data-clo-slot="3d:A01"]').boundingBox()
  const posA2=await realLeftBar.locator('[data-clo-slot="3d:A02"]').boundingBox()
  assert(posA1&&posA2&&posA2.y<posA1.y,'Stored A02 order did not move that real icon visually above A01')
  report.checks.push({engine:name,toolbarOrder:'Real 3D A02 moved ahead of A01 and restored after reload'})
  const realRightBar=page.locator('.clo-right-tool-palette.exo-reorderable-toolbar')
  const rightA1=await realRightBar.locator('[data-clo-slot="2d:A01"]').boundingBox()
  const rightA2=await realRightBar.locator('[data-clo-slot="2d:A02"]').boundingBox()
  report.checks.push({engine:name,rightSlotDebug:{
    a1:rightA1,a2:rightA2,
    styles:await realRightBar.locator('[data-clo-slot="2d:A01"],[data-clo-slot="2d:A02"]').evaluateAll(nodes=>nodes.map(el=>({id:el.dataset.cloSlot,inline:el.style.top,computed:getComputedStyle(el).top,offsetTop:el.offsetTop}))),
    mode:await realRightBar.getAttribute('class'),
  }})
  assert(rightA1&&rightA2&&rightA2.y<rightA1.y,'Stored 2D order did not move A02 above A01')
  report.checks.push({engine:name,toolbarOrder:'Real 2D A02 moved above A01 and restored after reload'})
  assert.equal(await realLeftBar.locator('[data-clo-slot="3d:A03"]').count(),0,'Removed left tool must leave the 3D strip')
  assert.equal(await realRightBar.locator('[data-clo-slot="2d:A03"]').count(),0,'Removed right tool must leave the 2D strip')
  report.checks.push({engine:name,toolbarRemoval:'2D and 3D deleted slots are truly absent after reload'})
  const grip=realLeftBar.getByRole('button',{name:'Move 3D toolbar'})
  const gripRect=await grip.boundingBox();assert(gripRect)
  await page.mouse.move(gripRect.x+gripRect.width/2,gripRect.y+gripRect.height/2)
  await page.mouse.down()
  await page.mouse.move(gripRect.x+gripRect.width/2+43,gripRect.y+gripRect.height/2+35,{steps:7})
  await page.mouse.up()
  await page.waitForFunction(()=>{
    const w=JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace
    return w.leftToolbarDock==='floating'&&Math.abs(w.leftToolbarPosition.x)>20&&Math.abs(w.leftToolbarPosition.y)>10
  },null,{timeout:9000})
  report.checks.push({engine:name,toolbar:'Actual 3D strip top dock and drag-to-floating position persisted'})
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  const reopened=await page.getByTestId('studio-settings-dialog').boundingBox()
  assert(Math.abs(reopened.width-resized.width)<4&&Math.abs(reopened.height-resized.height)<4,'Saved floating-window size must reopen')
  await page.getByRole('combobox',{name:'Add tool to left toolbar'}).selectOption('3d:A03')
  await page.getByRole('combobox',{name:'Add tool to right toolbar'}).selectOption('2d:A03')
  await page.waitForFunction(()=>document.querySelector('[data-clo-slot="3d:A03"]')&&document.querySelector('[data-clo-slot="2d:A03"]'))
  report.checks.push({engine:name,toolbarRestore:'Tools can be added back to both live toolbars'})
  await page.getByRole('button',{name:'Reset defaults'}).click()
  await page.getByRole('button',{name:'Reset everything'}).click()
  await page.waitForFunction(()=>{
   const value=JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))
   return value.workspace.leftToolbarDock==='left'&&value.appearance.backgroundMode==='default'&&value.appearance.environmentPreset==='studio'
  })
  assert.equal(await page.getByRole('checkbox',{name:'Arrange toolbars'}).isChecked(),false,'Factory reset must lock toolbars')
  report.checks.push({engine:name,workspace:'dock persisted after reload, global Reset restored dock and 3D studio'})
  await page.getByTestId('studio-settings-apply').click()
  assert.equal(await page.getByRole('button',{name:'Add background reference image'}).count(),0,'Old persistent reference button remains')
  const svg=engine==='legacy'?page.locator('.pattern-canvas'):page.locator('.cc-board svg').first()
  try{await svg.waitFor({timeout:12000})}
  catch(error){
   report.checks.push({engine:name,nativeSurfaceMissing:{
    root:await page.locator('[data-native-clothcraft]').count(),
    text:await page.locator('[data-native-clothcraft]').first().innerText().then(t=>t.slice(-850)).catch(()=>null),
    body:await page.locator('body').innerText().then(t=>t.slice(-500)).catch(()=>null),
   }})
   throw error
  }
  const blank=await svg.evaluate(node=>{
   const r=node.getBoundingClientRect(),sample=[]
   for(const fy of [.80,.70,.90,.55,.43,.22])for(const fx of [.28,.42,.60,.75,.18,.88]){
    const x=Math.round(r.x+r.width*fx),y=Math.round(r.y+r.height*fy),element=document.elementFromPoint(x,y)
    sample.push({x,y,tag:element?.tagName,cl:element?.getAttribute?.('class')?.toString()?.slice(0,50)})
    if(element&&node.contains(element)&&!element.closest?.('[data-piece-id],[data-panel],[data-reference-controls]'))return {x,y,tag:element.tagName}
   }
   return {notFound:true,rect:{x:r.x,y:r.y,width:r.width,height:r.height},samples:sample}
  })
  report.checks.push({engine:name,blankCandidate:blank})
  assert(!blank.notFound,'Unable to find unobscured blank 2D drafting area')
  await page.mouse.click(blank.x,blank.y,{button:'right'})
  const entry=page.getByRole('menuitem',{name:/Background Image/i})
  await entry.waitFor({timeout:10000})
  const chooserPromise=page.waitForEvent('filechooser',{timeout:12000})
  await entry.click()
  const chooser=await chooserPromise
  await chooser.setFiles({name:'test-2d-background.png',mimeType:'image/png',buffer:image})
  await page.locator('[data-2d-reference-image]').first().waitFor({timeout:12000})
  assert(await page.getByRole('group',{name:'2D reference photo settings'}).isVisible())
  report.checks.push({engine:name,reference:'blank 2D context-menu adds tracing photo behind actual patterns'})
  // A design-window position saved on a larger external monitor must recover
  // when EXO is reopened on a smaller laptop screen.
  await page.evaluate(()=>localStorage.setItem('exo.studioSettingsWindow.v1',JSON.stringify({x:5800,y:3800,width:1900,height:1450})))
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  const correctedWindow=await page.getByTestId('studio-settings-dialog').boundingBox()
  assert(correctedWindow.x>=0&&correctedWindow.y>=0&&correctedWindow.x+correctedWindow.width<=1680&&correctedWindow.y+correctedWindow.height<=1050,'Floating Settings lost outside resized workspace')
  assert(correctedWindow.width<=1100&&correctedWindow.height<=820,'Recovered Settings should be a floating window, not almost fullscreen')
  report.checks.push({engine:name,displayRecovery:'Offscreen saved window reopened fully visible on 1680×1050',geometry:correctedWindow})
  await page.getByTestId('studio-settings-apply').click()
  await page.screenshot({path:path.join(output,`${name}-studio-settings-and-reference.png`)}).catch(()=>{})
  assert.deepEqual(errors,[],name+' page errors')
  await context.close()
 }
 report.pass=true;report.nativeReady=nativeReady
 console.log(JSON.stringify(report,null,2))
}catch(e){report.pass=false;report.error=e.stack||String(e);console.error(JSON.stringify(report,null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}
