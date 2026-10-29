import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
import {preflightNativeCutMark20261025} from '../src/core/nativeCutMarkPreflight20261025.js'
import {preflightNativeSewing20261025} from '../src/core/nativeSewingPreflight20261025.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-construction-loop-'))
const api='http://127.0.0.1:5449',ui='http://127.0.0.1:5286',children=[]
const start=(cmd,args,env={})=>children.push(spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}}))
const wait=async uri=>{
 for(let i=0;i<100;i++){try{if((await fetch(uri,{signal:AbortSignal.timeout(750)})).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,250))}
 throw Error('Service unavailable '+uri)
}
const call=async body=>{
 const json=await(await fetch(api+'/workspace',{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json()
 assert.ok(json.ok,json.error||JSON.stringify(json).slice(0,280))
 return json.data
}
const revised=async old=>{
 let data=await call({op:'snapshot'})
 for(let i=0;i<45&&data.revision<=old;i++){await new Promise(r=>setTimeout(r,120));data=await call({op:'snapshot'})}
 assert.ok(data.revision>old,'Native edit revision did not advance')
 return data
}
let browser
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5449',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([wait(ui),wait(api+'/health')])
 await call({op:'open',preset:'tshirt'})
 const initial=await call({op:'snapshot'}),previous=new Set(initial.template.panels.map(p=>p.id))
 const rect=[[0,0],[.3,0],[.3,.24],[0,.24]],tangents=rect.map(()=>[0,0])
 await call({op:'edit',revision:initial.revision,command:{kind:'Polygon',
  fabric:initial.template.fabrics[0].id,points:rect,tangents}})
 let after=await call({op:'snapshot'})
 const a=after.template.panels.find(p=>!previous.has(p.id))
 assert.ok(a?.polygon)
 const known=new Set(after.template.panels.map(p=>p.id))
 await call({op:'edit',revision:after.revision,command:{kind:'Polygon',
  fabric:after.template.fabrics[0].id,points:rect,tangents}})
 after=await call({op:'snapshot'})
 const b=after.template.panels.find(p=>!known.has(p.id))
 assert.ok(b?.polygon)
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1510,height:970}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=constructionLoop20261025',{waitUntil:'domcontentloaded'})
 const svg=page.locator('.cc-board svg[data-native-tool]').first()
 await svg.waitFor({state:'visible',timeout:35000})
 const guidesButton=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="construction-guides"]')
 if(await page.locator('.workspaces').count()){
  if((await page.locator('.workspaces').getAttribute('data-viewport-layout'))!=='2d')
   await page.locator('[data-tool-family="collapse-3d"] > button').first().click()
 }
 await guidesButton.waitFor({state:'visible',timeout:10000})
 await guidesButton.click()
 const panel=page.locator('[data-native-construction-guide-tool]')
 await panel.waitFor({state:'visible',timeout:10000})
 await panel.getByRole('combobox',{name:'Construction guide panel'}).selectOption(a.id)
 await panel.getByRole('combobox',{name:'Construction guide type'}).selectOption('fold')
 for(const [name,value] of [['Start X mm','40'],['Start Y mm','50'],
  ['End X mm','220'],['End Y mm','50']])
  await panel.getByRole('textbox',{name}).fill(value)
 await page.waitForFunction(()=>document.querySelector('[data-native-guide-preview]')?.dataset.nativeGuidePreview==='ready')
 const beforeGuide=await call({op:'snapshot'})
 await panel.locator('[data-native-guide-apply]').click()
 let afterGuide=await revised(beforeGuide.revision)
 const withGuide=afterGuide.template.panels.find(p=>p.id===a.id)
 assert.ok((withGuide.polygon.lines?.length||0)>(a.polygon.lines?.length||0))
 const nativeLine=withGuide.polygon.lines.at(-1)
 assert.deepEqual(nativeLine.tangents,[[0,0],[0,0]])
 assert.ok(Math.abs(nativeLine.points[1][0]-nativeLine.points[0][0]-.18)<1e-6)
 // Pleat markings save native InternalLine geometry and reuse the existing
 // fold guide rather than duplicating an overlapping centre line.
 for(const [kind,added] of [['pleat',2]]){
  await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
    afterGuide.revision,{timeout:10000})
  await panel.getByRole('combobox',{name:'Construction guide type'}).selectOption(kind)
  await page.waitForFunction(expected=>document.querySelector('[data-native-guide-preview="ready"]')
    ?.textContent?.includes(`${expected} clipped physical guide`),added,{timeout:6000})
  const prior=afterGuide
  await panel.locator('[data-native-guide-apply]').click()
  let updated=await revised(prior.revision)
  for(let retry=0;retry<40&&updated.template.panels.find(p=>p.id===a.id).polygon.lines.length<
      prior.template.panels.find(p=>p.id===a.id).polygon.lines.length+added;retry++){
    await new Promise(resolve=>setTimeout(resolve,150))
    updated=await call({op:'snapshot'})
  }
  assert.equal(updated.template.panels.find(p=>p.id===a.id).polygon.lines.length,
    prior.template.panels.find(p=>p.id===a.id).polygon.lines.length+added,
    `All ${kind} marks must persist as native Rust internal lines`)
  afterGuide=updated
 }
 await panel.getByRole('combobox',{name:'Construction guide type'}).selectOption('dart')
 assert.equal(await panel.locator('[data-native-guide-apply]').isDisabled(),true,
   'Ordinary InternalLine editor must not allow partially authored intersecting dart legs')
 await panel.locator('[data-native-open-physical-dart]').click()
 await page.locator('[data-native-dart-precision]').waitFor({state:'visible',timeout:7000})
 assert.equal(await panel.isVisible(),false,'Guides panel must close when opening physical Dart cutter')

 const edgeA=a.polygon.edges[1],edgeB=b.polygon.edges[1]
 const sewing=preflightNativeSewing20261025(afterGuide,{
  a:{panel:a.id,edge:edgeA,range:[0,1]},b:{panel:b.id,edge:edgeB,range:[0,1]}})
 assert.equal(sewing.ok,true,sewing.reason)
 await call({op:'edit',revision:afterGuide.revision,command:sewing.command})
 const sewn=await call({op:'snapshot'}),seam=sewn.template.seams.find(s=>
  s.a.panel===a.id&&s.b.panel===b.id)
 assert.ok(seam,'Native garment did not persist the sewn relationship')
 // This test inserted the seam directly through the isolated API (not through
 // a mounted React control). Reload so the app reads the new native snapshot.
 await page.reload({waitUntil:'domcontentloaded'})
 await svg.waitFor({state:'visible',timeout:10000})
 // Edit Sewing must expose an actual native seam control without context-menu
 // gymnastics. Toggle direction and verify saved Rust state, not UI alone.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',
  {detail:{nativeAction:'sewing.editExisting'}})))
 const sewingPanel=page.locator('[data-native-edit-sewing]')
 await sewingPanel.waitFor({state:'visible',timeout:7000})
 await sewingPanel.getByRole('combobox',{name:'Select native sewing pair'}).selectOption(seam.id)
 const beforeReverse=await call({op:'snapshot'})
 const reverseBox=sewingPanel.getByRole('checkbox',{name:'Reverse selected sewing direction'})
 const oldReverse=await reverseBox.isChecked()
 // This is a controlled native checkbox; its checked state updates after the
 // Rust API responds, not synchronously in Playwright's setChecked assertion.
 await reverseBox.click()
 const reversed=await revised(beforeReverse.revision)
 assert.equal(reversed.template.seams.find(item=>item.id===seam.id).reverse_b,!oldReverse)

 // Independent native cutmark guards remain available after the sewing edit.
 const allowance=preflightNativeCutMark20261025(reversed,{
  panelId:a.id,edge:a.polygon.edges[0],kind:'allowance',widthMm:12})
 assert.equal(allowance.ok,true,allowance.reason)
 await call({op:'edit',revision:reversed.revision,command:allowance.command})
 const withAllowance=await call({op:'snapshot'})
 assert.ok(Math.abs(withAllowance.template.panels.find(p=>p.id===a.id).polygon
  .seam_allowances[a.polygon.edges[0]]-.012)<1e-12)
 const pair=preflightNativeCutMark20261025(withAllowance,{
  panelId:a.id,edge:a.polygon.edges[0],kind:'pair',t:.5,spacingMm:8,depthMm:4})
 assert.equal(pair.ok,true,pair.reason)
 await call({op:'edit',revision:withAllowance.revision,command:pair.command})
 const notched=await call({op:'snapshot'})
 assert.equal(notched.template.panels.find(p=>p.id===a.id).polygon
  .notches[a.polygon.edges[0]].length,2)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,constructionNativeLines:afterGuide.template.panels.find(p=>p.id===a.id).polygon.lines.length,
  folds:1,pleatMarks:3,physicalDartOpens:true,
  editedSeamId:seam.id,sewingDirectionChanged:true,
  allowanceWidthM:.012,doubleNotches:2,
  nativeRevisions:[afterGuide.revision,sewn.revision,reversed.revision,
    withAllowance.revision,notched.revision],jsErrors:0}))
}finally{
 await browser?.close()
 for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
}
