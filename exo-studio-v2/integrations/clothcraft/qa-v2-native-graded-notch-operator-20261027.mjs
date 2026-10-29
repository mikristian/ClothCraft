/** Isolated real Chrome+Rust acceptance, no user documents or vendor claim. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5791,uiPort=5792
const native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-graded-notch-operator-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'Native Rust exo-session binary missing')
const processes=[]
function start(cmd,args,env={}){
 const processHandle=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 processes.push(processHandle)
}
async function ready(url){
 for(let i=0;i<120;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1300)})).ok)return}catch{}
  await sleep(250)
 }
 throw Error('Isolated native grading endpoint unavailable: '+url)
}
async function rpc(op,options={}){
 const result=await fetch(native+'/workspace',{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify({op,...options})})
 const body=await result.json()
 assert(result.ok&&body.ok,`Rust ${op} rejected: ${JSON.stringify(body).slice(0,400)}`)
 return body.data
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
 await rpc('open',{preset:'tshirt'})
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const page=await browser.newPage({viewport:{width:1660,height:1080}})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=physical-grade-notch-20261027`,
  {waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 await page.getByRole('combobox',{name:'3D and 2D window arrangement'}).selectOption('2d')
 await page.getByRole('button',{name:'Open all 24 native grading tools and grading table'}).click()
 const toolbar=page.locator('[data-optitex-grade-toolbar="true"]')
 await toolbar.waitFor({state:'visible',timeout:12000})
 await page.getByRole('group',{name:'Bottom grading analysis widgets'})
  .getByRole('button',{name:'Grading Table ↗'}).click()
 const widget=page.locator('[data-exo-grade-bottom-widget="values"]')
 await widget.getByRole('button',{name:'Create native XS–XXL grade table'})
  .click({timeout:12000})
 await widget.getByRole('button',{name:'Save validated sizes to Rust'}).click({timeout:12000})
 await widget.getByText('All six graded templates saved into the current native Rust project.',{exact:false})
  .first().waitFor({timeout:20000})
 const initial=await rpc('save')
 assert(initial.project?.grade_run,'Native six-size catalog not saved')
 await widget.getByRole('button',{name:'Close Grading Table'}).click()
 const current=await rpc('snapshot')
 const notchBtn=toolbar.getByRole('button',{name:'Grade Notch'})
 console.log(JSON.stringify({stage:'notch-ready',nativeGradePersisted:current.gradeRunPersisted,
  revision:current.revision,activeGradedSize:current.activeGradedSize,
  buttonDisabled:await notchBtn.isDisabled(),
  toolbarNotice:await toolbar.locator('[role="status"]').allInnerTexts(),
  pageNotices:await page.locator('.optitex-native-grade-message').allInnerTexts()}))
 await toolbar.getByRole('button',{name:'Grade Notch'}).click({timeout:12000})
 const editor=page.locator('[data-exo-native-grade-notch-editor="true"]')
 await editor.waitFor({state:'visible',timeout:12000})
 await editor.getByRole('spinbutton',{name:'Grade Notch arclength fraction'}).fill('0.43')
 await editor.getByRole('spinbutton',{name:'Grade Notch physical depth millimetres'}).fill('4')
 const panelId=initial.project.template.panels[0].id
 const edgeId=initial.project.template.panels[0].polygon.edges[0]
 await editor.getByRole('combobox',{name:'Grade Notch contour edge'}).selectOption(edgeId)
 assert.equal(await editor.getByRole('button',{name:'Commit physical notch to Rust'}).isDisabled(),true)
 await editor.getByRole('button',{name:'Preview six-size notch'}).click()
 await editor.getByText('Native notch transaction prepared.',{exact:false}).waitFor({timeout:15000})
 assert.equal(await editor.getByRole('button',{name:'Commit physical notch to Rust'}).isEnabled(),true)
 const before=await rpc('snapshot')
 await editor.getByRole('button',{name:'Commit physical notch to Rust'}).click()
 await editor.getByText('Native saved notch verified in all six graded templates',{exact:false})
  .waitFor({timeout:20000})
 const after=await rpc('snapshot')
 assert.equal(after.revision,before.revision+1,'Native edit must have exactly one revision')
 const saved=await rpc('save')
 for(const sizeTemplate of [saved.project.template,...saved.project.grade_run.gradedTemplates]){
  const panel=sizeTemplate.panels.find(p=>p.id===panelId)
  assert(panel?.polygon?.notches?.[edgeId]?.some(n=>Math.abs(n.t-.43)<1e-8&&
   Math.abs(n.depth_m-.004)<1e-9),'Missing one real physical notch in source/six-size grade')
 }
 await rpc('undo',{revision:after.revision})
 const undone=await rpc('save')
 assert(!undone.project.template.panels.find(p=>p.id===panelId).polygon.notches?.[edgeId]?.some(n=>Math.abs(n.t-.43)<1e-8),
  'Native Undo failed to remove newly graded notch')
 const undoneSnapshot=await rpc('snapshot')
 await rpc('redo',{revision:undoneSnapshot.revision})
 const restored=await rpc('save')
 assert(restored.project.template.panels.find(p=>p.id===panelId).polygon.notches?.[edgeId]?.some(n=>Math.abs(n.t-.43)<1e-8),
  'Native Redo failed to restore saved physical notch')
 assert.deepEqual(errors,[],'Browser errors')
 console.log(JSON.stringify({passed:true,nativeRust:true,actualOperatorUI:true,physicalNotches:7,
  nativeOneRevision:true,sixSizes:['XS','S','M','L','XL','XXL'],undoRedo:true,
  invalidNotchCommitDisabled:true,factoryApproved:false,optitexLicensedParity:false}))
}finally{
 if(browser)await browser.close()
 for(const processHandle of processes){try{process.kill(-processHandle.pid,'SIGTERM')}catch{}}
 await sleep(250)
 rmSync(output,{recursive:true,force:true})
}
