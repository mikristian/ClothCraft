// Isolated browser/native Rust integration proof. Creates disposable panels in
// /tmp, never opens or alters the user's installed EXO ClothCraft document.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {buildNativeCurveStation20261023} from '../../src/core/nativeCurveStation20261023.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const nativePort=5461,uiPort=5291
const native=`http://127.0.0.1:${nativePort}`
const ui=`http://127.0.0.1:${uiPort}`
const output=mkdtempSync(path.join(tmpdir(),'exo-native-construction-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const session=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(session),'The previously compiled native Rust session binary is required')
const children=[]
const start=(exe,args,env={})=>{
  const child=spawn(exe,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1300)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Isolated QA service failed: ${url}`)
}
async function command(body){
  const response=await fetch(`${native}/workspace`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const envelope=await response.json()
  assert(envelope.ok,`Native QA command ${body.op}: ${envelope.error||JSON.stringify(envelope)}`)
  return envelope.data
}
async function snapshot(){return command({op:'snapshot'})}
const near=(a,b,tol=1e-6)=>Number.isFinite(a)&&Math.abs(a-b)<=tol
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
  const original=await command({op:'open',preset:'tshirt'})
  const fabric=original.template?.fabrics?.[0]?.id
  assert(typeof fabric==='string'&&fabric,'Native test template needs fabric')
  const created=await command({op:'edit',revision:original.revision,command:{kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric}})
  const detached=created.template.panels.at(-1)
  assert(detached?.polygon?.points?.length===4,'Detached native rectangle was not created')
  const sourcePoint=[...detached.polygon.points[1]]
  assert(near(sourcePoint[0],.4)&&near(sourcePoint[1],0),'Unexpected source rectangle points')

  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1580,height:1000}})
  const errors=[]
  const sent=[]
  page.on('pageerror',err=>errors.push(err.message))
  page.on('request',req=>{if(req.url().endsWith('/workspace')&&req.method()==='POST'){
    try{sent.push(req.postDataJSON())}catch{}
  }})
  // Existing QA pattern: route native requests into this disposable session.
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(`${ui}/?desktop=1&engine=clothcraft&testSession=construction-qa-20261023`,{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'construction-point'}})))
  const modal=page.locator('[data-native-construction-tool="true"]')
  await modal.waitFor({state:'visible',timeout:10000})
  await modal.getByRole('combobox',{name:'Construction pattern panel'}).selectOption(detached.id)
  await modal.getByRole('combobox',{name:'Construction target point'}).selectOption('1')
  await modal.getByRole('combobox',{name:'Numerical construction method'}).selectOption('along')
  await modal.getByRole('combobox',{name:'Construction reference A'}).selectOption('0')
  await modal.getByRole('combobox',{name:'Construction reference B'}).selectOption('1')
  await modal.getByRole('spinbutton',{name:'Numerical construction distance millimetres'}).fill('370')
  await modal.locator('[data-construction-valid="true"]').waitFor({state:'visible',timeout:8000})
  const preview=page.locator(`[data-native-construction-preview="${detached.id}"]`)
  await preview.waitFor({state:'attached',timeout:8000})
  const beforeCommit=await snapshot()
  assert(near(beforeCommit.template.panels.find(p=>p.id===detached.id).polygon.points[1][0],.4),'UI preview must never mutate source geometry')
  await modal.getByRole('button',{name:'Apply with native Undo'}).click()
  await page.waitForFunction(({id,x})=>{
    const marker=document.querySelector('[data-native-construction-tool="true"] .exo-construction-message')
    return marker?.textContent?.includes('Saved P2')
  },{id:detached.id,x:.37},{timeout:10000})
  const applied=await snapshot()
  const vertex=applied.template.panels.find(p=>p.id===detached.id)?.polygon.points[1]
  assert(near(vertex[0],.37)&&near(vertex[1],0),`Native Anchor did not move P2 to 370 mm: ${vertex}`)
  assert(sent.some(x=>x.command?.kind==='Anchor'&&x.command.panel===detached.id&&x.command.anchor===1),
    'UI did not send native Anchor operation')

  // The numerical point undo must go through the app's native history, not
  // some unlinked React shadow state.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  for(let i=0;i<50;i++){
    await sleep(100)
    const snap=await snapshot()
    const x=snap.template.panels.find(p=>p.id===detached.id)?.polygon.points[1][0]
    if(near(x,.4))break
    if(i===49)throw Error(`Native Undo failed to restore P2: ${x}`)
  }

  // Seamly-style named dependencies must change the actual native distance;
  // its expression is never executed as JS and never stored in Rust serde.
  await modal.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  const worksheet=modal.getByRole('textbox',{name:'Named drafting measurement worksheet'})
  await worksheet.fill('base = 390\nshrink = 25\nfinal = base - shrink')
  await modal.getByRole('textbox',{name:'Drafting distance formula expression'}).fill('final')
  await page.waitForFunction(()=>document.querySelector('[data-native-construction-worksheet="true"]')?.textContent?.includes('365.000 mm'),null,{timeout:10000})
  await modal.getByRole('button',{name:'Save worksheet locally'}).click()
  const bound=modal.locator('[data-native-constraint-sidecar="true"]')
  await bound.locator('summary').click()
  await bound.getByRole('button',{name:'Bind this point to formula'}).click()
  await bound.locator('[data-native-binding-status="ready"]').waitFor({state:'visible',timeout:10000})
  const stored=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('exo-v2-native-point-bindings:')).map(key=>localStorage.getItem(key)))
  assert.equal(stored.length,1,'Versioned named point binding not stored locally')
  assert(stored[0].includes('sha256:'),'Saved binding must carry source fingerprint')
  await modal.getByRole('button',{name:'Apply with native Undo'}).click()
  await page.waitForFunction(()=>document.querySelector('[data-native-construction-tool="true"] .exo-construction-message')?.textContent?.includes('Saved P2'),null,{timeout:10000})
  const fromFormula=await snapshot()
  assert(near(fromFormula.template.panels.find(p=>p.id===detached.id).polygon.points[1][0],.365),
    'Worksheet arithmetic did not reach native Rust point construction')
  await bound.locator('[data-native-binding-status="stale"]').waitFor({state:'visible',timeout:10000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'undo'})))
  for(let i=0;i<50;i++){
    await sleep(100)
    const snap=await snapshot()
    const x=snap.template.panels.find(p=>p.id===detached.id)?.polygon.points[1][0]
    if(near(x,.4))break
    if(i===49)throw Error(`Native formula Undo failed to restore original corner: ${x}`)
  }
  await worksheet.fill('base=process.exit(1)')
  await page.waitForFunction(()=>document.querySelector('[data-native-construction-worksheet="true"] .exo-construction-invalid')?.textContent?.includes('Formula blocked'),null,{timeout:10000})
  assert(await modal.getByRole('button',{name:'Apply with native Undo'}).isDisabled(),
    'Arbitrary JavaScript syntax must never produce an editable construction')
  await bound.getByRole('button',{name:'Clear bindings'}).click()
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('exo-v2-native-point-bindings:')).length),0,
    'Clearing a saved plan must remove its only local metadata key')

  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve-station'}})))
  const station=page.locator('[data-native-curve-station="true"]')
  await station.waitFor({state:'visible',timeout:10000})
  await station.getByRole('combobox',{name:'Curve station pattern'}).selectOption(detached.id)
  const changed=await snapshot()
  const firstEdge=changed.template.panels.find(p=>p.id===detached.id).polygon.edges[0]
  await station.getByRole('combobox',{name:'Curve station named edge'}).selectOption(firstEdge)
  await station.getByRole('spinbutton',{name:'Curve station distance millimetres'}).fill('125')
  await station.locator('[data-curve-station-status="ready"]').waitFor({state:'visible',timeout:10000})
  await page.locator(`[data-native-curve-station-preview="${detached.id}"]`).waitFor({state:'attached',timeout:8000})
  await station.getByRole('button',{name:'Split boundary · native Undo'}).click()
  await page.waitForFunction(()=>document.querySelector('[data-native-curve-station="true"] .exo-construction-message')?.textContent?.includes('Split committed'),null,{timeout:10000})
  const split=await snapshot()
  const newPanel=split.template.panels.find(p=>p.id===detached.id)
  assert.equal(newPanel.polygon.points.length,5,'Native SplitBoundary did not add physical vertex')
  assert(sent.some(x=>x.command?.kind==='SplitBoundary'&&x.command.panel===detached.id&&near(x.command.at_m,.125)),
    'Native Rust did not receive millimetre-to-metre SplitBoundary')
  // Independent curved-geometry proof: preview coordinate and final Rust
  // insertion must agree, including material arclength inversion. This is
  // performed via the disposable Rust server after the browser UI proof.
  const second=await command({op:'edit',revision:split.revision,command:{kind:'Primitive',shape:'rectangle',size:[.4,.3],origin:[0,0],fabric}})
  const curvedPiece=second.template.panels.at(-1)
  const curvedEdge=curvedPiece.polygon.edges[0]
  const curvedPolygon=structuredClone(curvedPiece.polygon)
  const startPoint=curvedPolygon.points[0],endPoint=curvedPolygon.points[1]
  const horizontal=endPoint[0]-startPoint[0],vertical=endPoint[1]-startPoint[1]
  curvedPolygon.curves={...curvedPolygon.curves,[curvedEdge]:[
    [startPoint[0]+horizontal*.20,startPoint[1]+vertical*.20+.12],
    [startPoint[0]+horizontal*.82,startPoint[1]+vertical*.82+.10],
  ]}
  const curvedNative=await command({op:'edit',revision:second.revision,command:{kind:'Shape',panel:curvedPiece.id,polygon:curvedPolygon}})
  const exact=buildNativeCurveStation20261023(curvedNative,{panelId:curvedPiece.id,edge:curvedEdge,mode:'fraction',fraction:.37})
  assert.equal(exact.ok,true,exact.reason)
  assert(exact.edgeLengthMm>400,'Bézier physical arclength should exceed its straight chord')
  const curvedSplit=await command({op:'edit',revision:curvedNative.revision,command:exact.command})
  const finalCurve=curvedSplit.template.panels.find(p=>p.id===curvedPiece.id)
  assert.equal(finalCurve.polygon.points.length,5)
  const afterPoint=finalCurve.polygon.points[1]
  const nativeDifferenceMm=Math.hypot(afterPoint[0]-exact.position[0],afterPoint[1]-exact.position[1])*1000
  assert(nativeDifferenceMm<.10,`Rust-compatible Bézier station preview drifted by ${nativeDifferenceMm} mm`)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({ok:true,fixture:'disposable native rectangle',selectedPanel:detached.id,
    initialPointMm:sourcePoint.map(v=>v*1000),newAnchorMm:vertex.map(v=>v*1000),
    splitStationMm:125,pointsAfterSplit:newPanel.polygon.points.length,
    formulaNativeDistanceMm:365,formulaUndo:true,forbiddenFormulaBlocked:true,
    fingerprintedBindingsSaved:true,staleBindingBlocked:true,sidecarClearPreservesSource:true,
    curvedEdgeLengthMm:Number(exact.edgeLengthMm.toFixed(3)),curvedSplitPreviewDifferenceMm:Number(nativeDifferenceMm.toFixed(5)),
    realNativeUndo:true,previewNoMutation:true,browserErrors:errors,
    operationKinds:sent.filter(x=>x.command).map(x=>x.command.kind).slice(-6)},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
