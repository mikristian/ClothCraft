// RUN40: current EXO library folder UI + native chronological hardware history.
// Disposable native Rust + EXO browser test for original CLO GLB placements.
// Does not write to the user's saved garment or installed application.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-clo-hardware-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(nativeBin),'Build Rust exo-session before QA')
const nativePort='5873',webPort='5874',native=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${webPort}`,children=[]
const run=(file,args,env={})=>{
  const child=spawn(file,args,{cwd:root,env:{...process.env,...env},detached:true,stdio:'ignore'})
  children.push(child)
}
const wait=async url=>{
  for(let n=0;n<180;n++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1200)})).ok)return}catch{}
    await pause(250)
  }
  throw Error(`Native QA service unavailable: ${url}`)
}
let browser
try{
  run(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:nativePort,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  })
  run(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',webPort,'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
  await Promise.all([wait(native+'/health'),wait(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1680,height:1000}})
  const errors=[],nativeCalls=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/workspace',async route=>{
    const request=route.request()
    if(request.method()==='POST')try{nativeCalls.push(request.postDataJSON())}catch{}
    const headers={...request.headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=imported-clo-hardware',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({timeout:60000})
  // Current LibraryChrome (October 29) embeds CLO GLB assets directly inside
  // the YKK/puller/slider folders; the old dedicated imported-library-toggle
  // no longer exists. Navigate the REAL visible library root and global search.
  await page.locator('button[title="Open asset library"]').click()
  await page.locator('[data-library-tree-root="Hardware and Trims"]').click()
  const section=page.locator('[data-library-section-toggle="Hardware and Trims"]')
  if(await section.getAttribute('aria-expanded')==='false')await section.click()
  await page.getByRole('textbox',{name:'Search library'}).fill('YKK')
  await page.locator('.clo-imported-tile').first().waitFor({timeout:15000})
  const foundYkk=await page.locator('.clo-imported-tile').count()
  assert(foundYkk>0,'Current EXO hardware folder must expose a placeable YKK 3D model')
  await page.locator('.clo-imported-tile').first().click()
  const place=page.locator('[data-clo-imported-place]')
  await place.waitFor({state:'visible'})
  await place.click()
  try{
    await page.waitForFunction(()=>document.querySelector('[data-imported-hardware-editor="placed"]')!==null,undefined,{timeout:40000})
  }catch(error){
    console.error(JSON.stringify({phase:'native-place',pageErrors:errors,
      recentRequests:nativeCalls.filter(call=>/^hardware-/.test(call.op)).slice(-4),
      status:(await page.locator('[role="status"]').allInnerTexts()).slice(0,8),
      inspector:(await page.locator('.clo-property-panel').allInnerTexts()).slice(0,1)},null,2))
    throw error
  }
  const inspector=page.locator('[data-imported-hardware-editor="placed"]')
  const nativeResponse=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})}).then(r=>r.json())
  assert(nativeResponse.ok,JSON.stringify(nativeResponse))
  assert.equal(nativeResponse.data.importedHardware.length,1)
  const placed=nativeResponse.data.importedHardware[0]
  assert(placed.assetId.includes('ykk-'))
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.nativeImportedHardwareCount||0)>=1,{timeout:20000})
  const width=inspector.locator('[data-imported-hardware-property="widthMm"] input[type="number"]')
  await width.fill('12')
  await width.press('Tab')
  await page.waitForFunction(()=>Number(document.querySelector('[data-imported-hardware-property="widthMm"] input[type="number"]')?.value)===12)
  const color=inspector.locator('[aria-label="Imported hardware material color"]')
  await color.fill('#c16f4c')
  await page.waitForFunction(()=>document.querySelector('[aria-label="Imported hardware material color"]')?.value==='#c16f4c')
  for(const [field,value] of [['reflectionIntensity',1.8],['clearcoat',0.55],['weightGrams',12.5]]){
    const number=inspector.locator(`[data-imported-hardware-property="${field}"] input[type="number"]`)
    await number.fill(String(value))
    await number.press('Enter')
    await page.waitForFunction(({field,value})=>Number(document.querySelector(`[data-imported-hardware-property="${field}"] input[type="number"]`)?.value)===value,{field,value})
    let committed=false
    for(let attempt=0;attempt<40;attempt++){
      const updated=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})}).then(r=>r.json())
      if(updated.data?.importedHardware?.[0]?.[field]===value){committed=true;break}
      await pause(150)
    }
    assert(committed,`${field} must commit to Rust before changing another material setting`)
  }
  await inspector.getByRole('combobox',{name:'Imported hardware material family'}).selectOption('metal')
  await page.waitForFunction(()=>document.querySelector('[aria-label="Imported hardware material family"]')?.value==='metal')
  let after
  for(let attempt=0;attempt<40;attempt++){
    after=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})}).then(r=>r.json())
    const placed=after.data?.importedHardware?.[0]
    if(placed?.reflectionIntensity===1.8&&placed?.clearcoat===.55&&placed?.weightGrams===12.5&&placed?.materialType==='metal')break
    await pause(150)
  }
  assert.equal(after.data.importedHardware[0].color,'#c16f4c')
  assert.equal(after.data.importedHardware[0].reflectionIntensity,1.8)
  assert.equal(after.data.importedHardware[0].clearcoat,0.55)
  assert.equal(after.data.importedHardware[0].weightGrams,12.5)
  assert.equal(after.data.importedHardware[0].materialType,'metal')
  assert(after.data.importedHardware[0].scale[0]>0)
  const projectPath=path.join(output,'workspace','fitting-project.json')
  let autosaved
  for(let attempt=0;attempt<40;attempt++){
    autosaved=JSON.parse(readFileSync(projectPath,'utf8'))
    if(autosaved.importedHardware?.[0]?.materialType==='metal'&&autosaved.importedHardware?.[0]?.weightGrams===12.5)break
    await pause(150)
  }
  assert.equal(autosaved.importedHardware?.[0]?.color,'#c16f4c','Hardware edits must auto-save without pressing Save')
  assert.equal(autosaved.importedHardware?.[0]?.materialType,'metal','Hardware material family must auto-save')
  const undo=inspector.locator('[data-imported-hardware-undo]')
  await undo.click()
  await page.waitForFunction(()=>document.querySelector('[data-imported-hardware-redo]')?.disabled===false)
  await inspector.locator('[data-imported-hardware-redo]').click()
  let revived
  for(let attempt=0;attempt<40;attempt++){
    revived=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})}).then(r=>r.json())
    if(revived.data.importedHardware[0]?.materialType==='metal')break
    await pause(150)
  }
  if(revived.data.importedHardware[0]?.materialType!=='metal'){
    console.error('Imported hardware redo diagnostics',JSON.stringify({
      hardwareOps:nativeCalls.filter(call=>/^hardware-/.test(call.op)).map(call=>call.op),
      redoEnabled:await inspector.locator('[data-imported-hardware-redo]').isEnabled(),
      current:revived.data.importedHardware[0],
      status:(await page.locator('[role="status"]').allInnerTexts()).slice(0,4),
      errors,
    },null,2))
  }
  assert.equal(revived.data.importedHardware[0].color,'#c16f4c')
  assert.equal(revived.data.importedHardware[0].materialType,'metal')
  // Prove the NEW chronological history is reachable through EXO's actual
  // global controls, not only the inspector's specialized hardware buttons.
  const globalUndo=page.locator('button.icon-button[title="Undo"]')
  const globalRedo=page.locator('button.icon-button[title="Redo"]')
  const useGlobalHistory=async (op,trigger,expectedMaterial)=>{
    const receipt=page.waitForResponse(response=>{
      if(!response.url().endsWith('/workspace')||response.request().method()!=='POST')return false
      try{return response.request().postDataJSON()?.op===op}catch{return false}
    },{timeout:20000})
    await trigger()
    const response=await receipt
    const body=await response.json()
    assert.equal(body.ok,true, `Global ${op} rejected: ${body.error||'unknown'}`)
    assert.equal(body.data?.importedHardware?.[0]?.materialType,expectedMaterial,
      `Global ${op} did not restore expected native hardware material`)
    return body.data
  }
  await useGlobalHistory('undo',()=>globalUndo.click(),'original')
  await useGlobalHistory('redo',()=>globalRedo.click(),'metal')
  await globalUndo.focus()
  await useGlobalHistory('undo',()=>page.keyboard.press('Meta+z'),'original')
  await useGlobalHistory('redo',()=>page.keyboard.press('Meta+Shift+z'),'metal')
  const save=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'save'})}).then(r=>r.json())
  assert(save.ok,JSON.stringify(save))
  const stored=JSON.parse(readFileSync(projectPath,'utf8'))
  assert.equal(stored.importedHardware.length,1)
  assert.equal(stored.importedHardware[0].assetId,placed.assetId)
  const reopened=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'open',project:stored})}).then(r=>r.json())
  assert(reopened.ok,JSON.stringify(reopened))
  assert.equal(reopened.data.importedHardware.length,1,'Reopened Rust project lost the GLB hardware')
  assert.equal(reopened.data.importedHardware[0].color,'#c16f4c')
  assert.equal(reopened.data.importedHardware[0].reflectionIntensity,1.8)
  assert.equal(reopened.data.importedHardware[0].clearcoat,0.55)
  assert.equal(reopened.data.importedHardware[0].weightGrams,12.5)
  assert.equal(reopened.data.importedHardware[0].materialType,'metal')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,isolated:true,searchYkk:foundYkk,currentHardwareLibrary:true,nativeGlbRendered:true,
    nativePlacement:placed.assetId,propertyEdit:true,colorSaved:true,advancedMaterialSaved:true,hardwareUndoRedo:true,nativeAutoSave:true,nativeSave:true,nativeReopen:true,
    globalHardwareToolbarUndoRedo:true,globalHardwareKeyboardUndoRedo:true,
    nativeHardwareCommands:nativeCalls.filter(call=>/^hardware-/.test(call.op)).map(x=>x.op),errors,output},null,2))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  rmSync(output,{recursive:true,force:true})
}
