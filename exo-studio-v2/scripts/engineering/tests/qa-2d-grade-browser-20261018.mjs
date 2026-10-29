// Real browser + live native interaction, with its own disposable Rust
// workspace. The production 5385 bridge and saved fitting project are untouched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {chromium} from 'playwright-core'

const root=path.resolve(import.meta.dirname,'../../..')
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'exo-grade-browser-'))
const listener=net.createServer()
const port=await new Promise((resolve,reject)=>{
  listener.once('error',reject)
  listener.listen(0,'127.0.0.1',()=>{
    const port=listener.address().port
    listener.close(()=>resolve(port))
  })
})
const bridge='http://127.0.0.1:'+port
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,
  env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),
    EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')},
  stdio:['ignore','pipe','pipe'],
})
let log=''
child.stderr.on('data',bytes=>{log=(log+bytes).slice(-1800)})
child.stdout.on('data',bytes=>{log=(log+bytes).slice(-1800)})
let browser
const native=async data=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(data),
    signal:AbortSignal.timeout(30000)})
  const answer=await response.json()
  assert.equal(response.ok&&answer.ok,true,answer.error||'Native document edit failed')
  return answer.data
}
const until=async (fn,label)=>{
  for(let i=0;i<80;i++){
    try{const value=await fn();if(value)return value}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Timed out: '+label+' '+log)
}
try{
  await until(async()=>{const reply=await fetch(bridge+'/health');return reply.ok},'private bridge')
  const initial=await native({op:'snapshot'})
  const saved=await native({op:'save'})
  const standalone={...saved.project,template:{...saved.project.template,seams:[]},
    state:null,mesh_signature:null}
  await native({op:'open',project:standalone})
  const before=await native({op:'snapshot'})
  const id=before.template.panels[0].id
  assert.ok(before.template.panels[0].polygon,'Fixture must be editable native polygon')
  browser=await chromium.launch({headless:true,
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  let bridged=false
  await page.route(/\/assets\/index-[^/]+\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch()
    const old=await response.text()
    bridged ||= old.includes('http://127.0.0.1:5385')
    await route.fulfill({response,body:old.replaceAll('http://127.0.0.1:5385',bridge)})
  })
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&qa=isolated-2d-grade',
    {waitUntil:'domcontentloaded',timeout:45000})
  await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
  assert.equal(bridged,true,'Web interface must route to private native fixture')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent(
    'exo-clothcraft-toolbar-activated',{detail:{nativeAction:'pattern2d.editGrading'}})))
  const dialog=page.locator('[data-native-grade-pattern="true"]')
  await dialog.waitFor({state:'visible',timeout:10000})
  await page.getByLabel('Pattern to grade').selectOption(id)
  await page.getByLabel('Grade width delta millimetres').fill('25')
  await page.getByLabel('Grade height delta millimetres').fill('17')
  await page.locator('[data-native-grade-apply="true"]').click()
  const updated=await until(async()=>{
    const result=await native({op:'snapshot'})
    return result.revision>before.revision?result:null
  },'native grade commit')
  assert.deepEqual(updated.template.panels.map(panel=>panel.id),
    before.template.panels.map(panel=>panel.id))
  assert.equal(updated.template.seams.length,0)
  assert.ok(page.locator('.cc-board [data-panel]').first())
  await page.keyboard.press('Meta+z')
  const undone=await until(async()=>{
    const result=await native({op:'snapshot'})
    return result.canRedo&&result.template.panels[0].pattern.width===
      before.template.panels[0].pattern.width?result:null
  },'single transaction undo')
  await page.keyboard.press('Meta+Shift+z')
  await until(async()=>{
    const result=await native({op:'snapshot'})
    return result.template.panels[0].pattern.width===
      updated.template.panels[0].pattern.width?result:null
  },'single transaction redo')
  assert.equal(errors.length,0,'Native UI generated browser errors')
  const persisted=await native({op:'save'})
  assert.deepEqual(persisted.project.template.panels.map(panel=>panel.id),
    updated.template.panels.map(panel=>panel.id))
  console.log(JSON.stringify({pass:true,realBrowser:true,changedPanel:id,
    initialRevision:before.revision,finalRevision:updated.revision,undoRedo:true,
    saved:true,rendered2d:await page.locator('.cc-board [data-panel]').count(),
    pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  child.kill('SIGTERM')
  fs.rmSync(scratch,{recursive:true,force:true})
}
