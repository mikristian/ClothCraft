/**
 * EXO native grading loop: one isolated Rust session and one real UI.
 * The installed variant intercepts requests so saved user garments are NEVER
 * edited by a test. Sidecar storage is local to an isolated browser context.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const installed=process.argv.includes('--installed')
const api='http://127.0.0.1:5447'
const ui=installed?'http://127.0.0.1:5386':'http://127.0.0.1:5284'
const output=mkdtempSync(path.join(tmpdir(),'exo-grade-loop-'))
const children=[]
const run=(cmd,args,env={})=>children.push(spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}}))
const wait=async url=>{
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Isolated grading service not ready: '+url)
}
const native=async op=>{
  const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(op)})
  const json=await response.json()
  assert.ok(json.ok,json.error||json.code)
  return json.data
}
let browser
try{
  run(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5447',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  if(!installed)run(path.join(root,'node_modules/.bin/vite'),
    ['--host','127.0.0.1','--port','5284','--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([wait(api+'/health'),wait(ui)])
  const initial=await native({op:'open',preset:'tshirt'})
  assert.ok(initial.template.panels.length>=2)
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1540,height:980},acceptDownloads:true})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()}
    delete headers.origin
    const response=await route.fetch({url:api+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=gradeLoop20261025',
    {waitUntil:'domcontentloaded'})
  await page.locator('.cc-board svg[data-native-tool]').waitFor({state:'visible',timeout:40000})
  await page.getByRole('button',{name:'Edit Grading'}).click()
  const dialog=page.getByRole('dialog',{name:'Pattern Grading'})
  await dialog.waitFor({state:'visible'})
  const tabs=dialog.getByRole('tablist',{name:'Grading studio tools'})
  const expected=['Resize','Grade Points','Measurements','Size Nest','Seams & QA','Export']
  assert.deepEqual(await tabs.getByRole('tab').allTextContents(),expected)
  const gradeBody=dialog.locator('[data-native-grade-pattern]')
  assert.equal(await gradeBody.getAttribute('data-grade-step'),'rules')
  const rect=await dialog.boundingBox()
  assert.ok(rect.width>480&&rect.height<850,'Grading panel should be wide, contained and readable')
  const button=dialog.getByRole('button',{name:'Start zero-offset grading'})
  await button.click()
  await dialog.getByRole('table',{name:'Independent editable grade movements by size'}).waitFor()
  assert.match(await dialog.locator('.exo-grade-studio-meta').innerText(),/INDEPENDENT GRADE DRAFT/)
  await dialog.getByRole('combobox',{name:'Independent native grading edit size'}).selectOption('L')
  await dialog.getByRole('spinbutton',{name:'Native grade point horizontal movement mm'}).fill('8')
  await dialog.getByRole('spinbutton',{name:'Native grade point vertical movement mm'}).fill('3')
  await dialog.getByRole('button',{name:'Apply point grading to L'}).click()
  const table=dialog.getByRole('table',{name:'Independent editable grade movements by size'})
  await page.waitForFunction(()=>{
    const rows=[...document.querySelectorAll('[aria-label="Independent editable grade movements by size"] tbody tr')]
    return rows.some(row=>row.innerText.startsWith('L')&&/8\.00/.test(row.innerText)&&/3\.00/.test(row.innerText))
  })
  const revision=initial.revision
  assert.equal((await native({op:'snapshot'})).revision,revision,
    'Independent point-rule edits mutated the live native Rust garment')
  await dialog.locator('.clo-native-grading').evaluate(node=>{node.scrollTop=node.scrollHeight})
  await tabs.getByRole('tab',{name:'Measurements'}).click()
  assert.equal(await dialog.locator('.clo-native-grading').evaluate(node=>node.scrollTop),0,
    'Changing grading tools should return the editor scroll to its clean top')
  const pom=dialog.getByRole('region',{name:'Native graded point of measure editor'})
  await pom.waitFor({state:'visible'})
  await pom.getByRole('textbox',{name:'POM measurement name'}).fill('Measured front point separation')
  await pom.getByRole('button',{name:'+ Add measured specification'}).click()
  const pomTable=pom.getByRole('table',{name:'All-size native measured POM with editable target'})
  await pomTable.waitFor({state:'visible'})
  assert.match(await pom.innerText(),/POM target\(s\) missing/)
  await pom.getByRole('button',{name:'Use current measured run as draft targets'}).click()
  await page.waitForFunction(()=>document.querySelector('[data-pom-status]')?.getAttribute('data-pom-status')==='pass')
  const lTarget=pom.getByRole('spinbutton',{name:'POM target L millimetres'})
  const beforeTarget=Number(await lTarget.inputValue())
  await lTarget.fill(String(beforeTarget+20))
  await page.waitForFunction(()=>document.querySelector('[data-pom-status]')?.getAttribute('data-pom-status')==='review')
  await lTarget.fill(String(beforeTarget))
  await page.waitForFunction(()=>document.querySelector('[data-pom-status]')?.getAttribute('data-pom-status')==='pass')
  await page.screenshot({path:path.join(output,'grade-pom-unified.png')})
  await tabs.getByRole('tab',{name:'Size Nest'}).click()
  await dialog.locator('[data-native-grade-all-blocks]').waitFor({state:'visible'})
  await dialog.getByRole('combobox',{name:'Native graded nest selected size'}).selectOption('XL')
  await tabs.getByRole('tab',{name:'Seams & QA'}).click()
  const quality=dialog.getByRole('region',{name:'Unified native size grading quality'})
  await quality.waitFor({state:'visible'})
  assert.match(await quality.innerText(),/All-size grading verification/)
  assert.match(await quality.innerText(),/POM checks/)
  assert.match(await quality.innerText(),/NATIVE CATALOG UNVERIFIED/)
  assert.equal(await quality.locator('[data-grade-native-activation-bounds]').count(),1,
    'Native grade envelope preflight must be visible before save')
  assert.equal(await quality.locator('[data-grade-cut-preflight]').count(),1,
    'Six-size CUT, notch and allowance production preflight must be visible')
  assert.match(await quality.locator('[data-grade-cut-preflight]').innerText(),/CUT \/ allowance \/ notch audit/)
  await tabs.getByRole('tab',{name:'Export'}).click()
  assert.match(await dialog.innerText(),/factory cutting and independently accepted graded DXF remain blocked/i)
  assert.equal(await dialog.getByRole('button',{name:'Base CUT · A4'}).count(),1)
  const nativeCatalog=dialog.getByRole('region',{name:'Native six-size grading catalog'})
  await nativeCatalog.getByRole('button',{name:'Save six-size catalog to Rust'}).click()
  await page.waitForFunction(()=>Boolean(document.querySelector('[data-native-catalog-message]')?.textContent?.trim()),null,{timeout:18000})
  const rejection=await dialog.locator('[data-native-catalog-message]').innerText()
  assert.match(rejection,/sewn|seam|mismatch|unequal|physical contour QA/i)
  assert.equal((await native({op:'snapshot'})).revision,revision,
    'Rejected sewn size grading must not commit a partial Rust catalog')
  // Resolve the sewn mismatch. All size-rule edits must be coordinated with
  // stitchline length checks before the native project can save the catalog.
  await tabs.getByRole('tab',{name:'Grade Points'}).click()
  await dialog.getByRole('combobox',{name:'Independent native grading edit size'}).selectOption('L')
  await page.waitForFunction(()=>{
    const x=document.querySelector('[aria-label="Native grade point horizontal movement mm"]')
    const y=document.querySelector('[aria-label="Native grade point vertical movement mm"]')
    return x?.value==='8'&&y?.value==='3'
  },null,{timeout:8000})
  await dialog.getByRole('spinbutton',{name:'Native grade point horizontal movement mm'}).fill('0')
  await dialog.getByRole('spinbutton',{name:'Native grade point vertical movement mm'}).fill('0')
  await page.waitForTimeout(120)
  assert.equal(await dialog.getByRole('spinbutton',{name:'Native grade point horizontal movement mm'}).inputValue(),'0')
  assert.equal(await dialog.getByRole('spinbutton',{name:'Native grade point vertical movement mm'}).inputValue(),'0')
  await dialog.getByRole('button',{name:'Apply point grading to L'}).click()
  await page.waitForFunction(()=>{
    const rows=[...document.querySelectorAll('[aria-label="Independent editable grade movements by size"] tbody tr')]
    return rows.some(row=>row.innerText.startsWith('L')&&/0\.00\s+0\.00/.test(row.innerText))
  })
  await tabs.getByRole('tab',{name:'Measurements'}).click()
  await pom.getByRole('button',{name:'Use current measured run as draft targets'}).click()
  await tabs.getByRole('tab',{name:'Export'}).click()
  await nativeCatalog.getByRole('button',{name:'Save six-size catalog to Rust'}).click()
  await page.waitForFunction(()=>document.querySelector('[aria-label="Native six-size grading catalog"] header span')?.textContent==='SAVED IN PROJECT',null,{timeout:50000})
  const committed=await native({op:'grade-run-status',revision:revision+1})
  assert.equal(committed.persistedInProject,true)
  assert.equal(committed.catalog.gradedTemplates.length,6)
  assert.equal(committed.manufacturingApproved,false)
  const release=dialog.getByRole('region',{name:'All-size manufacturing release checklist'})
  assert.match(await release.innerText(),/independently verified native Rust graded catalog persisted and revision-linked/i)
  assert.match(await release.innerText(),/Release blocked/)
  await tabs.getByRole('tab',{name:'Resize'}).click()
  assert.equal(await dialog.locator('[data-native-grade-apply]').isDisabled(),true,
    'Single-size grade must not invalidate current six-size rules')
  await tabs.getByRole('tab',{name:'Grade Points'}).click()
  assert.match(await table.innerText(),/L\s+0\.00\s+0\.00/)
  await page.screenshot({path:path.join(output,'grade-points-unified.png')})
  await tabs.getByRole('tab',{name:'Seams & QA'}).click()
  assert.equal(await quality.locator('[data-grade-native-activation-bounds]').getAttribute('data-grade-native-activation-bounds'),'pass',
    'Zero-offset native grade catalog must fit declared pattern bounds')
  await page.screenshot({path:path.join(output,'grade-qa-unified.png')})
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,installed,views:expected,widePanel:rect.width,
    gradedPointMm:[8,3],pomSizes:6,pomToleranceEnforced:true,nestSize:'XL',qaUnified:true,exportStudyOnly:true,
    rejectedUnmatchedSewnGrade:true,repairedPointBeforeCommit:true,
    nativeRevisionUnchangedBeforeCommit:revision,nativeSixSizeCatalogPersisted:true,
    revisionAfterCommit:committed.revision,manufacturingApproved:false,pageErrors:0,output}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
