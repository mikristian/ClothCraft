import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync,existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(root,'integrations/clothcraft/output/qa-studio-settings-'))
mkdirSync(output,{recursive:true})
const ui='http://127.0.0.1:5596',api='http://127.0.0.1:5595'
const children=[];const results=[];const errors=[]
const launch=(binary,args,env={})=>{const p=spawn(binary,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(p);return p}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(650)})).ok)return true}catch{}await new Promise(r=>setTimeout(r,250))}return false}
async function check(name,fn){try{const evidence=await fn();results.push({name,passed:true,evidence:evidence??null})}catch(e){results.push({name,passed:false,error:String(e.message||e)})}}
async function exercise(page,engine){
 const label=engine==='clothcraft'?'native':'legacy'
 await page.goto(ui+`/?desktop=1&engine=${engine}&testSession=settings-customization-${label}`,{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).waitFor({timeout:45000})
 const open=()=>page.getByRole('button',{name:'Open Studio Settings'}).click()
 const tab=(id)=>page.getByTestId('settings-tab-'+id).click()
 await check(label+' settings gear opens',async()=>{await open();await page.getByTestId('studio-settings-dialog').waitFor();return 'modal visible'})
 await check(label+' workspace toolbar and action',async()=>{
  await tab('workspace');await page.getByRole('checkbox',{name:'Custom toolbar'}).check()
  const toolbar=page.getByRole('navigation',{name:'Custom studio toolbar'});await toolbar.waitFor()
  const before=await toolbar.locator('[data-action]').evaluateAll(nodes=>nodes.map(n=>n.dataset.action))
  const move=page.getByRole('button',{name:`Move ${before[1]} up`});await move.click()
  const after=await toolbar.locator('[data-action]').evaluateAll(nodes=>nodes.map(n=>n.dataset.action))
  assert.equal(after[0],before[1]);assert.equal(after[1],before[0])
  await page.getByRole('button',{name:'Done'}).click()
  await toolbar.locator('[data-action="grid"]').click()
  return {before:before.slice(0,3),after:after.slice(0,3),toolbarVisible:true,gridActionClicked:true}
 })
 await check(label+' appearance and scene binding',async()=>{
  await open();await tab('appearance')
  await page.getByRole('button',{name:'Lilac',exact:true}).click()
  await page.getByRole('textbox',{name:'Accent color hexadecimal color'}).fill('#8a5ce1')
  await page.getByRole('textbox',{name:'Sidebar background hexadecimal color'}).fill('#243f53')
  await page.getByRole('slider',{name:'Studio light intensity'}).fill('1.6')
  await page.getByRole('button',{name:'Done'}).click()
  const shell=page.locator('[data-studio-customized="true"]');assert.equal(await shell.getAttribute('data-studio-theme'),'lilac')
  const vars=await shell.evaluate(el=>({accent:el.style.getPropertyValue('--studio-accent'),sidebar:el.style.getPropertyValue('--studio-sidebar')}))
  assert.equal(vars.accent,'#8a5ce1');assert.equal(vars.sidebar,'#243f53')
  const scene=await page.locator('canvas').first().evaluate(el=>({...el.dataset})).catch(()=>({}))
  return {vars,canvasLightingDatasets:Object.keys(scene).filter(k=>/light|studio/i.test(k))}
 })
 await check(label+' profile and image upload',async()=>{
  await open();await tab('profile')
  await page.getByRole('textbox',{name:'Display name'}).fill('QA Designer')
  await page.getByRole('textbox',{name:'Designer brand'}).fill('QA Atelier')
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9kK7oAAAAASUVORK5CYII=','base64')
  await page.getByLabel('Upload Brand logo').setInputFiles({name:'qa-logo.png',mimeType:'image/png',buffer:png})
  await page.getByAltText('Brand logo preview').waitFor()
  await page.getByRole('button',{name:'Done'}).click()
  assert(await page.getByText('QA Atelier').count()>0)
  return 'name, brand and PNG logo preview accepted'
 })
 await check(label+' panel swap and preferences persistence',async()=>{
  await open();await tab('workspace');await page.getByRole('combobox',{name:'Panel ordering'}).selectOption('swapped')
  await tab('preferences');await page.getByRole('combobox',{name:'Measurement units'}).selectOption('cm')
  await page.getByRole('button',{name:'Done'}).click()
  assert.equal(await page.locator('[data-studio-customized="true"]').getAttribute('data-studio-panel-order'),'swapped')
  await page.reload({waitUntil:'domcontentloaded'})
  assert.equal(await page.locator('[data-studio-customized="true"]').getAttribute('data-studio-theme'),'lilac')
  assert.equal(await page.locator('[data-studio-customized="true"]').getAttribute('data-studio-panel-order'),'swapped')
  await open();await tab('preferences');assert.equal(await page.getByRole('combobox',{name:'Measurement units'}).inputValue(),'cm')
  await tab('profile');assert.equal(await page.getByRole('textbox',{name:'Display name'}).inputValue(),'QA Designer')
  assert(await page.getByAltText('Brand logo preview').isVisible())
  await page.getByRole('button',{name:'Done'}).click()
  return 'theme, panel order, units, profile and logo survived reload'
 })
 await page.screenshot({path:path.join(output,`${label}-settings-final.png`)}).catch(()=>{})
}

let browser
try{
 const rustBinary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
 const hasNative=existsSync(rustBinary)
 if(hasNative)launch(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:'5595',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:rustBinary,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5596','--strictPort'],hasNative?{VITE_CLOTHCRAFT_BRIDGE_URL:api}:{})
 assert(await ready(ui),'Vite server failed to start')
 const nativeReady=hasNative&&await ready(api+'/health')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 for(const engine of nativeReady?['legacy','clothcraft']:['legacy']){
  const context=await browser.newContext({viewport:{width:1680,height:1050}})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(`${engine}: ${e.message}`))
  await exercise(page,engine);await context.close()
 }
 console.log(JSON.stringify({passed:results.every(r=>r.passed),nativeReady,results,errors,output},null,2))
 if(results.some(r=>!r.passed)||errors.length)process.exitCode=1
}finally{await browser?.close().catch(()=>{});for(const p of children)try{process.kill(-p.pid,'SIGTERM')}catch{}}
