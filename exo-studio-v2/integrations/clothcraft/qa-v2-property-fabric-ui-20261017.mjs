// Isolated, read-only UI acceptance for native Fabric Property Editor and rails.
import assert from 'node:assert/strict'
import {spawn,execFileSync} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {fabricPresetPayload,parseFabricPreset} from '../../src/core/fabricPresetFiles.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-property-fabric-ui-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const backend='http://127.0.0.1:5189',ui='http://127.0.0.1:5284'
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const report={output,screenshots:[],checks:[],failures:[],observations:{},pageerrors:[]}
const children=[]
let browser
function check(name,condition,details){
  report.checks.push({name,pass:Boolean(condition),...(details===undefined?{}:{details})})
  if(!condition)report.failures.push(name)
}
function preflight(){
  const found=execFileSync('lsof',['-nP','-iTCP:5189','-iTCP:5284','-sTCP:LISTEN'],{encoding:'utf8'})
  if(found.trim())throw Error('QA ports occupied; will not interrupt existing server: '+found.trim())
}
function start(command,args,env={}){
  const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1100)})).ok)return}catch{}
    if(children.some(child=>child.exitCode!==null))throw Error('Disposable service exited')
    await sleep(250)
  }
  throw Error('Timed out: '+url)
}
try{
  assert(existsSync(bin),'Missing disposable native Rust session binary')
  try{preflight()}catch(error){if(error.status!==1)throw error}
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5189',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:bin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5284','--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:backend})
  await Promise.all([ready(backend+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1740,height:1080},serviceWorkers:'block'})
  page.on('pageerror',error=>report.pageerrors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:backend+'/workspace',headers,timeout:30000})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=property-fabric-ui',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('.cc-board path[data-panel]').first().waitFor({timeout:50000})
  await page.getByRole('tablist',{name:'Object Browser types'}).getByRole('tab',{name:'Fabric',exact:true}).click()
  await page.locator('.clo-object-list .clo-object-select').first().click()
  const toolbar=page.locator('.clo-fabric-file-toolbar')
  await toolbar.waitFor({state:'visible',timeout:15000})
  check('Fabric selected in inspector',await page.locator('.clo-pe-list[data-property-context="fabric"]').count()===1)
  check('Fabric search available',await toolbar.getByRole('searchbox',{name:'Search fabrics in Property Editor'}).isVisible())
  check('Open control available',await toolbar.getByRole('button',{name:'Open'}).isEnabled())
  check('Save control available',await toolbar.getByRole('button',{name:'Save'}).isEnabled())
  const fields={}
  for(const [field,label] of [['name','Name'],['itemNo','Item No.'],['construction','Construction']]){
    const input=page.locator('.clo-pe-identity[data-property-field="'+field+'"] input')
    await input.waitFor({state:'visible',timeout:10000})
    await input.evaluate(el=>el.blur())
    const idle=await input.evaluate(el=>({border:getComputedStyle(el).borderTopColor,background:getComputedStyle(el).backgroundColor}))
    await input.focus()
    await sleep(180)
    const focused=await input.evaluate(el=>({border:getComputedStyle(el).borderTopColor,outline:getComputedStyle(el).outlineStyle,background:getComputedStyle(el).backgroundColor}))
    fields[field]={idle,focused}
    check(label+' idle borderless',idle.border==='rgba(0, 0, 0, 0)',fields[field])
    check(label+' focus border appears',focused.border!==idle.border&&focused.outline!=='none',fields[field])
    await input.blur()
  }
  report.observations.fields=fields
  const search=toolbar.getByRole('searchbox',{name:'Search fabrics in Property Editor'})
  const firstName=await page.locator('.clo-object-list .clo-object-select').first().innerText()
  const needle=firstName.trim().split(/\s+/)[0].slice(0,5)
  await search.fill(needle)
  const options=toolbar.locator('[role="option"]')
  check('Search matches project fabric',await options.count()>0,{needle,options:await options.count()})
  if(await options.count())await options.first().click()
  check('Fabric remains selected after search',await page.locator('.clo-pe-list[data-property-context="fabric"]').count()===1)
  const rails=await page.evaluate(()=>{
    const style=selector=>{const el=document.querySelector(selector);if(!el)return null;const cs=getComputedStyle(el);return {borderTop:cs.borderTopWidth,pseudoBefore:getComputedStyle(el,'::before').content,pseudoAfter:getComputedStyle(el,'::after').content}}
    return {leftDivider:style('.tool-rail .rail-divider'),leftGroup:style('.tool-rail [data-clo-group-end="true"]'),leftColumn:style('.tool-rail .clo-left-3d-column:nth-child(2)'),rightGroup:style('.clo-right-tool-palette [data-clo-divider-after="true"]'),rightColumn:style('.clo-right-tool-palette .clo-reference-column:nth-child(2)'),rightDivider:style('.clo-right-tool-palette .clo-tool-palette-group-divider')}
  })
  report.observations.rails=rails
  check('3D group separator hidden',!rails.leftGroup||['none','normal'].includes(rails.leftGroup.pseudoBefore),rails.leftGroup)
  check('2D group separator hidden',!rails.rightGroup||['none','normal'].includes(rails.rightGroup.pseudoAfter),rails.rightGroup)
  check('Left rail divider has no line',!rails.leftDivider||rails.leftDivider.borderTop==='0px',rails.leftDivider)
  check('Right rail divider has no line',!rails.rightDivider||rails.rightDivider.borderTop==='0px',rails.rightDivider)
  const contextBefore=await page.locator('.clo-pe-list').getAttribute('data-property-context')
  const harmless=page.locator('[data-clo-slot="2d:A01"]')
  if(await harmless.count())await harmless.click()
  const contextAfter=await page.locator('.clo-pe-list').getAttribute('data-property-context')
  check('Tool activation does not take over inspector',contextAfter===contextBefore,{before:contextBefore,after:contextAfter})
  check('No legacy bottom tool widget',await page.locator('.exo-clo-tool-card,#cc-native-tool-properties,.clo-tool-action-panel').filter({visible:true}).count()===0)
  // Exercise file controls only against the disposable server and workspace.
  const snapshot=async()=>{
    const response=await fetch(backend+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
    const result=await response.json()
    assert(result.ok,'Native snapshot failed: '+result.error)
    return result.data
  }
  const before=await snapshot()
  const selectedId=await page.locator('.cc-fabric-library[data-native-fabric-id]').first().getAttribute('data-native-fabric-id')
  const material=before.template?.fabrics?.find(item=>item.id===selectedId)
  check('Selected native fabric exists in isolated Rust workspace',Boolean(material),{selectedId})
  if(material){
    const metadata=before.propertyMetadata?.fabrics?.[selectedId]||{}
    const original={...material,...metadata,name:material.name||'QA fabric'}
    const downloadPromise=page.waitForEvent('download',{timeout:12000})
    await toolbar.getByRole('button',{name:'Save'}).click()
    const download=await downloadPromise
    const downloaded=path.join(output,download.suggestedFilename())
    await download.saveAs(downloaded)
    const saved=parseFabricPreset(readFileSync(downloaded,'utf8'))
    check('Save downloads parseable native EXO fabric preset',saved.kind==='native'&&saved.fabric.name===original.name,{filename:download.suggestedFilename(),kind:saved.kind})
    const payload=fabricPresetPayload(original,'native')
    const marker='Isolated Fabric Open QA 20261017'
    payload.fabric.construction=marker
    const warp=payload.fabric.properties?.warp
    if(typeof warp==='number')payload.fabric.properties.warp=Number((warp*1.005).toPrecision(10))
    const presetPath=path.join(output,'fabric-open-roundtrip.exo-fabric.json')
    writeFileSync(presetPath,JSON.stringify(payload,null,2))
    const beforeOpenScreenshot=path.join(output,'native-before-fabric-open.png')
    await page.screenshot({path:beforeOpenScreenshot,fullPage:true})
    report.screenshots.push(beforeOpenScreenshot)
    await toolbar.locator('input[type="file"]').setInputFiles(presetPath)
    await page.waitForFunction(()=>{const text=document.querySelector('.clo-fabric-file-status')?.textContent||'';return text.startsWith('Opened ')||text.includes('failed')||text.includes('not assigned')||text.includes('could not')||text.includes('Pause simulation')||text.includes('timed out')},{timeout:36000}).catch(()=>{})
    const openStatus=await toolbar.locator('.clo-fabric-file-status').allTextContents()
    report.observations.openStatus=openStatus
    check('Open confirms selected native preset',openStatus.some(text=>/Opened .* in the selected fabric/.test(text)),openStatus)
    let after=await snapshot()
    for(let attempt=0;attempt<25&&!after.template?.fabrics?.some(item=>item.id===selectedId&&Math.abs(Number(item.properties?.warp)-Number(payload.fabric.properties.warp))<1e-6);attempt++){
      await sleep(200);after=await snapshot()
    }
    const matching=after.template?.fabrics?.filter(item=>Math.abs(Number(item.properties?.warp)-Number(payload.fabric.properties.warp))<1e-6)||[]
    const metaMatch=Object.entries(after.propertyMetadata?.fabrics||{}).find(([,data])=>data.construction===marker)
    check('Open applied native fabric physical warp in isolated Rust workspace',matching.length>0,{expected:payload.fabric.properties.warp,matches:matching.map(item=>item.id)})
    check('Open applied native fabric construction metadata',Boolean(metaMatch),{marker,matchedFabricId:metaMatch?.[0]})
    check('Imported fabric stays in Property Editor',await page.locator('.clo-pe-list[data-property-context="fabric"]').count()===1)
    report.observations.openSave={downloaded,presetPath,selectedId,originalWarp:warp,newWarp:payload.fabric.properties.warp,metadataFabricId:metaMatch?.[0]}
  }
  const screenshot=path.join(output,'native-2d-3d-fabric-property-editor.png')
  await page.screenshot({path:screenshot,fullPage:true})
  report.screenshots.push(screenshot)
  // The same borderless editing rule must apply when the Property Editor
  // switches from Fabric to a 2D pattern, including its immutable Type row.
  await page.locator('.cc-board path[data-panel]').first().click()
  await page.locator('.clo-pe-list[data-property-context="pattern"]').waitFor({timeout:15000})
  const patternFields={}
  for(const field of ['name','itemNo','type']){
    const input=page.locator(`.clo-pe-identity[data-property-field="${field}"] input`)
    await input.waitFor({state:'visible',timeout:10000})
    const isReadOnly=await input.getAttribute('readonly')!==null
    const idle=await input.evaluate(el=>({border:getComputedStyle(el).borderTopColor,background:getComputedStyle(el).backgroundColor}))
    patternFields[field]={readOnly:isReadOnly,...idle}
    check(`Pattern ${field} borderless`,idle.border==='rgba(0, 0, 0, 0)'&&idle.background==='rgba(0, 0, 0, 0)',patternFields[field])
    if(field==='type')check('Pattern Type remains read-only',isReadOnly)
  }
  report.observations.patternFields=patternFields
  const patternScreenshot=path.join(output,'native-pattern-property-editor.png')
  await page.screenshot({path:patternScreenshot,fullPage:true})
  report.screenshots.push(patternScreenshot)
  check('No browser errors',report.pageerrors.length===0,report.pageerrors)
}catch(error){
  report.failures.push('Execution: '+(error.stack||String(error)))
}finally{
  report.pass=report.failures.length===0
  writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
  if(!report.pass)process.exitCode=1
}
