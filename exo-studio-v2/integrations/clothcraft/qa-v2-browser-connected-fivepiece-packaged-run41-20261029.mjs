// RUN41: PACKAGED full EXO app resources, not repo Vite/Rust, tested on
// isolated localhost ports with disposable garments; live 5385 denied.
// RUN38: actual connected FIVE-piece sewn garment through one interactive
// measurement regeneration, six physical grades, native CUT and UI history.
// Uses a disposable temporary Rust workspace; factory approval stays false.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36} from './native-verified-order-handoff-run36-20261029.mjs'
import {createNativeVerifiedProductionOrderRun37} from './native-verified-production-order-run37.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-connected-fivepiece-run38-'))
const native='http://127.0.0.1:5745',ui='http://127.0.0.1:5746'
const packagedApp=process.env.EXO_RUN41_PACKAGED_APP||path.join(process.cwd(),'integrations/clothcraft/output/qa-packaged-run41-20261029/EXO ClothCraft Studio V2.app')
const packagedResources=path.join(packagedApp,'Contents/Resources')
const packagedBinary=path.join(packagedResources,'research/oss/clothcraft/target/debug/exo-session')
const packagedNode=path.join(packagedResources,'bin/node')
const packagedServer=path.join(packagedResources,'integrations/clothcraft/server.mjs')
const packagedHost=path.join(packagedResources,'integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host')
for(const file of [packagedBinary,packagedNode,packagedServer,packagedHost,path.join(packagedResources,'web/index.html')])
  assert(fs.existsSync(file),'RUN41 missing packaged prerequisite '+file)
