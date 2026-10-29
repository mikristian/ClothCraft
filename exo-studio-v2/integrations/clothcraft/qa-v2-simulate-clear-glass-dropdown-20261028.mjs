/** Real Chrome and native ClothCraft Simulate dropdown optical surface check.
 * Both top and footer menus must have the same CLEAR transparent glass skin,
 * with no blur, working keyboard and hover interactions. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=6063,uiPort=6064
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-clear-simulate-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'Native Rust binary required for simulated workspace UI check')
const services=[]
const launch=(command,args,env={})=>{
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 services.push(child)
}
async function ready(url){
 for(let n=0;n<95;n++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1300)})).ok)return}catch{}
  await sleep(220)
 }
 throw Error('Server unavailable: '+url)
}
let browser,page,stage='boot'
const pageErrors=[]
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0',
 })
 launch(path.join(root,'node_modules/.bin/vite'),
  ['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 assert((await (await fetch(native+'/workspace',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'}),
 })).json()).ok,'Native T-shirt fixture could not open')
 browser=await chromium.launch({
  headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run'],
 })
 page=await browser.newPage({viewport:{width:1680,height:960}})
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=simulate-glass-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:25000})
 const inspect=async locator=>locator.evaluate(node=>{
  const style=getComputedStyle(node)
  const rect=node.getBoundingClientRect()
  const front=document.elementFromPoint(rect.left+rect.width/2,rect.top+Math.min(rect.height/2,25))
  const rgba=style.backgroundColor.match(/rgba?\(([^)]+)\)/i)
  const rgb=rgba?rgba[1].split(/[,\s/]+/).filter(Boolean):[]
  return {
   background:style.backgroundColor,alpha:rgb.length===4?Number(rgb[3]):1,
   image:style.backgroundImage,filter:style.backdropFilter||style.webkitBackdropFilter,
   border:style.borderTopColor,borderRadius:style.borderTopLeftRadius,
   boxShadow:style.boxShadow,color:style.color,
   width:rect.width,height:rect.height,
   withinViewport:rect.left>=-1&&rect.right<=innerWidth+1&&rect.top>=-1&&rect.bottom<=innerHeight+1,
   topHitWithinMenu:node===front||node.contains(front),
  }
 })
 const assertClear=(s,name)=>{
  assert(s.alpha>.15&&s.alpha<.75,`${name}: glass must be transparent, not opaque or invisible: ${s.background}`)
  assert(s.image.includes('gradient'),`${name}: no full-panel optical reflection: ${s.image}`)
  assert(!/blur\(/.test(s.filter),`${name}: blur fog is prohibited: ${s.filter}`)
  assert(s.withinViewport,`${name}: menu must not be clipped offscreen: ${JSON.stringify(s)}`)
  assert(s.topHitWithinMenu,`${name}: another overlay obstructs the menu`)
  assert(s.width>=245&&s.height>=120,`${name}: lens should cover the entire menu`)
 }
 stage='top menu open and clear transparent glass'
 const topTrigger=page.locator('.clo-header-primary-actions .clo-simulate-arrow')
 await topTrigger.click()
 const topMenu=page.locator('#exo-simulate-mode-dropdown')
 await topMenu.waitFor({state:'visible'})
 assert.equal(await topTrigger.getAttribute('aria-expanded'),'true')
 assert.equal(await topMenu.getAttribute('role'),'menu')
 assert((await topMenu.getByRole('button').count())>=4,'Expected all top Simulate actions')
 const topStyle=await inspect(topMenu)
 assertClear(topStyle,'Top Simulate')
 const topOption=topMenu.getByRole('button',{name:'Print Layout'})
 await topOption.hover()
 const hover=await topOption.evaluate(el=>getComputedStyle(el).backgroundColor)
 assert.notEqual(hover,'rgba(0, 0, 0, 0)','Hovered option needs a subtle visual highlight')
 await topOption.focus()
 await page.keyboard.press('Escape')
 assert.equal(await topMenu.count(),0,'Escape must close top Simulate dropdown')
 assert.equal(await topTrigger.getAttribute('aria-expanded'),'false')
 stage='bottom Simulate dropdown clear glass and simultaneous menu exclusion'
 const footerTrigger=page.locator('.sim-footer-mode-switch .sim-mode-arrow')
 await footerTrigger.click()
 const footerMenu=page.locator('#exo-simulate-footer-dropdown')
 await footerMenu.waitFor({state:'visible'})
 assert.equal(await footerTrigger.getAttribute('aria-expanded'),'true')
 assert.equal(await footerMenu.getAttribute('role'),'menu')
 assert((await footerMenu.getByRole('menuitem').count())>=5,'Expected footer workspace modes')
 const footerStyle=await inspect(footerMenu)
 assertClear(footerStyle,'Bottom Simulate')
 await topTrigger.click()
 assert.equal(await footerMenu.count(),0,'Opening top menu must close footer menu')
 assert.equal(await topMenu.count(),1,'Top menu should remain operable')
 await footerTrigger.click()
 assert.equal(await topMenu.count(),0,'Opening footer menu must close top menu')
 const footerOption=footerMenu.getByRole('menuitem',{name:/Animation Workspace/})
 await footerOption.focus()
 await page.keyboard.press('Escape')
 assert.equal(await footerMenu.count(),0,'Escape must close footer Simulate dropdown')
 assert.deepEqual(pageErrors,[],'No JS errors')
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,
  topGlass:topStyle,footerGlass:footerStyle,menuExclusion:true,
  keyboardEscape:true,hoverHighlight:hover,scriptErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack,pageErrors}))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of services)try{process.kill(-child.pid,'SIGTERM')}catch{}
 await sleep(250)
 for(const child of services)try{process.kill(-child.pid,'SIGKILL')}catch{}
 rmSync(output,{recursive:true,force:true})
}
