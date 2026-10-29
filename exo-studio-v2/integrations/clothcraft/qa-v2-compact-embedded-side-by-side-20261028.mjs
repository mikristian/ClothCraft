/** Live Chrome acceptance: compact native grading widgets and positional docking. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5891,uiPort=5892
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-compact-side-by-side-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Existing native Rust session binary required')
const children=[]
const start=(cmd,args,env={})=>{
 const child=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
 return child
}
const ready=async url=>{
 for(let i=0;i<90;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(200)
 }
 throw Error(`Service did not start: ${url}`)
}
let browser,page,stage='startup'
const errors=[]
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:session,EXO_CLOTHCRAFT_GPU:'0',
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:native,
 })
 await Promise.all([ready(native+'/health'),ready(ui)])
 const opened=await (await fetch(native+'/workspace',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})})).json()
 assert(opened.ok,'Native T-shirt project failed to open')
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1660,height:1050}})
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 stage='open full 2D workspace'
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=compact-side-by-side-20261028`,
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:20000})
 const full=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full.count())await full.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const host=page.locator('[data-exo-grade-dock-host="true"]')
 await host.waitFor({state:'attached'})
 stage='dock compare first'
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor({state:'visible'})
 await compare.getByRole('button',{name:'Dock Compare Length'}).click()
 assert.equal(await compare.getAttribute('data-docked'),'true')
 const height=(await host.boundingBox()).height
 assert(height>=110&&height<=185,`Compact bottom dock height expected ~158px, got ${height}`)
 stage='hover grading table on left of compare'
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 const grade=page.locator('[data-exo-grade-bottom-widget="values"]')
 await grade.waitFor({state:'visible'})
 const title=await grade.locator('.exo-grade-bottom-widget__titlebar').boundingBox()
 const neighbor=await compare.boundingBox()
 const source={x:title.x+65,y:title.y+10}
 const target={x:neighbor.x+neighbor.width*.22,y:neighbor.y+Math.min(65,neighbor.height*.55)}
 await page.mouse.move(source.x,source.y);await page.mouse.down()
 await page.mouse.move(target.x,target.y,{steps:18})
 assert.equal(await host.getAttribute('data-exo-grade-dock-drag-hover'),'true')
 assert.equal(await host.getAttribute('data-exo-dock-preview-position'),'1/2')
 await page.mouse.up()
 await page.waitForFunction(()=>document.querySelector('[data-exo-grade-bottom-widget="values"]')?.dataset.docked==='true')
 const gradeRect=await grade.boundingBox(),compareRect=await compare.boundingBox()
 assert(gradeRect.x<compareRect.x,'Grade table must dock to hovered left side of Compare Length')
 assert(Math.abs(gradeRect.y-compareRect.y)<6,'Both widgets must share one embedded row')
 assert(Math.abs((await host.boundingBox()).height-height)<3,'Dock height must not grow as second widget embeds')
 stage='reverse left/right via embedded grip'
 const grip=await grade.locator('[data-exo-widget-grip="true"]').boundingBox()
 const next={x:compareRect.x+compareRect.width*.8,y:compareRect.y+Math.min(65,compareRect.height*.55)}
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down()
 await page.mouse.move(next.x,next.y,{steps:17})
 await page.mouse.up()
 await page.waitForTimeout(180)
 const changedGrade=await grade.boundingBox(),changedCompare=await compare.boundingBox()
 assert(changedGrade.x>changedCompare.x,'Grading table must reorder to the right when hovered there')
 stage='compact worksheet editable controls'
 assert(await grade.locator('table tbody tr').count()>=6,'Grading Table must retain six sizes')
 assert(await compare.locator('table tbody tr').count()>=6,'Compare Length must retain six sizes')
 assert(await grade.locator('input,select,button').count()>5,'Grading controls must remain in the dock')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,realRust:true,dockHeightPx:height,
  hoveredLeftPreview:true,sideBySide:true,reorderedRight:true,sizeRows:6}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:String(error),errors},null,2))
 process.exitCode=1
}finally{
 if(browser)await browser.close().catch(()=>{})
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
 await sleep(350)
 for(const child of children){try{process.kill(-child.pid,'SIGKILL')}catch{}}
 rmSync(output,{recursive:true,force:true})
}