const children=[],pageErrors=[],requests=[]
const launch=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:process.cwd(),detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
const ready=async url=>{for(let i=0;i<120;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  await sleep(300)
}throw Error('Service not ready '+url)}
const workspace={request:async packet=>{
  const reply=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(packet),signal:AbortSignal.timeout(60000)})
  return reply.json()
},close:()=>{for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}}
launch(packagedNode,[packagedServer],{
  EXO_CLOTHCRAFT_PORT:'5745',EXO_CLOTHCRAFT_OUTPUT_DIR:root,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(packagedResources,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:packagedBinary})
let browser,page

const clone=structuredClone
const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
let state,stage='open',beforeRevision,originalSeamIds=[],authoredSeamIds=[]
const checks=[]
const send=async req=>{
  let result
  for(let attempt=0;attempt<50;attempt++){
    result=await workspace.request({revision:state?.revision,...req})
    if(result?.ok!==false||!(/Native request already pending/.test(result.error||'')))break
    await sleep(100)
  }
  assert.equal(result.ok,true, `${req.op}: ${result.error??'native Rust refused'}`)
  if(result.data?.template)state=result.data
  return result.data
}
const panel=(template,id)=>{
  const found=template.panels.filter(p=>p.id===id)
  assert.equal(found.length,1,`Expected unique panel ${id}`)
  return found[0]
}
const assertConnectedSewnGraph=template=>{
  const ids=template.panels.map(p=>p.id)
  const linked=new Map(ids.map(id=>[id,new Set()]))
  for(const seam of template.seams){
    assert(linked.has(seam.a.panel)&&linked.has(seam.b.panel),`Seam ${seam.id} has a missing pattern endpoint`)
    linked.get(seam.a.panel).add(seam.b.panel)
    linked.get(seam.b.panel).add(seam.a.panel)
  }
  const visited=new Set([ids[0]]),queue=[ids[0]]
  for(const id of queue)for(const next of linked.get(id))if(!visited.has(next)){visited.add(next);queue.push(next)}
  assert.equal(visited.size,ids.length,`Disconnected sewn garment: ${ids.filter(id=>!visited.has(id)).join(', ')}`)
}
const refuse=async (req,label)=>{
  const saved=(await send({op:'save'})).project
  const revision=state.revision
  const result=await workspace.request({revision,...req})
  assert.equal(result.ok,false,`${label}: native Rust incorrectly accepted invalid mutation`)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,saved)
  return result.error
}
const checkPhysical=async (expectedWidth)=>{
  const saved=(await send({op:'save'})).project
  assert(saved.native_facing_dependency)
  const f=saved.native_facing_dependency
  assert.equal(f.facingId,'facing_persisted_v1')
  assert.deepEqual(saved.grade_run.sizes,sizes)
  const cuts=await send({op:'grade-run-cutlines'})
  const sewing=await send({op:'grade-run-sewing-balance-audit'})
  assert.equal(sewing.sizes.length,6)
  assertConnectedSewnGraph(saved.template)
  for(const sized of sewing.sizes){
    for(const seamId of [...originalSeamIds,...authoredSeamIds])assert(sized.seams.some(seam=>seam.seamId===seamId),`Lost native sewn relation ${seamId} in ${sized.size}`)
    assert.equal(sized.seams.length,originalSeamIds.length+authoredSeamIds.length+1,
      'All authored front/back/additional-piece/facing seams must be audited')
    assert(sized.seams.every(seam=>Math.abs(seam.mismatchM)<1e-7&&!seam.requiresEaseReview),`Sewn-size mismatch in ${sized.size}`)
  }
  assert.equal(cuts.cuttingAuthorized,false)
  assert.equal(sewing.factoryApproved,false)
  let notches=0
  for(let i=0;i<6;i++){
    const t=saved.grade_run.gradedTemplates[i]
    const parent=panel(t,f.parentPanelId).polygon
    const facing=panel(t,f.facingId).polygon
    assert(Math.abs(parent.points[1][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(parent.points[2][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(facing.points[1][0]-(expectedWidth+offsets[i]))<1e-7)
    assert(Math.abs(facing.points[2][0]-(expectedWidth+offsets[i]))<1e-7)
    const sizeCut=cuts.sizes[i]
    const childCut=sizeCut.panels.find(p=>p.panel_id===f.facingId)?.cut
    const parentCut=sizeCut.panels.find(p=>p.panel_id===f.parentPanelId)?.cut
    assert(childCut&&parentCut)
    assert.equal(childCut.notches.length,2)
    assert.equal(parentCut.notches.length,2)
    assert(childCut.edges.every(e=>Math.abs(e.allowance_m-.01)<1e-9))
    const seam=sewing.sizes[i].seams.find(s=>s.seamId===`${f.facingId}_attach`)
    assert(seam)
    assert.equal(seam.allowEase,false)
    assert.equal(seam.requiresEaseReview,false)
    assert(Math.abs(seam.mismatchM)<1e-7)
    assert.equal(seam.notchIntervalLengthsM.length,3)
    notches+=childCut.notches.length
  }
  assert.equal(notches,12)
  return saved
}

try{
  await ready(native+'/health')
  await send({op:'open',preset:'tshirt'})
  originalSeamIds=state.template.seams.map(seam=>seam.id)
  assert(originalSeamIds.length>=8,'Must retain original native sewn T-shirt relationships')
  const originalIds=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++) await send({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  const ref=(panelId,edge,range=[0,1])=>({panel:panelId,side:'top',edge,range})
  // One seam joins the two new pieces, and the next joins those pieces to
  // the original front/back sewn T-shirt assembly. The rectangle's vertical
  // edge is 320mm, matching 320mm of the original 560mm front hem.
  await send({op:'edit',command:{kind:'Sew',a:ref(ids[0],panel(state.template,ids[0]).polygon.edges[2]),
    b:ref(ids[1],panel(state.template,ids[1]).polygon.edges[2]),reverse:true,ease:false}})
  await send({op:'edit',command:{kind:'Sew',a:ref('front','hem',[0,.32/.56]),
    b:ref(ids[0],panel(state.template,ids[0]).polygon.edges[1]),reverse:true,ease:false}})
  authoredSeamIds=state.template.seams.filter(seam=>!originalSeamIds.includes(seam.id)).map(seam=>seam.id)
  assert.equal(authoredSeamIds.length,2,'Both native sewing transactions must be committed')
  assertConnectedSewnGraph(state.template)
  stage='author 10mm allowances, source bindings and 6 physical grades'
  const source=(await send({op:'save'})).project
  for(const p of source.template.panels)
    p.polygon.seam_allowances=Object.fromEntries(p.polygon.edges.map(edge=>[edge,.01]))
  source.state=null;source.mesh_signature=null
  await send({op:'open',project:source})
  const rules=[]
  ids.forEach((panelId,index)=>{
    rules.push({id:`width_upper_${index}`,panelId,pointIndex:1,mode:'polar',
      a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})
    rules.push({id:`width_lower_${index}`,panelId,pointIndex:2,mode:'polar',
      a:3,b:3,angleDeg:0,distanceFormula:'width',dependsOn:[]})
  })
  await send({op:'bindings-store',nativeBindings:{
    measurements:{width:{valueMm:400}},bindings:rules}})
  const base=clone(state.template)
  await send({op:'grade-run-commit',gradeRun:{
    schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),
    gradedTemplates:sizes.map((size,i)=>{
      const t=clone(base)
      for(const id of ids)for(const point of [1,2])
        panel(t,id).polygon.points[point][0]+=offsets[i]
      return t
    }),pomSpecs:[]}})
  checks.push('Two authored 400×320mm rectangles, 10mm edge allowances, four physical bound anchors and XS–XXL grades')

  stage='native install transaction'
  const parentId=ids[0],parentEdgeId=panel(state.template,parentId).polygon.edges[0]
  const invalid=await refuse({op:'facing-dependency-install',parentPanelId:parentId,
    parentEdgeId,facingId:'bad_face',depthMm:1000,allowanceMm:10},'out-of-bounds facing depth')
  const beforeInstall=(await send({op:'save'})).project
  const preRevision=state.revision
  await send({op:'facing-dependency-install',parentPanelId:parentId,parentEdgeId,
    facingId:'facing_persisted_v1',depthMm:40,allowanceMm:10})
  assert.equal(state.revision,preRevision+1)
  assert.equal(state.nativeFacingDependency.facingId,'facing_persisted_v1')
  assert.equal(state.nativePointBindings.active,true)
  const installed=await checkPhysical(.4)
  const inspection=await send({op:'facing-dependency-inspect'})
  assert.equal(inspection.nativeFacingDependency.facingId,'facing_persisted_v1')
  const unqualified=await refuse({op:'edit',command:{kind:'Anchor',panel:parentId,
    anchor:0,position:[.005,0]}},'unqualified source edit')
  assert.match(unqualified,/Native facing dependency requires qualified regeneration/)
  const rejectedGrade=await refuse({op:'grade-run-commit',gradeRun:installed.grade_run},
    'external grade overwrite with active facing dependency')
  assert.match(rejectedGrade,/Native facing dependency requires qualified regeneration/)
  checks.push('One persisted native install adds six sewn facing polygons and 12 actual CUT notches')

  stage='preflight invalid provenance, ease and stale revision'
  const tampered=clone(installed)
  panel(tampered.grade_run.gradedTemplates[5],'facing_persisted_v1').polygon.points[1][0]+=.005
  await refuse({op:'open',project:tampered},'tampered grade project')
  const staleFacing=clone(installed)
  staleFacing.native_facing_dependency.sourceTemplate.panels[0].polygon.points[0][0]+=.001
  const staleFacingError=await refuse({op:'open',project:staleFacing},'stale facing source-template')
  assert.match(staleFacingError,/Stale or invalid facing sourceTemplate/)
  const ease=clone(installed)
  ease.grade_run.gradedTemplates[5].seams.find(s=>s.id==='facing_persisted_v1_attach').allow_ease=true
  await refuse({op:'open',project:ease},'eased facing project')
  const stale=await refuse({op:'bindings-grade-regenerate-preview',revision:preRevision,overrides:{width:380}},
    'stale revision')

  stage='real browser UI staged qualified 400→380mm regeneration'
  beforeRevision=state.revision
  launch(packagedHost,['--web-root',path.join(packagedResources,'web')],{EXO_WEB_PORT:'5746'})
  await ready(ui)
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--disable-gpu','--no-first-run']})
  page=await browser.newPage({viewport:{width:1650,height:1020}})
  page.setDefaultTimeout(14000)
  page.on('pageerror',error=>pageErrors.push(error.message))
  // The production web bundle embeds 5385, while the user's live app owns
  // that port. Redirect EVERY service path (including agent/v1/keys) to
  // packaged 5745. Nothing may reach the personal live service.
  await page.route('http://127.0.0.1:5385/**',async route=>{
    const request=route.request(),target=new URL(request.url())
    const headers={...request.headers()};delete headers.origin
    const response=await route.fetch({url:native+target.pathname+target.search,headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  page.on('request',request=>{if(request.url().endsWith('/workspace')){
    try{requests.push(request.postDataJSON())}catch{}
  }})
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board').first().waitFor({timeout:18000})
  await page.getByRole('combobox',{name:'CLO-style workspace layout presets'}).selectOption('gradingStudio')
  await page.locator('.cc-embedded-2d').waitFor({state:'attached',timeout:14000})
  const studio=page.getByRole('button',{name:'Open full-screen 2D pattern studio'})
  if(await studio.count())await studio.click()
  else{
    const layout=page.getByRole('combobox',{name:'Viewport layout'})
    if(await layout.count())await layout.selectOption('2d')
  }
  await page.waitForTimeout(650)
  const nativeButton=page.getByRole('button',{name:'Grading Rules',exact:true}).first()
  if(await nativeButton.count())await nativeButton.click()
  else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
    {detail:{command:'grade-manual'}})))
  const modal=page.locator('[data-native-grade-pattern="true"]')
  try{await modal.waitFor({state:'visible'})}catch(error){
    const diagnostics=await page.evaluate(()=>({
      url:location.href,gradeRules:[...document.querySelectorAll('button')].filter(b=>/Grading Rules|grading/i.test(b.innerText)).slice(0,8).map(b=>b.innerText),
      embedded:document.querySelectorAll('[data-native-clothcraft]').length,
      root:document.querySelector('.cc-embedded-root')?.className,
      excerpt:document.body.innerText.slice(0,1100)
    }))
    throw Error(error.message+'; UI_DIAGNOSTIC='+JSON.stringify(diagnostics))
  }
  // The independently floating quick toolbar can physically cover the
  // measurement worksheet in a compact screen. Close it through its real
  // user-facing control before interacting with the deeper worksheet.
  const quickToolbar=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
  if(await quickToolbar.count())await quickToolbar.getByRole('button',{name:'Close Grading Toolbar'}).click()
  assert.match(await modal.innerText(),/5 pieces/,'The live browser must see five real sewn panels')
  await modal.getByRole('tab',{name:'Measurements'}).click()
  const regen=modal.locator('[data-native-six-size-regeneration="true"]')
  await regen.waitFor({state:'visible'})
  assert.match(await regen.innerText(),/4 rule/, 'Native persisted 4-point binding graph not shown in editor')
  await regen.getByRole('combobox',{name:'Six-size direct measurement'}).selectOption('width')
  await regen.getByRole('textbox',{name:'Six-size new measurement mm'}).fill('380')
  await regen.getByRole('button',{name:'Stage measurement change'}).click()
  assert.match(await regen.innerText(),/width: 400.*380/s)
  assert.deepEqual((await send({op:'save'})).project,installed,
    'Staging browser measurement changed Rust before confirmed commit')
  await regen.getByRole('button',{name:'Preview XS–XXL regeneration'}).click()
  await regen.getByRole('table',{name:'Per-size native geometry changes'}).waitFor({state:'visible',timeout:30000})
  assert.equal(await regen.getByRole('table',{name:'Per-size native geometry changes'}).locator('tbody tr').count(),6)
  assert.deepEqual((await send({op:'save'})).project,installed,
    'Preview browser measurement changed Rust before confirmed commit')
  await regen.getByRole('checkbox',{name:/I reviewed all six size changes/}).check()
  await regen.getByRole('button',{name:'Commit confirmed six-size regeneration'}).click()
  await regen.getByText(/Native regeneration committed at revision/).waitFor({state:'visible',timeout:30000})
  await send({op:'snapshot'})
  assert.equal(state.revision,beforeRevision+1)
  assert(requests.some(req=>req.op==='bindings-grade-regenerate-preview'))
  assert(requests.some(req=>req.op==='bindings-grade-regenerate'))
  assert.deepEqual(pageErrors,[])
  const committedBrowserProject=(await send({op:'save'})).project

  // Keep the browser's own revision current: the interface performs Undo/Redo
  // immediately following its own commit. Separate native 3D activations below
  // deliberately advance the Rust revision outside the React UI session.
  stage='embedded browser menu Undo/Redo of qualified six-size regeneration'
  const uiHistory=async (op,trigger=null)=>{
    const reply=page.waitForResponse(response=>response.url().endsWith('/workspace')&&
      response.request().method()==='POST'&&
      (()=>{try{return response.request().postDataJSON()?.op===op}catch{return false}})(),
      {timeout:20000})
    if(trigger)await trigger()
    else await page.evaluate(command=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',
      {detail:command})),op)
    const response=await reply.catch(async error=>{
      const nativeStatus=await workspace.request({op:'snapshot'})
      const dom=await page.evaluate(()=>({
        embedded:document.querySelectorAll('.cc-embedded-2d').length,
        native:document.querySelectorAll('[data-native-clothcraft]').length,
        grading:document.querySelectorAll('[data-native-grade-pattern="true"]').length,
      })).catch(()=>({}))
      throw Error(`Browser ${op} not sent; ${error.message}; nativeCanUndo=${nativeStatus?.data?.canUndo}; nativeCanRedo=${nativeStatus?.data?.canRedo}; UI=${JSON.stringify(dom)}; recentOps=${JSON.stringify(requests.slice(-8).map(r=>r.op))}`)
    })
    const result=await response.json()
    assert.equal(response.status(),200,`Browser ${op} rejected: ${JSON.stringify(result).slice(0,300)}`)
    assert.equal(result.ok,true,`Browser ${op} did not commit`)
    assert(result.data?.template&&Number.isInteger(result.data.revision),`Browser ${op} lacks native revision receipt`)
    state=result.data
  }
  await uiHistory('undo')
  assert.deepEqual((await send({op:'save'})).project,installed,
    'Actual embedded browser Undo failed to restore the sewn source and six grades')
  await uiHistory('redo')
  const afterBrowserRedo=(await send({op:'save'})).project
  assert.deepEqual(afterBrowserRedo,committedBrowserProject,
    'Browser Redo must restore the EXACT native source, facing, six-size catalog and all sewing relationships')
  checks.push('Embedded browser command Undo/Redo HTTP receipts preserve exact qualified source, six grades and complete five-piece sewn graph')

  // Unlike the embedded command dispatch above, these activate REAL buttons
  // and real keyboard events through App's visible chrome. The browser must
  // send an authoritative Rust request and restore exact saved source data.
  stage='real toolbar and keyboard Undo/Redo'
  // A successful regeneration may already close/replace the Pattern Grading
  // popup. Do not demand a stale button; when a floating grading widget is
  // still visible, close it with its own current live close control.
  const gradingWidget=page.locator('[data-clo-floating-widget="grading"]')
  if(await gradingWidget.isVisible().catch(()=>false)){
    const closeGrading=gradingWidget.locator('button[aria-label^="Close "]')
    assert.equal(await closeGrading.count(),1,'Visible grading dialog lacks actual close control')
    await closeGrading.click()
  }
  assert.equal(await gradingWidget.isVisible().catch(()=>false),false,'Grading dialog still obscures toolbar')
  const toolbarUndo=page.locator('button.icon-button[title="Undo"]')
  const toolbarRedo=page.locator('button.icon-button[title="Redo"]')
  assert.equal(await toolbarUndo.count(),1,'Missing real EXO header Undo button')
  assert.equal(await toolbarRedo.count(),1,'Missing real EXO header Redo button')
  await toolbarUndo.waitFor({state:'visible'})
  await uiHistory('undo',()=>toolbarUndo.click())
  assert.deepEqual((await send({op:'save'})).project,installed,'Actual Undo toolbar failed linked six-size rollback')
  await uiHistory('redo',()=>toolbarRedo.click())
  assert.deepEqual((await send({op:'save'})).project,committedBrowserProject,'Actual Redo toolbar failed exact project restore')
  // Focus EXO chrome, outside native grading inputs, so App's standard
  // Cmd+Z/Cmd+Shift+Z shortcut route (not a synthetic CustomEvent) is tested.
  await toolbarUndo.focus()
  await uiHistory('undo',()=>page.keyboard.press('Meta+z'))
  assert.deepEqual((await send({op:'save'})).project,installed,'Real Cmd+Z failed native document rollback')
  await uiHistory('redo',()=>page.keyboard.press('Meta+Shift+z'))
  assert.deepEqual((await send({op:'save'})).project,committedBrowserProject,'Real Cmd+Shift+Z failed native document redo')
  checks.push('Actual EXO toolbar Undo/Redo buttons and focused macOS keyboard shortcuts restore exact qualified six-size project')

  assert.equal(state.nativePointBindings.active,true)
  const after=await checkPhysical(.38)
  stage='saved five-piece multi-size CUT to quantity-bound marker'
  const cuts=await send({op:'grade-run-cutlines'})
  const panelIds=after.template.panels.map(p=>p.id)
  assert.equal(panelIds.length,5,'Expected four source patterns + one derived facing')
  const order={sourceFingerprint:nativeSourceFingerprint(after),
    nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),sizes:[...sizes],panelIds:[...panelIds],
    quantitiesBySize:Object.fromEntries(sizes.map((size,i)=>
      [size,Object.fromEntries(panelIds.map((id,j)=>[id,1+(i+j)%2]))])),
    materialsByPanel:Object.fromEntries(after.template.panels.map((p,j)=>
      [p.id,{fabricId:p.fabric,groupId:j===4?'facing':'shell',grainAngleDeg:p.grain_degrees,nap:'one-way'}])),
    cuttingAuthorized:false}
  // The direct CUT-payload marker path is intentionally disabled. A copied or
  // rehashed browser CUT cannot bypass the strict same-Rust-workspace handoff.
  assert.throws(()=>generateNativeOrderMarkers(after,cuts,order),/VERIFIED_NATIVE_WORKSPACE_HANDOFF_REQUIRED/)
  const observedMaterials=Object.fromEntries(after.template.panels.map(p=>
    [p.id,{sourceFabricId:p.fabric,sourceGrainDegrees:p.grain_degrees}]))
  const sourceVerifiedOrder={...order,nativeSourceMaterialByPanel:observedMaterials}
  const trusted=await generateNativeVerifiedOrderMarkersRun36(workspace,sourceVerifiedOrder)
  const markers=trusted
  const placed=markers.results.reduce((count,row)=>count+row.markers.reduce((sum,group)=>sum+group.marker.placements.length,0),0)
  assert.equal(placed,45,`Every explicit native cut quantity must be placed exactly; got ${placed}`)
  assert.equal(markers.cuttingAuthorized,false)
  assert.equal(trusted.readFromNativeWorkspace,true)
  assert.equal(trusted.sourceMaterialsChecked,true)
  const missingQty=clone(sourceVerifiedOrder);delete missingQty.quantitiesBySize.XS[panelIds[0]]
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,missingQty),/ORDER_QUANTITY_PANEL_MISMATCH/)
  const operatorOrder=await createNativeVerifiedProductionOrderRun37(workspace,{
    expectedRevision:state.revision,
    quantitiesBySize:order.quantitiesBySize,
    materialsByPanel:Object.fromEntries(after.template.panels.map(p=>
      [p.id,{fabricId:p.fabric,groupId:'all-panels'}])),
  })
  assert.equal(operatorOrder.sourceRevision,state.revision)
  assert.equal(operatorOrder.cuttingAuthorized,false)
  assert.equal(operatorOrder.factoryApproved,false)
  assert.equal(operatorOrder.results.reduce((n,row)=>n+row.markers.reduce((m,g)=>m+g.marker.placements.length,0),0),placed)
  const forgedMaterial=clone(sourceVerifiedOrder)
  forgedMaterial.nativeSourceMaterialByPanel[panelIds[0]].sourceFabricId='forged-source'
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,forgedMaterial),/NATIVE_SOURCE_MATERIAL_GRAIN_MISMATCH/)
  const forgedHash=clone(sourceVerifiedOrder)
  forgedHash.nativeCutlineFingerprint='0'.repeat(64)
  await assert.rejects(()=>generateNativeVerifiedOrderMarkersRun36(workspace,forgedHash),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  checks.push('Connected 11-relation garment: native source regeneration, six-grade sewing balance, physical CUT, 45-piece verified production markers')

  stage='six physical 3D grade activations and base restoration'
  const fitProof=[]
  const beforeActivation=(await send({op:'save'})).project
  const sourceBase=clone(state.template)
  for(let i=0;i<sizes.length;i++){
    const size=sizes[i]
    const activated=await send({op:'grade-run-activate',size})
    assert.equal(activated.activeGradedSize,size,`${size}: wrong active grade`)
    assert.deepEqual(activated.template,beforeActivation.grade_run.gradedTemplates[i],`${size}: grade geometry not activated`)
    assert.equal(activated.gradedFitEvidence?.nativeMeshCompiled,true,`${size}: native fitted mesh absent`)
    assert(activated.template.panels.length>=3,`${size}: insufficient multi-piece panels`)
    const during=(await send({op:'save'})).project
    assert.deepEqual(during.grade_run,beforeActivation.grade_run,`${size}: activation changed persisted grade catalog`)
    assert.deepEqual(during.template,beforeActivation.template,`${size}: activation changed authored base`)
    const restored=await send({op:'grade-run-restore'})
    assert.equal(restored.activeGradedSize??null,null,`${size}: viewport remains graded`)
    assert.deepEqual(restored.template,sourceBase,`${size}: base geometry not restored`)
    assert.deepEqual((await send({op:'save'})).project,beforeActivation,`${size}: restoration changed persistent project`)
    fitProof.push({size,nativeMeshCompiled:true,panelCount:activated.template.panels.length,restored:true})
  }
  const postFitCut=await send({op:'grade-run-cutlines'})
  assert.deepEqual((await generateNativeVerifiedOrderMarkersRun36(workspace,sourceVerifiedOrder)).results,markers.results,
    'Native six-size 3D activation altered physical five-piece CUT marker geometry')
  checks.push('Native Rust activates all six regenerated sewn facing meshes, restores authored base and preserves persisted grade graph')

  stage='native linked undo redo and persisted re-open'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,installed)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'open',project:after})
  await checkPhysical(.38)
  assert.deepEqual((await generateNativeVerifiedOrderMarkersRun36(workspace,sourceVerifiedOrder)).results,markers.results,
    'Native Undo/Redo/save/reopen altered qualified source-to-marker output')
  assert.deepEqual((await generateNativeVerifiedOrderMarkersRun36(workspace,sourceVerifiedOrder)).results,trusted.results)
  checks.push('Native linked history restores every sewn source, six-grade CUT and facing after 3D, with verified production markers surviving reopen')
  console.log(JSON.stringify({passed:true,nativeRust:true,packagedRuntime:true,disposable:true,sourcePanelId:parentId,
    derivedFacingId:'facing_persisted_v1',sizes,physicalFacingNotches:12,fitProof,
    browserQualifiedRegeneration:true,originalSewnSeams:originalSeamIds.length,
    addedSewnSeams:authoredSeamIds.length,connectedGarment:true,uiUndoRedo:true,nativeVerifiedProductionOrder:true,
    markerSizes:markers.results.length,markerCutpieceInstances:placed,
    browserErrors:pageErrors,
    beforeRevision,afterRevision:beforeRevision+1,checks,invalid,stale,
    factoryApproved:false,licensedModarisParity:false},null,2))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,reason:error?.message??String(error),
    checks,factoryApproved:false},null,2))
  process.exitCode=1
}finally{
  workspace.close()
  await Promise.race([(browser?.close()??Promise.resolve()).catch(()=>{}),sleep(7000)])
  fs.rmSync(root,{recursive:true,force:true})
  process.exit(process.exitCode||0)
}
