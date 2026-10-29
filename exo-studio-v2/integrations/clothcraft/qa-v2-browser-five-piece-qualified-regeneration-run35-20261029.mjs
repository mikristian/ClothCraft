// Executable Rust acceptance: physical persistent six-size facing dependency.
// All inputs and saved projects live in a disposable temporary workspace.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-persistent-facing-'))
const native='http://127.0.0.1:5715',ui='http://127.0.0.1:5716'
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
launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5715',EXO_CLOTHCRAFT_OUTPUT_DIR:root,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(process.cwd(),'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(process.cwd(),'research/oss/clothcraft/target/debug/exo-session')})
let browser,page

const clone=structuredClone
const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
let state,stage='open',beforeRevision
const checks=[]
const send=async req=>{
  const result=await workspace.request({revision:state?.revision,...req})
  assert.equal(result.ok,true, `${req.op}: ${result.error??'native Rust refused'}`)
  if(result.data?.template)state=result.data
  return result.data
}
const panel=(template,id)=>{
  const found=template.panels.filter(p=>p.id===id)
  assert.equal(found.length,1,`Expected unique panel ${id}`)
  return found[0]
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
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const originalIds=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++) await send({op:'edit',command:{kind:'Polygon',fabric:state.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!originalIds.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
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
  launch(path.join(process.cwd(),'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5716','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await ready(ui)
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--disable-gpu','--no-first-run']})
  page=await browser.newPage({viewport:{width:1650,height:1020}})
  page.setDefaultTimeout(14000)
  page.on('pageerror',error=>pageErrors.push(error.message))
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
    materialsByPanel:Object.fromEntries(panelIds.map((id,j)=>
      [id,{fabricId:'main',groupId:j===4?'facing':'shell',grainAngleDeg:0,nap:'one-way'}])),
    cuttingAuthorized:false}
  const markers=generateNativeOrderMarkers(after,cuts,order)
  const placed=markers.results.reduce((count,row)=>count+row.markers.reduce((sum,group)=>sum+group.marker.placements.length,0),0)
  assert(placed>=30,`Expected every native size/panel quantity placed, got ${placed}`)
  assert.equal(markers.cuttingAuthorized,false)
  const tamperedCut=clone(cuts);tamperedCut.sizes[0].panels[0].cut.points[0][0]+=.001
  assert.throws(()=>generateNativeOrderMarkers(after,tamperedCut,order),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const missingQty=clone(order);delete missingQty.quantitiesBySize.XS[panelIds[0]]
  assert.throws(()=>generateNativeOrderMarkers(after,cuts,missingQty),/ORDER_QUANTITY_PANEL_MISMATCH/)
  checks.push('One direct 400→380mm measurement commit propagates source, paired facing, six sewn lengths and 12 physical notches')

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
  assert.deepEqual(generateNativeOrderMarkers((await send({op:'save'})).project,postFitCut,order),markers,
    'Native six-size 3D activation altered physical five-piece CUT marker geometry')
  checks.push('Native Rust activates all six regenerated sewn facing meshes, restores authored base and preserves persisted grade graph')

  stage='undo redo and persisted re-open'
  await send({op:'undo'})
  assert.deepEqual((await send({op:'save'})).project,installed)
  await send({op:'redo'})
  assert.deepEqual((await send({op:'save'})).project,after)
  await send({op:'open',project:after})
  await checkPhysical(.38)
  assert.deepEqual(generateNativeOrderMarkers((await send({op:'save'})).project,
    await send({op:'grade-run-cutlines'}),order),markers,
    'Native Undo/Redo/save/reopen altered qualified source-to-marker output')
  checks.push('Undo/redo restore graph, six grades, facing relation and source geometry; persisted native project reopens')
  console.log(JSON.stringify({passed:true,nativeRust:true,disposable:true,sourcePanelId:parentId,
    derivedFacingId:'facing_persisted_v1',sizes,physicalFacingNotches:12,fitProof,
    browserQualifiedRegeneration:true,markerSizes:markers.results.length,markerCutpieceInstances:placed,
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
