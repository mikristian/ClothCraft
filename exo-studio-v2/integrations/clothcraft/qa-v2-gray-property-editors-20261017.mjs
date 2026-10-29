/** Screenshot-based CLO neutral-gray property design plus actual saved controls.
 * Runs a disposable Rust-backed project and independent Vite instance; never
 * touches the installed app or any user garment.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-gray-property-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const native='http://127.0.0.1:5821',ui='http://127.0.0.1:5822',children=[]
const launch=(binary,args,env={})=>{
  const p=spawn(binary,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(p)
}
async function ready(url){for(let i=0;i<135;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(800)})).ok)return}catch{}await sleep(210)}throw Error('Isolated QA service failed: '+url)}
let browser
const tests=[]
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5821',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5822','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1130}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
   const headers={...route.request().headers()};delete headers.origin
   const response=await route.fetch({url:native+'/workspace',headers})
   await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&grayPropertyQA=20261017',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
 const inspector=page.locator('.clo-inspector'),editor=page.locator('.clo-property-panel')
 const tabs=page.getByRole('tablist',{name:'Object Browser types'})
 const browserRegion=page.getByRole('region',{name:'Object Browser'})
 assert.equal(await editor.locator('[data-property-editor-design="neutral-gray"]').count(),1)
 const openGroup=async name=>{const b=editor.getByRole('button',{name,exact:true}).first();await b.waitFor({timeout:8000});if(await b.getAttribute('aria-expanded')==='false')await b.click();return editor.getByRole('region',{name:`${name} properties`})}
 // 1: Real draft button, actual dimension -> saved data path; mirror CLO ref.
 await tabs.getByRole('tab',{name:'Button',exact:true}).click()
 await browserRegion.getByRole('button',{name:'Add button',exact:true}).click()
 const row=browserRegion.locator('.clo-object-select[aria-current=true]');await row.waitFor({timeout:10000})
 const shape=await openGroup('Shape')
 assert.equal(await shape.locator('.clo-button-shape-svg').count(),1,'Button Shape must show real preset preview')
 const specification=shape.getByRole('button',{name:'Specification',exact:true})
 assert.equal(await specification.getAttribute('aria-expanded'),'true','Button specifications open by default')
 const thread=shape.getByRole('combobox',{name:'Thread Type'})
 await thread.selectOption('Parallel')
 assert.equal(await thread.inputValue(),'Parallel','Thread Type must update selected draft button')
 await shape.getByRole('button',{name:'Choose style'}).click()
 assert((await shape.locator('.clo-button-style-option').count())>1,'Shape must offer actual button styles')
 await shape.getByRole('button',{name:'Hide styles'}).click()
 const width=editor.locator('[data-property-field="widthMm"] input[type="number"]')
 const slider=editor.locator('[data-property-field="widthMm"] input[type="range"]')
 assert(await width.isVisible()&&await slider.isVisible(),'Dimension needs number + slider')
 const before=await width.inputValue();await width.fill('2.7');await width.press('Enter')
 await row.click();assert.equal(Number(await width.inputValue()),2.7,'Width did not persist after selecting same button')
 tests.push({buttonWidthPrevious:before,buttonWidthSaved:2.7,pairedNumberSlider:true})
 await specification.click();assert.equal(await specification.getAttribute('aria-expanded'),'false')
 await specification.click();assert.equal(await specification.getAttribute('aria-expanded'),'true')
 const material=await openGroup('Material')
 const faceTabs=material.getByRole('tablist',{name:'Button and thread material'})
 assert.equal(await faceTabs.getByRole('tab',{name:'Button'}).getAttribute('aria-selected'),'true')
 const base=material.getByRole('region',{name:'Button material basic parameters'})
 const reflection=material.getByRole('region',{name:'Button material reflection'})
 assert(await base.isVisible()&&await reflection.isVisible(),'Material disclosure open by default')
 for(const key of ['materialType','color'])assert.equal(await base.locator(`[data-property-field="${key}"]`).count(),1)
 for(const key of ['roughness','metalness','reflectionIntensity','clearcoat']){
  assert.equal(await reflection.locator(`[data-property-field="${key}"] input[type="range"]`).count(),1)
  assert.equal(await reflection.locator(`[data-property-field="${key}"] input[type="number"]`).count(),1)
 }
 await faceTabs.getByRole('tab',{name:'Thread'}).click()
 assert.equal(await material.locator('[data-property-field="threadType"] select').count(),1)
 assert.equal(await material.locator('[data-property-field="threadColor"] input[type="color"]').count(),1)
 await faceTabs.getByRole('tab',{name:'Button'}).click()
 const basicToggle=material.getByRole('button',{name:'Basic Parameters',exact:true})
 await basicToggle.click();assert.equal(await base.isVisible(),false)
 await basicToggle.click();assert.equal(await base.isVisible(),true)
 const theme=await page.evaluate(()=>{
  const selectors=['.clo-pe-content','.clo-pe-trigger','.clo-pe-edit-field.clo-pe-gray-row','.clo-pe-edit-input input','.clo-pe-material-mode']
  return Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector);return [selector,e?{background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}:null]}))
 })
 for(const [key,style] of Object.entries(theme)){
  assert(style,`Missing ${key}`)
  const m=style.background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if(m)assert(Math.max(...m.slice(1).map(Number))-Math.min(...m.slice(1).map(Number))<=5,`Not neutral gray ${key}: ${style.background}`)
 }
 tests.push({shapePreview:true,nestedSpecification:true,buttonThreadEditable:true,materialSubgroups:true,materialButtonThreadSwitch:true,editablePbrControls:4,neutralBackground:theme})
 await inspector.screenshot({path:path.join(output,'clo-button-gray-property-editor.png'),animations:'disabled'})
 // 2: Native Rust fabric real physics editor, not draft-only approximation.
 await tabs.getByRole('tab',{name:'Fabric',exact:true}).click()
 const fabricRow=browserRegion.locator('.clo-object-list .clo-object-select').first()
 await fabricRow.waitFor();await fabricRow.click()
 const phys=await openGroup('Physical Property')
 // The native Fabric workspace mounts the Rust controls through the portal
 // host in the same lower Property Editor, not inside accordion content.
 const lib=editor.locator('.cc-fabric-library')
 await lib.waitFor({state:'visible',timeout:12000})
 const physics=lib.getByRole('group',{name:'Editable native cloth physics'}).or(lib.locator('.cc-fabric-physics')).first()
 assert(await physics.count(), 'Missing Rust native physics editors')
 const nativeFields=physics.locator('.cc-fabric-adjust')
 assert.equal(await nativeFields.count(),7)
 assert.equal(await physics.locator('input[type=range]').count(),7)
 assert.equal(await physics.locator('input[type=number]').count(),7)
 tests.push({fabricLivePhysicalProperties:7,pairedNativeSliders:true})
 await inspector.screenshot({path:path.join(output,'clo-fabric-gray-property-editor.png'),animations:'disabled'})
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,isolatedRust:true,tests,pageErrors:errors,output},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
