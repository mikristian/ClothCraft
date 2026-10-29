// Installed V2 app asset smoke test. No edit/save/undo requests are sent.
// The production workspace is read-only throughout the test.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin='http://127.0.0.1:5386'
const bridge='http://127.0.0.1:5385/workspace'
async function snapshot(){
  const response=await fetch(bridge,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"op":"snapshot"}'})
  const body=await response.json()
  assert(body.ok,body.error||'Installed native workspace snapshot unavailable')
  return {revision:body.data.revision,panels:body.data.template?.panels?.length,
    seams:body.data.template?.seams?.length}
}
const before=await snapshot()
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const page=await browser.newPage({viewport:{width:1580,height:1000}})
  const pageErrors=[],nativeMutations=[]
  page.on('pageerror',err=>pageErrors.push(err.message))
  page.on('request',req=>{
    if(req.url()!==bridge||req.method()!=='POST')return
    try{
      const body=req.postDataJSON()
      if(['edit','edit-batch','save','undo','redo','open','delete'].includes(body?.op))nativeMutations.push(body.op)
    }catch{}
  })
  await page.goto(`${origin}/?desktop=1&engine=clothcraft&testSession=installed-2d-readonly-20261023`,{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board')
  await board.first().waitFor({state:'visible',timeout:45000})
  const arrow=page.getByRole('button',{name:'Open Pattern Studio'})
  if(await arrow.count())await arrow.first().click()
  const rail=page.locator('[data-pattern-design-panel="true"]')
  await rail.waitFor({state:'visible',timeout:15000})
  await rail.locator('[data-pattern-design-tool="construction-point"]').click()
  const modal=page.locator('[data-native-construction-tool="true"]')
  await modal.waitFor({state:'visible',timeout:10000})
  assert(await modal.getByRole('combobox',{name:'Numerical construction method'}).isVisible())
  await modal.getByRole('combobox',{name:'Construction distance source'}).selectOption('formula')
  await modal.getByRole('textbox',{name:'Named drafting measurement worksheet'}).fill('width = 680\nease = 20\nquarter = (width + ease) / 4')
  await modal.getByRole('textbox',{name:'Drafting distance formula expression'}).fill('quarter')
  await page.waitForFunction(()=>document.querySelector('[data-native-construction-worksheet="true"]')?.textContent?.includes('175.000 mm'),null,{timeout:8000})
  assert(await modal.locator('[data-native-constraint-sidecar="true"]').count()===1,
    'Versioned measurement-to-point binding manager missing')
  assert(await rail.locator('[data-pattern-design-tool="construction-point"]').getAttribute('aria-pressed')==='true')
  await rail.locator('[data-pattern-design-tool="curve-station"]').click()
  const station=page.locator('[data-native-curve-station="true"]')
  await station.waitFor({state:'visible',timeout:10000})
  assert.equal(await modal.count(),0,'Switching construction tools should close the previous modal')
  assert(await station.getByRole('combobox',{name:'Curve station named edge'}).isVisible())
  await rail.locator('[data-pattern-design-tool="dart-precision"]').click()
  const precision=page.locator('[data-native-dart-precision="true"]')
  await precision.waitFor({state:'visible',timeout:10000})
  assert(await precision.getByRole('combobox',{name:'Precision dart pattern'}).isVisible())
  assert(await precision.getByRole('spinbutton',{name:'Precision dart intake'}).isVisible())
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{
    detail:{nativeAction:'pattern2d.walkSeam'},
  })))
  const walk=page.locator('[data-native-seam-walk="true"]')
  await walk.waitFor({state:'visible',timeout:10000})
  await walk.locator('[data-native-seam-trueing="diagnostic"]').waitFor({state:'visible',timeout:10000})
  assert(await walk.getByText('SEAM TRUEING · 2D DIAGNOSTIC').isVisible())
  const after=await snapshot()
  assert.deepEqual(after,before,'Read-only installed UI test unexpectedly changed the native source document')
  assert.deepEqual(nativeMutations,[],`Installed page unexpectedly sent native mutating operations: ${nativeMutations}`)
  assert.deepEqual(pageErrors,[])
  console.log(JSON.stringify({ok:true,installed:true,bundleUpdated:true,patternDesignRail:true,
    numericalPointInspector:true,formulaWorksheetMm:175,curveStationInspector:true,
    savedBindingInspector:true,precisionDartInspector:true,nativeSeamTrueing:true,
    sourceDocumentPreserved:true,revision:after.revision,panels:after.panels,seams:after.seams,
    browserErrors:pageErrors,nativeMutations},null,2))
}finally{await browser.close()}
