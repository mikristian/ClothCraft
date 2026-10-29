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
const nativePort=5793,uiPort=5794
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-optitex-24-live-20261027-'))
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
 page.setDefaultTimeout(9000)
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=optitex-24-live-20261027`,{waitUntil:'domcontentloaded'})
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
 const commands=[
  ['prev-point','Prev point'],['copy-grading','Copy Grading'],['paste-grading','Paste Grading'],
  ['set-grading-tool','Set Grading tool'],['paste-x-grading','Paste X Grading'],
  ['paste-y-grading','Paste Y Grading'],['paste-relatively','Paste Relatively'],
  ['paste-dd-grading','Paste DD Grading'],['next-point','Next point'],['angle','Angle'],
  ['show-from-base-size','Show from Base Size'],['grade-proportionally','Grade proportionally'],
  ['clear-grading','Clear Grading'],['stack-point','Stack Point'],['move-point-size','Move Point Size'],
  ['move-size-along','Move Size Along'],['move-size-proportional','Move Size Proportional'],
  ['move-size-parallel','Move Size Parallel'],['move-size-by-rectangle','Move Size by Rectangle'],
  ['align-points-size','Align Points Size'],['align-vertical-size','Align Vertical Size'],
  ['align-horizontal-size','Align Horizontal Size'],['align-size-by-line','Align Size by Line'],
  ['grade-notch','Grade Notch'],
 ]
 const grid=toolbar.getByRole('group',{name:'24 grading commands'})
 assert.equal(await grid.getByRole('button').count(),24)
 assert.equal(await grid.locator('button svg').count(),24,'All 24 commands must have real SVG icons')
 console.error('24-command acceptance: icons present')
 const beforeResponse=await (await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})).json()
 const nativeBefore=beforeResponse.data||beforeResponse.snapshot||beforeResponse.state||beforeResponse
 assert(nativeBefore.template?.panels?.length>=2,`Real native T-shirt geometry must be loaded: ${JSON.stringify(beforeResponse).slice(0,600)}`)
 console.error('24-command acceptance: native snapshot verified')
 const docks=page.getByRole('group',{name:'Bottom grading analysis widgets'})
 await docks.getByRole('button',{name:'Grading Table ↗'}).click()
 const table=page.locator('[data-optitex-grading-table="true"]')
 await table.waitFor({state:'visible'})
 await table.getByRole('button',{name:'Create native XS–XXL grade table'}).click()
 await page.locator('[data-exo-grade-bottom-widget="values"]').getByRole('button',{name:'Close Grading Table'}).click()
 await page.locator('[data-exo-grade-bottom-widget="values"]').waitFor({state:'detached'})
 console.error('24-command acceptance: six-size sidecar opened')
 const status=toolbar.locator('.exo-optitex-grade-notice')
 const clicked=[],succeeded=[],rejected=[],preconditions=[]
 const button=name=>grid.getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?: \\(|$)')})
 async function run(id,name,{requireSuccess=false}={}){
  const b=button(name)
  if(!(await b.isEnabled())){
   preconditions.push({id,reason:'disabled by actual toolbar precondition'})
   if(requireSuccess)throw Error(`${id}: unexpectedly disabled`)
   return
  }
  await b.click()
  clicked.push(id)
  await expectNotice(id,name,requireSuccess)
  console.error(`24-command acceptance: ${id} clicked`)
 }
 async function expectNotice(id,name,requireSuccess){
  await assert.doesNotReject(()=>status.waitFor({state:'visible'}))
  const actual=await status.innerText()
  const ok=/completed|copied|Selected P|Showing|Native physical Grade Notch editor opened|unchanged|graded|point grading|Atomic sidecar grading edit validated across all sizes|Per-size point grading copied/i.test(actual)&&!/rejected|failed|unavailable|did not confirm/i.test(actual)
  const fail=/rejected:|failed:|Tool unavailable|did not confirm/i.test(actual)
  assert(ok||fail,`${id}: no confirmed result or explicit rejection: ${actual}`)
  if(requireSuccess)assert(ok,`${id}: expected success but received ${actual}`)
  ;(ok?succeeded:rejected).push({id,notice:actual})
 }
 await toolbar.getByRole('combobox',{name:'Grading active point'}).selectOption('1')
 await toolbar.getByRole('combobox',{name:'Grading source point'}).selectOption('0')
 await toolbar.getByRole('combobox',{name:'Grading target point'}).selectOption('2')
 await toolbar.getByRole('combobox',{name:'Grading axis'}).selectOption('x')
 await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('2')
 await run('set-grading-tool','Set Grading tool',{requireSuccess:true})
 await run('copy-grading','Copy Grading',{requireSuccess:true})
 await run('paste-grading','Paste Grading',{requireSuccess:true})
 await run('paste-x-grading','Paste X Grading',{requireSuccess:true})
 await run('paste-y-grading','Paste Y Grading',{requireSuccess:true})
 await run('paste-relatively','Paste Relatively')
 await run('paste-dd-grading','Paste DD Grading')
 // Exercise shortcut dispatch with a verified clipboard before destructive transforms.
 const keyboard=[]
 await toolbar.focus()
 for(const [key,id,name] of [['Shift+C','copy-grading','Copy Grading'],['Shift+V','paste-grading','Paste Grading'],['Shift+X','paste-x-grading','Paste X Grading'],['Shift+Y','paste-y-grading','Paste Y Grading']]){
  assert(await button(name).isEnabled(),`${id}: shortcut target disabled`)
  await toolbar.focus()
  await page.keyboard.press(key)
  await expectNotice('shortcut-'+id,name,true)
  keyboard.push(id)
 }
 await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('0')
 await toolbar.getByRole('spinbutton',{name:'Grading angle degrees'}).fill('0')
 for(const [id,name] of commands){
  if(clicked.includes(id)||id==='grade-notch')continue
  if(id==='move-size-by-rectangle'){
   const details=toolbar.locator('details.exo-optitex-grade-rectangle')
   await details.locator('summary').click()
   await toolbar.getByRole('spinbutton',{name:'Grading rectangle width millimetres'}).fill('1000')
   await toolbar.getByRole('spinbutton',{name:'Grading rectangle height millimetres'}).fill('1000')
  }
  if(id.startsWith('align-')){
   await toolbar.getByRole('textbox',{name:'Additional graded point indices'}).fill('0,2')
  }
  if(id==='grade-proportionally'||id==='move-size-proportional'){
   await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('1')
  }else await toolbar.getByRole('spinbutton',{name:'Grading movement millimetres'}).fill('0')
  await run(id,name)
 }
 await docks.getByRole('button',{name:'Compare Length ↗'}).click()
 const lengthWidget=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await lengthWidget.getByRole('table',{name:'Graded contour length comparison'}).waitFor()
 assert.equal(await lengthWidget.locator('tbody tr').count(),6)
 const afterResponse=await (await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})).json()
 const nativeAfter=afterResponse.data||afterResponse.snapshot||afterResponse.state||afterResponse
 assert.equal(nativeAfter.revision,nativeBefore.revision,'Independent sidecar operations must preserve native source revision')
 assert.equal(clicked.length+succeeded.filter(x=>x.id.startsWith('shortcut-')).length,clicked.length+4)
 assert(!errors.length,errors.join('\n'))
 console.log(JSON.stringify({passed:true,realChrome:true,realNativeTshirt:true,nativePatternPanels:nativeBefore.template.panels.length,
   nativeRevisionPreserved:true,totalCommands:24,icons:24,clickedCount:clicked.length,
   clicked,succeededCount:succeeded.length,rejected,preconditions,shortcutCount:keyboard.length,keyboard,
   gradeNotch:'separate physical one-revision Rust acceptance; intentionally not clicked',
   lengthComparisonSixSizes:true,factoryApproved:false,licensedOptitexParity:false},null,2))
}finally{
 if(browser){
  const closed=await Promise.race([browser.close().then(()=>true).catch(()=>false),sleep(3000).then(()=>false)])
  if(!closed)try{browser.process()?.kill('SIGTERM')}catch{}
 }
 for(const proc of processes){try{process.kill(-proc.pid,'SIGTERM')}catch{}}
 await sleep(250)
 rmSync(output,{recursive:true,force:true})
}
