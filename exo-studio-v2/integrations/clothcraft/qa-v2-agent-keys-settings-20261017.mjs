// Installed V2 Settings -> real isolated key server. Exercises browser form,
// one-time reveal, list/revoke without leaving a test key in the user's store.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output=fs.mkdtempSync(path.join(os.tmpdir(),'clothcraft-keys-ui-'))
const ui='http://127.0.0.1:5386'
let child=null,browser=null
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})})
const api=`http://127.0.0.1:${port}`
try{
  child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,
    env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output},stdio:'ignore'})
  let ready=false
  for(let n=0;n<40;n++){
    try{const response=await fetch(api+'/health',{signal:AbortSignal.timeout(350)});if(response.ok){ready=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,120))
  }
  assert(ready,'Isolated API server did not start')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1510,height:940}})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route(/^http:\/\/127\.0\.0\.1:5385\/agent\/v1\/keys(?:\/[^?]*)?(?:\?.*)?$/,async route=>{
    const req=route.request(),url=new URL(req.url())
    const options={method:req.method(),headers:{Origin:ui,Accept:'application/json',...(req.method()==='POST'?{'Content-Type':'application/json'}:{})},
      ...(req.method()==='POST'?{body:req.postData()||''}:{})}
    const remote=await fetch(api+url.pathname,options)
    await route.fulfill({status:remote.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':ui},body:await remote.text()})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=api-key-ui-test',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open Studio Settings'}).waitFor({timeout:40000})
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-cloApi').click()
  await page.getByRole('heading',{name:'API keys'}).waitFor()
  await page.getByText('No API keys created yet.').waitFor({timeout:10000})
  await page.getByRole('textbox',{name:'Key name'}).fill('Isolated pattern agent QA')
  await page.getByRole('checkbox',{name:'Edit garments and projects'}).check()
  assert.equal(await page.getByRole('checkbox',{name:'Read workspace'}).isDisabled(),true)
  await page.getByLabel('Expires after').selectOption('7')
  await page.getByRole('button',{name:'Create API key'}).click()
  await page.getByRole('region',{name:'New API key'}).waitFor({timeout:10000})
  const once=await page.getByRole('textbox',{name:'New API key secret'}).inputValue()
  assert(once.startsWith('cck_')&&once.length>=42)
  await page.getByText('Isolated pattern agent QA').waitFor()
  const list=await(await fetch(api+'/agent/v1/keys',{headers:{Origin:ui}})).json()
  assert.equal(list.keys.length,1)
  assert(!JSON.stringify(list.keys).includes(once))
  await page.getByRole('button',{name:'Conceal'}).click()
  assert.equal(await page.getByRole('textbox',{name:'New API key secret'}).count(),0)
  await page.getByRole('button',{name:'Revoke Isolated pattern agent QA'}).click()
  await page.getByText('Revoked',{exact:true}).first().waitFor({timeout:10000})
  const denied=await fetch(api+'/agent/v1/status',{headers:{Authorization:`Bearer ${once}`}})
  assert.equal(denied.status,401)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,settingsKeyCreated:true,secretShownOnce:true,revealConceal:true,
    readScopeRequired:true,keyListRedacted:true,revokedFromUI:true,revokedTokenDenied:true,pageErrors:errors.length}))
}finally{
  await browser?.close()
  if(child&&child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,1500))])}
  fs.rmSync(output,{recursive:true,force:true})
}
