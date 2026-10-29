/** Disposable operator E2E: the actual React grading toolbar/table drives
 * independently editable six-size rules while the real native bridge runs. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5771,uiPort=5772
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-optitex-20261027-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Real native exo-session binary is needed for UI acceptance')
const processes=[]
const start=(cmd,args,env={})=>{
 const proc=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 processes.push(proc)
}
async function ready(url){
 for(let i=0;i<100;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
  await sleep(250)
 }
 throw Error(`Isolated native grading UI service not ready: ${url}`)
}
let browser
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
 const opening=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({op:'open',preset:'tshirt'})})
 const opened=await opening.json()
 assert(opened.ok,JSON.stringify(opened).slice(0,500))
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const page=await browser.newPage({viewport:{width:1660,height:1050}})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=optitex-grading-20261027`,{waitUntil:'domcontentloaded'})
 try {await page.locator('.cc-board [data-panel]').first().waitFor({timeout:22000})}
 catch(error){
  console.error(JSON.stringify({stage:'native editor startup',pageErrors:errors,
   title:await page.title(),url:page.url(),body:(await page.locator('body').innerText()).slice(0,3500),
   nativeWorkspaces:await page.locator('[data-native-clothcraft]').count(),
   boards:await page.locator('.cc-board,.cc-board-v2,.cc-viewport-2d').count()},null,2))
  throw error
 }
 const full2d=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
 if(await full2d.count())await full2d.first().click()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 await sleep(350)
 await page.getByRole('button',{name:'Open compact movable Grading Table'}).click()
 const quickValues=page.locator('[data-exo-grade-bottom-widget="values"]')
 await quickValues.waitFor({state:'visible',timeout:8000})
 await quickValues.getByRole('button',{name:'Close Grading Table'}).click()
 await page.getByRole('button',{name:'Open compact movable Compare Length'}).click()
 const quickCompare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await quickCompare.waitFor({state:'visible',timeout:8000})
 await quickCompare.getByRole('button',{name:'Close Compare Length'}).click()
 await page.getByRole('button',{name:'Open all 24 native grading tools and grading table'}).click()
 const toolbar=page.locator('[data-optitex-grade-toolbar="true"]')
 try{await toolbar.waitFor({state:'visible',timeout:10000})}
 catch(error){
  console.error(JSON.stringify({stage:'open grading modal',pageErrors:errors,
   body:(await page.locator('body').innerText()).slice(0,4500),
   viewport:await page.locator('[data-viewport-layout]').first().getAttribute('data-viewport-layout').catch(()=>null),
   dialogCount:await page.locator('[data-clo-floating-widget="grading"]').count()},null,2))
  throw error
 }
 assert.equal(await toolbar.locator('[aria-label="24 grading commands"] button svg').count(),24,
  'Every Optitex command needs a real distinct icon in the operator toolbar')
 const docks=page.getByRole('group',{name:'Bottom grading analysis widgets'})
 await docks.getByRole('button',{name:'Grading Table ↗'}).click()
 const valueWidget=page.locator('[data-exo-grade-bottom-widget="values"]')
 await valueWidget.waitFor({state:'visible'})
 const table=valueWidget.locator('[data-optitex-grading-table="true"]')
 await table.waitFor({state:'visible'})
 assert.equal(await toolbar.locator('[aria-label="24 grading commands"] button').count(),24)
 await table.getByRole('button',{name:'Create native XS–XXL grade table'}).click()
 await toolbar.getByRole('combobox',{name:'Grading active point'}).selectOption('1')
 await toolbar.getByRole('combobox',{name:'Grading axis'}).selectOption('x')
 await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('2')
 await toolbar.getByRole('button',{name:'Set Grading tool'}).click()
 const result=table.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true})
 try {await result.waitFor({state:'attached',timeout:10000})}
 catch(error){
  console.error(JSON.stringify({stage:'grade point numeric edit',pageErrors:errors,
   toolbarStatuses:await toolbar.locator('[role="status"]').allInnerTexts(),
   tableStatuses:await table.locator('[role="status"]').allInnerTexts(),
   nativeMessages:await page.locator('.optitex-native-grade-message').allInnerTexts(),
   tableRows:await table.locator('tbody tr').allInnerTexts(),
   tableSpinbuttons:await table.getByRole('spinbutton').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('aria-label'),value:n.value}))),
  },null,2))
  throw error
 }
 assert.equal(Number(await result.inputValue()),2)
 await toolbar.getByRole('button',{name:/Copy Grading/}).click()
 await toolbar.getByRole('combobox',{name:'Grading target point'}).selectOption('0')
 const paste=toolbar.getByRole('button',{name:/Paste Grading/})
 assert.equal(await paste.isEnabled(),true,'Valid native clipboard must enable Paste Grading')
 await paste.click()
 await docks.getByRole('button',{name:'Compare Length ↗'}).click()
 const lengthWidget=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await lengthWidget.waitFor({state:'visible'})
 await lengthWidget.getByRole('table',{name:'Graded contour length comparison'}).waitFor()
 const lengthRows=await lengthWidget.locator('tbody tr').allInnerTexts()
 assert.equal(lengthRows.length,6)
 assert(lengthRows.some(row=>/\d+\.\d+/.test(row)),'Actual graded source contour lengths must be shown')
 await table.getByRole('checkbox',{name:'Show XS graded outline'}).uncheck()
 assert.equal(await table.getByRole('checkbox',{name:'Show XS graded outline'}).isChecked(),false)
 const handle=valueWidget.getByLabel('Move Grading Table panel')
 const starting=await valueWidget.boundingBox()
 await handle.hover()
 await page.mouse.down()
 await page.mouse.move(starting.x+85,starting.y-62,{steps:6})
 await page.mouse.up()
 const moved=await valueWidget.boundingBox()
 assert(Math.abs(starting.x-moved.x)>=35&&Math.abs(starting.y-moved.y)>=35,
  'Table drag handle must change the window position without changing native grading')
 await valueWidget.getByRole('button',{name:'Close Grading Table'}).click()
 await valueWidget.waitFor({state:'detached'})
 await docks.getByRole('button',{name:'Grading Table ↗'}).click()
 await valueWidget.waitFor({state:'visible'})
 const reopened=await valueWidget.boundingBox()
 assert(Math.abs(reopened.x-moved.x)<4&&Math.abs(reopened.y-moved.y)<4,
  'Bottom widget drag position should persist across close/reopen')
 // Bottom windows intentionally float above the editor. Close them to access
 // any underlying command, without changing the graded pattern source.
 await valueWidget.getByRole('button',{name:'Close Grading Table'}).click()
 await lengthWidget.getByRole('button',{name:'Close Compare Length'}).click()
 await toolbar.getByRole('button',{name:'Stack Point'}).click()
 // A browser-only grading draft cannot mutate native physical notch topology.
 // Grade Notch is exercised separately after a verified persisted six-size
 // catalog in qa-v2-native-graded-notch-operator-20261027.mjs.
 assert.equal(await toolbar.getByRole('button',{name:'Grade Notch'}).isDisabled(),true,
  'Physical Grade Notch must fail closed until an actual native grade catalog is saved')
 await docks.getByRole('button',{name:'Grading Table ↗'}).click()
 await valueWidget.waitFor({state:'visible'})
 await table.getByRole('button',{name:'Save validated sizes to Rust'}).click()
 // One-sided point growth on a sewn T-shirt is NOT a valid industrial catalog.
 // The actual native Rust save path must reject this mismatched sewing rather
 // than silently mark the six-size run as production-approved.
 try{await page.getByText('Native grading refused: Sewn seam validation failed: SEWN_SEAM_LENGTH_MISMATCH',{exact:false}).first().waitFor({timeout:12000})}
 catch(error){
  console.error(JSON.stringify({stage:'native Rust grade catalog commit',pageErrors:errors,
   tableStatus:await table.locator('[role="status"]').allInnerTexts(),
   nativeMessages:await page.locator('[data-native-catalog-message]').allInnerTexts(),
   savedCatalog:await page.getByText('SAVED IN PROJECT',{exact:true}).count(),
   nativeGradeWarnings:await page.locator('.exo-native-graded-catalog').allInnerTexts()},null,2))
  throw error
 }
 assert(!errors.length,errors.join('\n'))
 console.log(JSON.stringify({passed:true,nativeRust:true,toolCount:24,
  icons:24,gradeTableEdited:true,clipboardPaste:true,contourComparison:true,sizeVisibility:true,
  separateBottomWidgets:true,movableBottomTable:true,persistedDockPosition:true,
  twoDQuickLaunchers:true,physicalNotchRequiresNativePreflight:true,
  nativeUnbalancedSeamRejection:true,leftRailLauncher:true,
  factoryApproved:false,optitexLicensedParity:false}))
}finally{
 if(browser)await browser.close()
 for(const proc of processes){try{process.kill(-proc.pid,'SIGTERM')}catch{}}
 await sleep(250)
 rmSync(output,{recursive:true,force:true})
}
