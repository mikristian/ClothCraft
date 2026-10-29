/** Browser acceptance for real saved Liquid Glass Nest single-button drag. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const ui=process.env.EXO_NEST_TEST_URL||'http://127.0.0.1:5386'
const barId='qa-liquid-nest'
const fixture={version:1,workspace:{viewportLayout:'2d',customToolbars:[{
 id:barId,savedSourceId:'saved-liquid-glass-grade-nest',name:'Liquid Glass · Nest XS–XXL',
 dock:'floating',columns:1,orientation:'horizontal',visible:true,buttonOnly:true,
 finish:'glass',color:'#a57bff',x:170,y:185,tools:['exo:grade-nest-xs-xxl'],
}],savedToolbarLibrary:[{id:'saved-liquid-glass-grade-nest',
 name:'Liquid Glass · Nest XS–XXL',dock:'floating',columns:1,
 orientation:'horizontal',visible:false,buttonOnly:true,finish:'glass',
 color:'#a57bff',tools:['exo:grade-nest-xs-xxl']} ]}}
let browser,page,stage='launch'
const pageErrors=[]
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1536,height:990}})
 await context.addInitScript(value=>{
  // Only the actual target origin may set the test's storage, never the
  // initial about:blank page that Playwright creates before navigation.
  if(location.host!=='127.0.0.1:5386'&&location.host!=='127.0.0.1:5986')return
  if(sessionStorage.getItem('exo-nest-test-seeded')==='yes')return
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(value))
  sessionStorage.setItem('exo-nest-test-seeded','yes')
 },fixture)
 page=await context.newPage()
 page.on('pageerror',error=>pageErrors.push(error.message))
 stage='load EXO liquid glass saved button'
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=nest-grip-drag-20261028',
  {waitUntil:'domcontentloaded'})
 await page.locator('[data-exo-custom-toolbar-docking="true"]').waitFor({timeout:20000})
 const bar=page.locator('[data-custom-bar="'+barId+'"]')
 const grip=bar.locator('[data-exo-nest-drag-handle="true"]')
 const button=bar.locator('.exo-liquid-glass-nest-action')
 console.log(JSON.stringify({stage:'pre-wait',location:page.url(),
  barCount:await bar.count(),barVisible:await bar.isVisible(),
  allBars:await page.locator('[data-custom-bar]').count(),
  storage:await page.evaluate(()=>({stored:JSON.parse(localStorage.getItem('exo.studioCustomization.v1')||'{}')?.workspace?.customToolbars,
   origin:location.origin}))}))
 await grip.waitFor({state:'visible',timeout:20000})
 assert.equal(await bar.getAttribute('data-dock'),'floating')
 const start=await bar.boundingBox(),handle=await grip.boundingBox()
 assert(start?.width>=100&&handle?.width>=12,'Nest button or drag handle not visible')
 const hit=await page.evaluate(({x,y})=>{
  const element=document.elementFromPoint(x,y)
  return {tag:element?.tagName,className:element?.getAttribute('class'),
   dragElement:!!element?.closest('[data-exo-nest-drag-handle]')}
 },{x:handle.x+handle.width*.5,y:handle.y+handle.height*.5})
 console.log(JSON.stringify({stage:'hit-target',start,handle,hit}))
 assert(hit.dragElement,'Nest grip blocked by another overlay: '+JSON.stringify(hit))
 const pressedBefore=await button.getAttribute('aria-pressed')
 stage='physical 135px by 80px handle drag'
 await page.mouse.move(handle.x+handle.width*.5,handle.y+handle.height*.5)
 await page.mouse.down()
 await page.mouse.move(handle.x+handle.width*.5+135,handle.y+handle.height*.5+80,{steps:12})
 await page.mouse.up()
 await page.waitForTimeout(300)
 const end=await bar.boundingBox()
 const changed=await page.evaluate(id=>{
  const data=JSON.parse(localStorage.getItem('exo.studioCustomization.v1')||'{}')
  return data.workspace?.customToolbars?.find(item=>item.id===id)
 },barId)
 console.log(JSON.stringify({stage:'dragged',end,changed:{x:changed?.x,y:changed?.y,dock:changed?.dock},
  pressed:await button.getAttribute('aria-pressed')}))
 assert(end.x>start.x+100&&end.y>start.y+50,
  'Drag did not move actual Nest widget: '+JSON.stringify({start,end,changed}))
 assert.equal(changed.dock,'floating','Free drag incorrectly docked the Nest button')
 assert.equal(await button.getAttribute('aria-pressed'),pressedBefore,
  'Dragging accidentally toggled Nest')
 stage='persistent saved position on reload'
 await page.reload({waitUntil:'domcontentloaded'})
 await grip.waitFor({state:'visible',timeout:20000})
 const reopened=await bar.boundingBox()
 assert(Math.abs(reopened.x-end.x)<3&&Math.abs(reopened.y-end.y)<3,
  'Saved Nest position did not survive reload: '+JSON.stringify({end,reopened}))
 stage='drag the MAIN Nest button, not its grip'
 const buttonRect=await button.boundingBox()
 const mainStart=await bar.boundingBox()
 const mainPress=await button.getAttribute('aria-pressed')
 const mainX=buttonRect.x+buttonRect.width*.42,mainY=buttonRect.y+buttonRect.height*.48
 await page.mouse.move(mainX,mainY)
 await page.mouse.down()
 await page.mouse.move(mainX+102,mainY+63,{steps:13})
 const mainLive=await bar.boundingBox()
 assert(mainLive.x>mainStart.x+80&&mainLive.y>mainStart.y+44,
  'Main Nest button does not follow pointer during drag: '+JSON.stringify({mainStart,mainLive}))
 await page.mouse.up()
 await page.waitForTimeout(180)
 const mainEnd=await bar.boundingBox()
 assert(mainEnd.x>mainStart.x+80&&mainEnd.y>mainStart.y+44,
  'Main Nest drag failed to persist position')
 assert.equal(await button.getAttribute('aria-pressed'),mainPress,
  'Main Nest drag accidentally toggled grade nesting')
 await page.reload({waitUntil:'domcontentloaded'})
 await grip.waitFor({state:'visible',timeout:20000})
 const mainReloaded=await bar.boundingBox()
 assert(Math.abs(mainReloaded.x-mainEnd.x)<3&&Math.abs(mainReloaded.y-mainEnd.y)<3,
  'Main button drag position did not survive reload')
 stage='main action still independently toggles Nest'
 const buttonBefore=await button.getAttribute('aria-pressed')
 await button.click()
 await page.waitForTimeout(200)
 assert.notEqual(await button.getAttribute('aria-pressed'),buttonBefore,
  'Clicking the main Nest button should still toggle the grading nest')
 stage='drag from the saved top dock onto free canvas'
 await page.evaluate(id=>{
  const data=JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))
  const bar=data.workspace.customToolbars.find(item=>item.id===id)
  bar.dock='top'
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(data))
 },barId)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForFunction(id=>document.querySelector(`[data-custom-bar="${id}"]`)?.dataset.dock==='top',barId)
 const docked=await bar.boundingBox(),dockGrip=await grip.boundingBox()
 assert(docked&&dockGrip,'Top-docked Nest grip missing')
 const dockPress=await button.getAttribute('aria-pressed')
 await page.mouse.move(dockGrip.x+dockGrip.width/2,dockGrip.y+dockGrip.height/2)
 await page.mouse.down()
 await page.mouse.move(dockGrip.x+dockGrip.width/2+145,dockGrip.y+dockGrip.height/2+200,{steps:14})
 const intermediate=await bar.boundingBox()
 const floatingWhileDragging=await bar.getAttribute('data-dock')==='floating'
 await page.mouse.up()
 await page.waitForTimeout(280)
 const floatingAfterDock=await bar.boundingBox()
 const afterDockSave=await page.evaluate(id=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.customToolbars.find(item=>item.id===id),barId)
 assert(floatingWhileDragging&&intermediate.y>docked.y+90,
  'Nest does not visually follow pointer after leaving dock: '+JSON.stringify({docked,intermediate}))
 assert.equal(afterDockSave.dock,'floating','Nest was not detached from original dock')
 assert(floatingAfterDock.y>docked.y+90,'Dropped Nest returned to dock')
 assert.equal(await button.getAttribute('aria-pressed'),dockPress,'Dragging docked Nest toggled action')
 stage='keyboard move using accessible dotted grip'
 const xBefore=afterDockSave.x
 await grip.focus()
 await grip.press('ArrowRight')
 await page.waitForTimeout(180)
 const keyboardSave=await page.evaluate(id=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1')).workspace.customToolbars.find(item=>item.id===id),barId)
 assert.equal(keyboardSave.x,xBefore+8,'ArrowRight on the grip did not save the new position')
 assert.deepEqual(pageErrors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,
  movedPx:[Number((end.x-start.x).toFixed(1)),Number((end.y-start.y).toFixed(1))],
  persisted:true,dragsWithoutNestToggle:true,mainButtonDragMoves:true,
  mainButtonDragPersists:true,mainButtonDragDoesNotToggle:true,mainButtonToggles:true,
  dragOutOfDock:true,dragPreviewVisible:true,keyboardMoveSaved:true,
  pageErrors:0,installedBundle:ui.endsWith(':5386')}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,pageErrors,stack:error.stack}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
}
