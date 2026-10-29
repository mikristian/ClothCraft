// Isolated acceptance QA for workspace sharing. Never attaches to an existing browser/service.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {existsSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as pause} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'clothcraft-sharing-qa-'))
const executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const nativeBin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const children=[],log=[],checks=[],pageErrors=[]
async function freePort(){const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port}
function start(file,args,env={}){
 const child=spawn(file,args,{cwd:root,detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...env}})
 children.push(child)
 for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{if(log.length<150)log.push(String(chunk).slice(0,1500))})
 return child
}
async function ready(url){for(let n=0;n<180;n++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await pause(250)}throw Error(`Service unavailable ${url}: ${log.slice(-6).join(' ')}`)}
async function visible(locator){return locator.count().then(n=>n>0?n:0)}
async function check(label,fn){await fn();checks.push(label)}
async function openLibrary(page){
 const direct=page.getByRole('button',{name:/open file library|file library/i}).first()
 if(await visible(direct)){await direct.click();return}
 await page.getByRole('button',{name:'File',exact:true}).first().click()
 await page.getByText('File Library',{exact:true}).last().click()
}
async function suite(browser,url,mode){
 const page=await browser.newPage({viewport:{width:1680,height:1000}})
 page.on('pageerror',error=>pageErrors.push(`${mode}: ${error.message}`))
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000})
 const sidebar=page.getByRole('navigation',{name:'Workspace side panels'})
 await sidebar.waitFor({timeout:60000})
 await check(`${mode}: Library and History sidebar tabs`,async()=>{
  for(const label of ['LIBRARY','HISTORY']){
   const tab=sidebar.getByRole('button',{name:label,exact:true});assert.equal(await tab.count(),1)
   await tab.click();assert.equal(await tab.getAttribute('aria-pressed'),'true')
  }
 })
 await check(`${mode}: Sharing sidebar tab`,async()=>{
  const button=sidebar.getByRole('button',{name:/sharing/i})
  assert.equal(await button.count(),1,'Missing workspace Sharing tab beside Library/History')
  await button.click()
  assert.equal(await button.getAttribute('aria-pressed'),'true','Sharing navigation is not selected')
  assert(await page.getByText(/sharing|collaborat/i).count()>1,'Sharing panel did not open')
 })
 await check(`${mode}: top-right profile trigger`,async()=>{
  const button=page.getByRole('button',{name:/profile|account/i}).filter({visible:true}).last()
  assert(await visible(button),'Missing top-right profile button')
  await button.click()
  assert(await page.getByText(/profile|designer|account/i).count()>0,'Profile control did not open profile information')
 })
 await check(`${mode}: collaborator avatars`,async()=>{
  const avatars=page.locator('.exo-collab-avatar, [data-collaborator-avatar], [data-presence-avatar]')
  assert(await visible(avatars),'No accessible collaborator/presence avatar control')
 })
 await check(`${mode}: comments access`,async()=>{
  const comments=page.getByRole('tab',{name:'Comments'})
  assert(await visible(comments),'No comments entry point in workspace')
  await comments.click()
  assert(await page.getByRole('region',{name:'Project comments'}).count()>0,'Comments interface did not open')
 })
 await openLibrary(page)
 const dialog=page.getByRole('dialog',{name:'File Library'})
 await dialog.waitFor({timeout:30000})
 await check(`${mode}: File Library profile and sharing`,async()=>{
  const nav=dialog.getByRole('complementary',{name:'File Library navigation'})
  await nav.getByRole('button',{name:/my profile/i}).click()
  await dialog.getByRole('heading',{name:'Designer profile'}).waitFor()
  await nav.getByRole('button',{name:/sharing/i}).click()
  await dialog.getByRole('heading',{name:'Invite collaborators'}).waitFor()
 })
 await check(`${mode}: viewer/commenter/editor permission selection`,async()=>{
  const field=dialog.getByLabel('Permission')
  assert.deepEqual(await field.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value)),['viewer','commenter','editor'])
  for(const role of ['viewer','commenter','editor']){await field.selectOption(role);assert.equal(await field.inputValue(),role)}
 })
 await check(`${mode}: activity/presence UI`,async()=>{
  await dialog.getByRole('complementary',{name:'File Library navigation'}).getByRole('button',{name:'Activity'}).click()
  await dialog.getByRole('heading',{name:'Activity and presence'}).waitFor()
 })
 await dialog.getByRole('button',{name:'Close File Library'}).click()
 await page.close()
}

let browser
try{
 assert(existsSync(executable),'Google Chrome binary missing')
 const nativePort=await freePort(),webPort=await freePort()
 const native=`http://127.0.0.1:${nativePort}`,web=`http://127.0.0.1:${webPort}`
 if(existsSync(nativeBin)){
  start(process.execPath,['integrations/clothcraft/server.mjs'],{EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:nativeBin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0'})
  await ready(native+'/health')
 }
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(webPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await ready(web)
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--enable-webgl','--ignore-gpu-blocklist']})
 await suite(browser,web+'/?desktop=1&engine=classic&testSession=sharing-qa','classic')
 if(existsSync(nativeBin))await suite(browser,web+'/?desktop=1&engine=clothcraft&testSession=sharing-qa','native')
 assert.deepEqual(pageErrors,[],'Browser runtime errors')
 console.log(JSON.stringify({pass:true,output,checks,pageErrors},null,2))
}catch(error){console.error(JSON.stringify({pass:false,error:error.stack,output,checks,pageErrors,log:log.slice(-8)},null,2));process.exitCode=1}
finally{await browser?.close().catch(()=>{});for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}}
