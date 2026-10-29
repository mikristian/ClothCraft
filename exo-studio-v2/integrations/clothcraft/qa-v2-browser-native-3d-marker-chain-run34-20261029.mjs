/** Real BoardV2 grade table → isolated Rust project → Undo/Redo/reopen acceptance. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {nestPolygons} from '../../src/core/accumarkPolygonNesting20261024.js'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,createWriteStream,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-connected-3d-marker-r34-'))
mkdirSync(path.join(output,'workspace'))
const native='http://127.0.0.1:5693',ui='http://127.0.0.1:5694',children=[],requests=[],errors=[],network=[]
const serverLog=path.join(output,'services.log'),log=createWriteStream(serverLog,{flags:'a'})
const launch=(file,args,env={})=>{const child=spawn(file,args,{cwd:root,stdio:['ignore','pipe','pipe'],detached:true,env:{...process.env,...env}});for(const stream of ['stdout','stderr'])child[stream].on('data',chunk=>log.write(`[${path.basename(file)} ${stream}] ${chunk}`));child.on('exit',(code,signal)=>log.write(`[${path.basename(file)} exit] ${code} ${signal}\n`));children.push(child)}
async function ready(url){for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(300)}throw Error('Service unavailable '+url)}
async function command(payload){const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();assert(j.ok,`${payload.op}: ${j.error}`);return j.data}
let browser,page,stage='launch'
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5693',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5694','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 const opened=await command({op:'open',preset:'tshirt'})
 // Real industrialization first: a graded sewn project without seam allowances
 // must NOT be handed to the CUT and marker engine. Apply every named edge
 // allowance using native Rust authoring before the BoardV2 grading UI opens.
 let sourceRevision=opened.revision,allowanceEdges=0
 for(const panel of opened.template.panels)for(const edge of panel.polygon.edges){
  const changed=await command({op:'edit',revision:sourceRevision,
   command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  sourceRevision=changed.revision
  allowanceEdges++
 }
 assert(allowanceEdges>=20,'Industrial CUT fixture must initialize every native named edge')
 const industrialized=(await command({op:'save'})).project
 assert(industrialized.template.panels.every(p=>
  p.polygon.edges.every(edge=>p.polygon.seam_allowances?.[edge]!=null||p.polygon.seamAllowances?.[edge]!=null)),
  'Every native named edge must have its own persisted seam allowance')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
 page=await browser.newPage({viewport:{width:1728,height:1040}})
 page.setDefaultTimeout(10000)
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{requests.push(r.postDataJSON())}catch{}}})
 page.on('requestfailed',r=>network.push({type:'requestfailed',url:r.url(),method:r.method(),error:r.failure()?.errorText}))
 page.on('response',async r=>{if(r.url().endsWith('/workspace')){
  const payload=await r.text().catch(()=>'')
  let packet;try{packet=JSON.parse(payload)}catch{}
  let op;try{op=r.request().postDataJSON()?.op}catch{}
  network.push({type:'response',url:r.url(),op,status:r.status(),ok:packet?.ok,
   revision:packet?.data?.revision,gradeRunPersisted:packet?.data?.gradeRunPersisted,body:payload.slice(0,700)})
 }})
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board').first().waitFor({timeout:18000})
 stage='open full workspace grading table'
 const tableTab=page.getByRole('button',{name:'Grading Table',exact:true}).first()
 await tableTab.click()
 const table=page.locator('[data-exo-grade-bottom-widget="values"]')
 await table.waitFor({state:'visible'})
 stage='create live rules through grading table'
 const create=table.getByRole('button',{name:'Create native XS–XXL grade table'})
 if(await create.count())await create.click()
 await table.getByRole('button',{name:'Offsets'}).click()
 const diagnostics=await table.evaluate(e=>({text:e.innerText.slice(0,1500),inputs:[...e.querySelectorAll('input')].slice(0,8).map(i=>({aria:i.getAttribute('aria-label'),type:i.type})),buttons:[...e.querySelectorAll('button')].slice(0,12).map(b=>b.textContent)}))
 console.log('LIVE_GRADE_TABLE',JSON.stringify(diagnostics))
 await table.getByRole('combobox',{name:'Grading table point'}).selectOption('P2')
 const input=table.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true})
 await input.fill('2');await input.blur()
 await page.waitForTimeout(250)
 assert.equal(await input.inputValue(),'2','Live grade cell must preserve authored point offset')
 stage='native save from actual grading table'
 const save=table.getByRole('button',{name:/Save (validated sizes )?to Rust/})
 await save.click()
 await table.getByText(/graded templates saved into the current native Rust project|Native catalog saved, but its current rule comparison needs review/).waitFor({state:'visible',timeout:30000})
 await page.waitForTimeout(200)
 console.log('SAVE_CLICK_NETWORK',JSON.stringify({requests:requests.map(r=>r.op),failed:network.filter(r=>r.type==='requestfailed').length}))
 const commits=requests.filter(r=>r.op==='grade-run-commit')
 assert(commits.length>0,'Clicking BoardV2 grading table Save did not send grade-run-commit')
 const saved=(await command({op:'save'})).project
 assert(saved.grade_run?.gradedTemplates?.length>=4,'Rust project lacks committed graded templates')
 stage='same-project grade nest and measured contour comparison'
 const outlines=await page.locator('.cc-board [data-native-grade-proposal-accuracy]').count()
 assert(outlines>=2,`Expected graded 2D outlines for both native sewn pattern panels; got ${outlines}`)
 // The regular bottom launcher may be visually occluded by the floating
 // grading sheet. Use the same actual workspace action route as its launcher.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
  {detail:{command:'grade-compare'}})))
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await compare.waitFor({state:'visible'})
 assert.equal(await compare.locator('tbody tr').count(),6,'Compare Length must measure all six native grading sizes')
 const measure=compare.getByRole('button',{name:'Select L contour A in grading nest'})
 const physicalLengthMm=Number(await measure.innerText())
 assert(Number.isFinite(physicalLengthMm)&&physicalLengthMm>0,'Physical graded L contour length is unavailable')
 await measure.click()
 assert(await page.locator('.cc-board [data-native-grade-proposal-accuracy]').count()>=2,
  'Selecting the measured contour must preserve the multi-panel native grading nest')
 console.log('CONNECTED_NEST_COMPARE',JSON.stringify({nativePanels:outlines,comparedSizes:6,physicalLengthMm}))
 stage='native Undo/Redo roundtrip'
 const historyViaUi=async op=>{
  const before=network.length
  await page.evaluate(command=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:command})),op)
  for(let attempt=0;attempt<160;attempt++){
   const receipt=network.slice(before).find(x=>x.type==='response'&&x.op===op)
   if(receipt){
    assert.equal(receipt.status,200,`Actual ${op} HTTP request rejected`)
    assert.equal(receipt.ok,true,`Actual ${op} response rejected`)
    assert(Number.isInteger(receipt.revision),`Actual ${op} must advance native revision`)
    return receipt
   }
   await sleep(100)
  }
  throw Error(`UI ${op} never completed an actual native /workspace response`)
 }
 const undoReceipt=await historyViaUi('undo')
 assert.equal(undoReceipt.gradeRunPersisted,false,'UI Undo receipt retained native grade catalog')
 const undoSnapshot=await command({op:'snapshot'})
 const undoStatus=await command({op:'grade-run-status',revision:undoSnapshot.revision})
 const undone=(await command({op:'save'})).project
 console.log('UNDO_STATE',JSON.stringify({snapshot:{persisted:undoSnapshot.gradeRunPersisted,revision:undoSnapshot.revision},status:{persisted:undoStatus.persistedInProject,catalog:!!undoStatus.catalog},project:{gradeRun:!!undone.grade_run},requests:requests.map(r=>r.op)}))
 assert.equal(undoSnapshot.gradeRunPersisted,false,'Native snapshot should reflect undone grading')
 assert.equal(undoStatus.persistedInProject,false,'Native grade-run-status still reports catalog after Undo')
 assert.equal(undone.grade_run??null,null,'Native save after Undo retained a stale serialized grade catalog')
 const redoReceipt=await historyViaUi('redo')
 assert.equal(redoReceipt.gradeRunPersisted,true,'UI Redo receipt did not restore native grade catalog')
 const redoSnapshot=await command({op:'snapshot'})
 console.log('REDO_STATE',JSON.stringify({revision:redoSnapshot.revision,gradeRunPersisted:redoSnapshot.gradeRunPersisted,undoRevision:undoSnapshot.revision}))
 assert.equal(redoSnapshot.revision,undoSnapshot.revision+1,'Native Redo must finish a distinct history revision')
 assert.equal(redoSnapshot.gradeRunPersisted,true,'Native Redo must restore grade before saving')
 const redone=(await command({op:'save'})).project
 assert.equal(Boolean(redone.grade_run),true,'Native Redo saved project dropped grade-run')
 assert.deepEqual(redone.grade_run,saved.grade_run,'Native Redo saved an altered grade-run')
 stage='durable save/reopen'
 await command({op:'open',project:redone})
 const reopened=(await command({op:'save'})).project
 assert.deepEqual(reopened.grade_run,saved.grade_run,'Native reopen dropped graded templates')
 stage='native sewn seams across six graded sizes'
 const seamAudit=await command({op:'grade-run-sewing-balance-audit',revision:(await command({op:'snapshot'})).revision})
 assert.equal(seamAudit.sizes.length,6,'Sewn length audit must cover every saved size')
 assert.equal(seamAudit.easeReviewRequired,false,'Native sewn design requires manual ease review')
 assert.equal(seamAudit.factoryApproved,false,'Internal sewn length audit cannot approve a factory')
 const sewnPairs=seamAudit.sizes.reduce((n,size)=>n+size.seams.length,0)
 assert(sewnPairs>=30,'Expected the real T-shirt paired sewn edges in all six sizes')
 assert(seamAudit.sizes.every(size=>size.seams.every(seam=>
  Number.isFinite(seam.mismatchM)&&Math.abs(seam.mismatchM)<1e-7&&!seam.requiresEaseReview)),
  'Actual paired sewn edges must retain matching physical length after UI grade edit')
 stage='physical graded cutline to marker with source identity'
 const grades=['XS','S','M','L','XL','XXL']
 const signature=p=>createHash('sha256').update(JSON.stringify({sourceTemplate:p.template,gradeRun:p.grade_run})).digest('hex')
 const fingerprint=signature(reopened)
 const panelIds=reopened.template.panels.map(p=>p.id).sort()
 assert(panelIds.length>=2,'Expected multi-piece native sewn project')
 const nativeCuts=await command({op:'grade-run-cutlines',revision:(await command({op:'snapshot'})).revision})
 const handoff=(project,cutlines,expected)=>{
  assert.equal(signature(project),expected,'STALE_NATIVE_MARKER_SOURCE')
  assert.equal(cutlines.format,'exo-native-graded-cutlines.v1')
  assert.equal(cutlines.cuttingAuthorized,false,'Native factory release must remain unapproved')
  assert.deepEqual(cutlines.sizes.map(x=>x.size),grades,'Native graded cutline sizes drifted')
  return cutlines.sizes.map(size=>{
   assert.deepEqual(size.panels.map(p=>p.panel_id).sort(),panelIds,'NATIVE_MARKER_PIECE_IDENTITY_DRIFT')
   const pieces=size.panels.map(panel=>{
    assert(panel.cut.points.length>=3&&panel.cut.points.every(p=>p.length===2&&p.every(Number.isFinite)),
     'Nonfinite native cutline cannot enter production marker study')
    return {id:panel.panel_id,name:panel.panel_id,fabricId:'fixture-main',cutQuantity:1,
      seamAllowance:0,grainAngleDeg:0,marker:{nap:'one-way'},
      points:panel.cut.points.map(([x,y])=>({x:x*100,y:y*100}))}
   })
   // Quantity=1 is explicitly only a fixture instruction, not a native factory order.
   const marker=nestPolygons({pieces},{fabricWidth:150,gap:1,maxLength:400,maxCandidates:12000})
   assert.equal(marker.ok,true,'Native physical source polygon failed to nest')
   assert.equal(marker.placements.length,panelIds.length,'Marker failed to account for every source panel')
   assert.deepEqual(marker.placements.map(p=>p.pieceId).sort(),panelIds)
   assert(marker.placements.every(p=>p.rotationDeg===0),'Fixture grain-angle constraint was lost')
   return {size:size.size,sourceFingerprint:expected,marker}
  })
 }
 const markers=handoff(reopened,nativeCuts,fingerprint)
 assert.equal(markers.length,grades.length)
 const ordered={sourceFingerprint:nativeSourceFingerprint(reopened),nativeCutlineFingerprint:nativeCutlineFingerprint(nativeCuts),
  sizes:[...grades],panelIds:[...reopened.template.panels.map(p=>p.id)],
  quantitiesBySize:Object.fromEntries(grades.map((size,i)=>[size,Object.fromEntries(reopened.template.panels.map((p,j)=>[p.id,2+(i+j)%3]))])),
  materialsByPanel:Object.fromEntries(reopened.template.panels.map((p,j)=>[p.id,
    {fabricId:'fixture-main',groupId:j%2?'back-shell':'front-shell',grainAngleDeg:0,nap:'one-way'}])),
  cuttingAuthorized:false}
 const productionOrder=generateNativeOrderMarkers(reopened,nativeCuts,ordered)
 const orderedPieces=productionOrder.results.reduce((n,row)=>n+row.markers.reduce((m,x)=>m+x.marker.placements.length,0),0)
 assert(orderedPieces>markers.length*panelIds.length,'Distinct per-size order quantities must reach physical marker placements')
 assert.equal(productionOrder.cuttingAuthorized,false)
 const missingOrder=structuredClone(ordered);delete missingOrder.quantitiesBySize.XS[panelIds[0]]
 assert.throws(()=>generateNativeOrderMarkers(reopened,nativeCuts,missingOrder),/ORDER_QUANTITY_PANEL_MISMATCH/)
 const changedPhysicalCut=structuredClone(nativeCuts)
 changedPhysicalCut.sizes[0].panels[0].cut.points[0][0]+=.00001
 assert.throws(()=>generateNativeOrderMarkers(reopened,changedPhysicalCut,ordered),/STALE_OR_FORGED_CUTLINE_PAYLOAD/,
  'An altered native physical CUT point must invalidate the bound production order')
 assert.throws(()=>handoff({...reopened,template:{...reopened.template,name:'stale'}},nativeCuts,fingerprint),/STALE_NATIVE_MARKER_SOURCE/)
 const forged=structuredClone(nativeCuts);forged.sizes[0].panels[0].panel_id='forged'
 assert.throws(()=>handoff(reopened,forged,fingerprint),/NATIVE_MARKER_PIECE_IDENTITY_DRIFT/)
 stage='native all-size 3D compiled garment after same saved UI grading'
 const fit=[]
 const projectBeforeSizes=(await command({op:'save'})).project
 for(const size of grades){
   const activeBefore=await command({op:'snapshot'})
   const activation=await command({op:'grade-run-activate',revision:activeBefore.revision,size})
   assert.equal(activation.activeGradedSize,size,'Native 3D sized scene was not activated')
   assert.equal(activation.gradedFitEvidence?.nativeMeshCompiled,true,
     'Compiled 3D native grade proof missing for '+size)
   assert.equal(activation.template.panels.length,panelIds.length,'3D size changed sewn panel identity')
   assert(activation.positions?.length>100&&activation.triangles?.length>100,
    'Compiled 3D garment must contain a nontrivial physical cloth mesh')
   assert.equal(activation.gradedFitEvidence?.measurementsFinite,true,
    'Compiled graded 3D mesh or current sewing measurements are nonfinite')
   assert(activation.gradedFitEvidence.seamCount>=6,
    'Compiled graded mesh lost multiple actual sewn seam relationships')
   assert.equal(activation.gradedFitEvidence.fitCertified,false,
    'Unmeasured 3D compiled garment must not claim physical fit certification')
   const restored=await command({op:'grade-run-restore',revision:activation.revision})
   assert.equal(restored.activeGradedSize,null,'Native 3D base restoration failed')
   assert.deepEqual((await command({op:'save'})).project,projectBeforeSizes,
     '3D fit of '+size+' contaminated saved source grading or garment metadata')
   fit.push({size,meshCompiled:true,panels:activation.template.panels.length})
 }
 const after3dCuts=await command({op:'grade-run-cutlines',revision:(await command({op:'snapshot'})).revision})
 assert.deepEqual(handoff((await command({op:'save'})).project,after3dCuts,fingerprint),markers,
  'Graded 3D viewport changes drifted the exact source-bound marker output')
 assert.deepEqual(generateNativeOrderMarkers((await command({op:'save'})).project,after3dCuts,ordered),productionOrder,
  '3D preview silently changed physical marker quantities or cut geometry')
 assert.deepEqual(errors,[])
 console.log('CONNECTED_BROWSER_NATIVE_RELEASE_CHAIN',JSON.stringify({passed:true,source:'real-BoardV2-and-authoritative-Rust',
  uiGrading:true,nativeSewnPanels:panelIds.length,compareLengthSizes:6,graded3d:fit,
  markers:markers.length,physicalPieces:markers.reduce((n,row)=>n+row.marker.placements.length,0),orderedPieces,allowanceEdges,sewnPairs,
  nativeHistory:true,persistedAndReopened:true,sourceFingerprint:fingerprint,negativeCases:4,
  quantityAuthority:'explicit-unsigned-test-order',cuttingAuthorized:false,independentFitCertified:false}))
 console.log(JSON.stringify({passed:true,boardClick:true,nativeGradeCommit:true,nestPanels:outlines,compareLengthSizes:6,physicalLengthMm,undoRedo:true,saveReopen:true,commits:commits.length,output,errors},null,2))
}catch(error){const screenshot=path.join(output,'native-grade-ui-failure.png');await page?.screenshot({path:screenshot}).catch(()=>{});const diagnostic=await page?.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,1300),board:document.querySelectorAll('.cc-board').length})).catch(()=>null);let directSave;try{const r=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'save'}),signal:AbortSignal.timeout(5000)});directSave={status:r.status,body:(await r.text()).slice(0,500)}}catch(e){directSave={error:String(e),cause:String(e.cause)}}await sleep(150);const logs=readFileSync(serverLog,'utf8');console.error(JSON.stringify({passed:false,stage,error:String(error.stack||error),requests:requests.map(r=>r.op),failedRequests:network.filter(r=>r.type==='requestfailed'),directSave,serviceLogTail:logs.slice(-6000),diagnostic,output,screenshot,errors},null,2));process.exitCode=1}finally{
 // Stop only this fixture's detached native/preview services before closing
 // Chromium: an in-flight workspace route can otherwise block browser.close().
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
 const closed=await Promise.race([
  (browser?.close()??Promise.resolve()).then(()=>true).catch(()=>false),
  sleep(8000).then(()=>false),
 ])
 if(!closed){console.error('Isolated browser teardown exceeded eight seconds');process.exitCode=1}
 await new Promise(resolve=>log.end(resolve))
 // The isolated browser/bridge may leave internal client handles on macOS.
 // Explicit completion prevents an otherwise passed integration from hanging.
 process.exit(process.exitCode||0)
}
