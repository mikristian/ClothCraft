// Disposable Rust + Vite + Chrome acceptance for the first 32 right-side 2D tools.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {CLO7_2D_A,CLO7_2D_B} from '../../src/data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../../src/core/clo7NativeToolCapabilities.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-right-32-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(binary),'A built debug exo-session binary is required')
const port=6050+Math.floor(Math.random()*125)
const native='http://127.0.0.1:'+port,ui='http://127.0.0.1:'+(port+200)
const children=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}await sleep(200)}
 throw Error('Fixture unavailable: '+url)
}
const slots=[...CLO7_2D_A,...CLO7_2D_B]
assert.equal(slots.length,32,'Expected 17 column A and 15 column B controls')
function widthMm(snapshot,panelId){
 const points=snapshot?.template?.panels?.find(p=>p.id===panelId)?.polygon?.points
 if(!Array.isArray(points)||points.length<3)return null
 return (Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*1000
}
const rows=[],errors=[],requests=[],nativeResponses=[]
let browser
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'
 })
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+200),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1100}})
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',req=>{if(req.url().endsWith('/workspace')&&req.method()==='POST'){try{requests.push(req.postDataJSON())}catch{}}})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  try{const raw=await response.json();nativeResponses.push({op:route.request().postDataJSON()?.op,body:raw.data||raw,error:raw.error,ok:raw.ok})}catch{}
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 // Add an unsewn straight-edged test piece so grading cannot be rejected by
 // the starter garment's real shoulder seam constraints.
 await page.locator('[data-clo-slot="2d:A06"]').evaluate(el=>el.click())
 await page.locator('[data-clo-detail="2d:A06"]').getByRole('button',{name:'Close tool information'}).click()
 const primitive=page.locator('[data-native-base-polygon="true"]')
 await primitive.waitFor({state:'visible',timeout:4000})
 const priorPanelCount=nativeResponses.filter(r=>r.body?.template?.panels).at(-1)?.body?.template?.panels?.length||0
 await primitive.getByRole('button',{name:'Create native pattern'}).click()
 await primitive.waitFor({state:'hidden',timeout:10000})
 const fresh=nativeResponses.filter(r=>r.body?.template?.panels?.length>priorPanelCount).at(-1)?.body?.template?.panels?.at(-1)
 assert(fresh?.id,'Unsewn test rectangle was not created in Rust: '+JSON.stringify(nativeResponses.slice(-4).map(r=>({op:r.op,keys:Object.keys(r.body||{}),panels:r.body?.template?.panels?.length,error:r.body?.error}))))
 for(const slot of slots){
  const key='2d:'+slot.id,button=page.locator('[data-clo-slot="'+key+'"]')
  const mode=getClo7NativeCapability('2d',slot.id)?.mode||'unavailable'
  const row={slot:key,label:slot.label,declaredMode:mode,clicked:false,infoCard:false,observed:[]}
  rows.push(row)
  try{
   assert.equal(await button.count(),1)
   assert.equal(await button.getAttribute('data-clo-implementation'),mode)
   assert.equal(await button.getAttribute('data-clo-operational'),String(mode==='native'))
   await button.evaluate(el=>el.click())
   row.clicked=true
   const card=page.locator('[data-clo-detail="'+key+'"]')
   await card.waitFor({state:'visible',timeout:5000})
   row.infoCard=true
   if(mode==='native')row.observed.push('Native action offered')
   else row.observed.push(mode==='inspect'?'Related inspector offered':'Unavailable; no native operation')
   await card.getByRole('button',{name:'Close tool information'}).click()
   if(['A01','A02','B01','B02','B03'].includes(slot.id)){
    const pressed=await button.getAttribute('aria-pressed')
    row.pressed=pressed
    if(mode==='native')assert.equal(pressed,'true',key+' should become selected')
    row.observed.push('aria-pressed='+pressed)
   }
   if(['B02','B03'].includes(slot.id)){
    const panel=page.locator('[data-native-sewing-panel="true"]')
    await panel.waitFor({state:'visible',timeout:3000})
    const variant=await panel.getAttribute('data-sewing-variant')
    assert.equal(variant,slot.id==='B02'?'segment':'free')
    row.observed.push('Rust sewing panel '+variant)
   }
   if(slot.id==='B01'){
    row.observed.push('Seam editor selection checked; edits require an existing seam')
   }
   if(['A11','A12'].includes(slot.id)){
    row.observed.push('Measurement tool activated; two point authoring requires canvas interaction')
    row.measureTool=await page.locator('[data-clo-slot="'+key+'"]').getAttribute('aria-pressed')
   }
   if(slot.id==='B04'){
    row.observed.push((await page.locator('body').innerText()).includes('No sewn boundaries yet')?'No native seam available for measured pair':'Seam length inspector requested')
   }
   if(['A16','A17'].includes(slot.id)){
    const modal=page.locator('[data-native-grade-pattern="true"]')
    await modal.waitFor({state:'visible',timeout:4000})
    const variant=await modal.getAttribute('data-grading-variant')
    assert.equal(variant,slot.id==='A16'?'manual':'auto')
   assert((await modal.getByRole('combobox',{name:'Pattern to grade'}).locator('option').count())>0)
    await modal.getByRole('combobox',{name:'Pattern to grade'}).selectOption(fresh.id)
    row.observed.push('Native '+variant+' grading modal and pattern target')
    if(variant==='manual'){
     await modal.getByRole('spinbutton',{name:'Grade width delta millimetres'}).fill('17')
     await modal.getByRole('spinbutton',{name:'Grade height delta millimetres'}).fill('9')
    }else await modal.getByRole('combobox',{name:'Auto grading increment'}).selectOption('1')
    const before=requests.length,previousSnapshot=nativeResponses.filter(r=>r.body?.template?.panels?.length).at(-1)?.body
    await modal.locator('[data-native-grade-apply="true"]').click()
    await page.waitForTimeout(450)
    const applied=requests.slice(before).find(req=>req.op==='grade-pattern')
    assert(applied,'Native grade-pattern backend request missing')
    assert.equal(applied.width_delta_mm,variant==='manual'?17:20)
    const graded=nativeResponses.filter(r=>r.op==='grade-pattern').at(-1)?.body
    assert(graded&&!graded.error,'Rust grade response missing or rejected')
    const beforeWidth=widthMm(previousSnapshot,fresh.id),afterWidth=widthMm(graded,fresh.id)
    assert(Number.isFinite(beforeWidth)&&Number.isFinite(afterWidth),'Rust polygon coordinates must be measurable')
    assert(Math.abs((afterWidth-beforeWidth)-applied.width_delta_mm)<.01,'Rust grade width delta must match millimetres')
    row.observed.push('Rust polygon width changed '+(afterWidth-beforeWidth).toFixed(2)+' mm')
    if(Number.isFinite(previousSnapshot?.revision)&&Number.isFinite(graded?.revision))
     assert(graded.revision>previousSnapshot.revision,'Rust revision must increase')
    row.observed.push('grade-pattern submitted '+applied.width_delta_mm+' mm width')
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
    await page.waitForTimeout(800)
    assert(requests.slice(before).some(req=>req.op==='undo'),'Grade undo request missing')
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'redo'})))
    await page.waitForTimeout(800)
    assert(requests.slice(before).some(req=>req.op==='redo'),'Grade redo request missing')
    row.observed.push('Native Undo/Redo requests confirmed')
   }
   if(slot.id==='A10'){
    const modal=page.locator('[data-native-seam-walk="true"]')
    await modal.waitFor({state:'visible',timeout:3500})
    if(await modal.getByRole('combobox',{name:'Walk sewing pair'}).count()){
     await modal.locator('[data-native-walk-measurements="true"]').waitFor({state:'visible'})
     assert.match(await modal.locator('[data-native-walk-measurements="true"]').innerText(),/Mismatch:/)
     assert.equal(await page.locator('[data-native-walk-overlay] circle').count(),2)
     row.observed.push('Two seam arclength markers and mismatch readout confirmed')
    }else row.observed.push('No native sewn pair; walk markers NOT VERIFIED')
   }
  if(slot.id==='B15'){
    const modal=page.locator('[data-native-fill-panel="true"]')
    await modal.waitFor({state:'visible',timeout:4000})
    const selectPanel=modal.getByRole('combobox',{name:'Pattern to fill'})
    const selectMaterial=modal.getByRole('combobox',{name:'Fill with existing material'})
    assert((await selectPanel.locator('option').count())>0,'Native fill has real pattern targets')
    assert((await selectMaterial.locator('option').count())>0,'Native fill has real material targets')
    row.observed.push('Real pattern/material selectors present')
    const apply=modal.locator('[data-native-fill-apply="true"]')
    if(await apply.isEnabled()){
     const before=requests.length
     await apply.click()
     await page.waitForTimeout(500)
     row.observed.push('Applied native fabric edit; workspace requests '+(requests.length-before))
     assert(requests.slice(before).some(req=>req.op==='edit'),'Fill must submit a Rust edit request')
     await page.keyboard.press('ControlOrMeta+z')
     await page.waitForTimeout(350)
     if(requests.some(req=>req.op==='undo'))row.observed.push('Native undo request confirmed')
     else row.observed.push('Undo not confirmed in native request log')
    }else row.observed.push('Apply disabled; no valid target')
   }
   if(['B07','B08','B09'].includes(slot.id)){
    row.observed.push('Inspector host fabric='+await page.locator('#cc-native-fabric-inspector').count()+' graphic='+await page.locator('#cc-native-graphic-editor').count())
    row.observed.push('Active inspector '+(await page.locator('.clo-pe-header').allInnerTexts()).join(' ').slice(0,120))
   }
  }catch(error){row.failure=String(error.message||error).slice(0,500)}
 }
 // Native tape tool: create two physical-space endpoints, then edit an endpoint.
 const board=page.locator('.cc-board svg[data-native-tool]')
 await page.locator('[data-clo-slot="2d:A12"]').evaluate(el=>el.click())
 await page.locator('[data-clo-detail="2d:A12"]').getByRole('button',{name:'Close tool information'}).click()
 await page.locator('[data-native-measure-mode="create"]').waitFor({state:'visible',timeout:3000})
 assert.equal(await board.getAttribute('data-native-tool'),'measure')
 const rect=await board.boundingBox()
 assert(rect,'Native SVG pattern board visible')
 await page.mouse.click(rect.x+rect.width*.4,rect.y+rect.height*.5)
 await page.mouse.click(rect.x+rect.width*.56,rect.y+rect.height*.52)
 await page.locator('[data-tape-measurement="true"]').waitFor({state:'attached',timeout:3000})
 assert.equal(await page.locator('[data-tape-point]').count(),2)
 rows.find(r=>r.slot==='2d:A12').observed.push('Two native tape endpoints and metric measurement drawn')
 await page.locator('[data-clo-slot="2d:A11"]').evaluate(el=>el.click())
 await page.locator('[data-clo-detail="2d:A11"]').getByRole('button',{name:'Close tool information'}).click()
 await page.locator('[data-native-measure-mode="edit"]').waitFor({state:'visible',timeout:3000})
 assert.equal(await board.getAttribute('data-native-tool'),'measure-edit')
 assert.equal(await page.locator('[data-tape-point]').count(),2,'Switch to editing must retain two measured endpoints')
 rows.find(r=>r.slot==='2d:A11').observed.push('Editable endpoint mode retained two points')
 assert.equal(rows.length,32)
 assert(requests.some(req=>req.op==='snapshot'),'Rust fixture must return real snapshots')
 console.log(JSON.stringify({pass:rows.every(row=>row.clicked&&row.infoCard&&!row.failure),fixture:output,total:rows.length,passed:rows.filter(r=>!r.failure).length,failed:rows.filter(r=>r.failure).length,requests:requests.length,gradeResponses:nativeResponses.filter(r=>r.op==='grade-pattern').map(r=>({revision:r.body?.revision,error:r.body?.error,panels:r.body?.template?.panels?.length})),pageErrors:errors,rows},null,2))
 if(rows.some(row=>row.failure)||errors.length)process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
