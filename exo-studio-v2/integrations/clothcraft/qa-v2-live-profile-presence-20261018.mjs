// Live two-designer browser acceptance for the header profile, Share button,
// and per-project presence (including exit without waiting for a TTL).
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {createCollaborationApi} from './collaboration.mjs'
import {createDefaultProject} from '../../src/data/defaultProject.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const base='http://127.0.0.1:5184',origin=base,output=fs.mkdtempSync(path.join(os.tmpdir(),'clothcraft-presence-'))
const api=createCollaborationApi({directory:output,authenticate:async token=>['alice','bob'].includes(token)?{userId:token}:null,allowOrigin:url=>url===origin})
const backend=http.createServer((req,res)=>api.handle(req,res).then(handled=>{if(!handled){res.writeHead(404);res.end()}}))
await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve))
const endpoint=`http://127.0.0.1:${backend.address().port}`
const vite=spawn(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5184','--strictPort'],{
  cwd:root,env:{...process.env,VITE_CLOTHCRAFT_BRIDGE_URL:endpoint},stdio:['ignore','pipe','pipe'],detached:true,
})
let browser
let alice,bob
const errors=[],checks=[]
async function request(method,resource,user,data){
  const response=await fetch(endpoint+'/collab/v1'+resource,{method,headers:{Authorization:`Bearer ${user}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})})
  const body=await response.json();assert.equal(body.ok,true,`${method} ${resource}: ${JSON.stringify(body)}`)
  return body
}
async function start(user){
  const context=await browser.newContext({viewport:{width:1680,height:1030}})
  await context.addInitScript(({user})=>{if(location.protocol==='http:')localStorage.setItem('exo.clothcraft.collaboration.agentKey.v1',user)},{user})
  const page=await context.newPage()
  page.on('pageerror',error=>errors.push(`${user}: ${error.message}`))
  await page.goto(base+'/?desktop=1&engine=legacy&qa=live-presence-20261018',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open designer profile'}).waitFor({timeout:30000})
  await page.getByRole('button',{name:'Open Sharing workspace'}).waitFor()
  await page.getByRole('button',{name:'File',exact:true}).first().click()
  await page.getByRole('menuitem',{name:'Open & Save'}).click()
  await page.getByRole('menuitem',{name:'Open File Library…'}).click()
  await page.locator('.exo-files').waitFor({timeout:15000})
  await page.getByText('Shared fitting sample',{exact:true}).first().click()
  await page.getByRole('button',{name:'Open project'}).click()
  await page.locator('.exo-files').waitFor({state:'detached',timeout:15000})
  await page.getByRole('button',{name:/People in this project: [12] online/}).waitFor({timeout:15000})
  return {context,page}
}
try {
  for(let i=0;i<100;i++) {try {if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break} catch{} await sleep(200)}
  await request('PUT','/me','alice',{displayName:'Alice Designer'})
  await request('PUT','/me','bob',{displayName:'Bob Designer'})
  const team=(await request('POST','/teams','alice',{name:'Garment Team'})).team
  const project=(await request('POST','/projects','alice',{teamId:team.id,name:'Shared fitting sample'})).project
  await request('POST',`/projects/${project.id}/members`,'alice',{userId:'bob',role:'editor'})
  const document=createDefaultProject()
  await request('PUT',`/projects/${project.id}/snapshot`,'alice',{expectedRevision:0,snapshot:{name:document.name,snapshotFormat:'legacy',project:document}})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  alice=await start('alice')
  await alice.page.getByRole('button',{name:'People in this project: 1 online'}).waitFor({timeout:10000})
  checks.push('Alice opens shared garment: top-right profile, Share and 1 online')
  bob=await start('bob')
  await alice.page.getByRole('button',{name:'People in this project: 2 online'}).waitFor({timeout:8000})
  assert.equal(await alice.page.locator('.exo-collab-people-trigger .exo-collab-avatar[title^="Bob Designer"]').count(),1)
  checks.push('Bob opens same garment: avatar appears live in Alice header')
  await alice.page.getByRole('button',{name:'People in this project: 2 online'}).click()
  await alice.page.getByRole('dialog',{name:'People in this project'}).getByText('Bob Designer').waitFor()
  checks.push('People popover displays both designer identities')
  await bob.page.goto('about:blank')
  await alice.page.getByRole('button',{name:'People in this project: 1 online'}).waitFor({timeout:8000})
  assert.equal(await alice.page.locator('.exo-collab-people-trigger .exo-collab-avatar[title^="Bob Designer"]').count(),0)
  checks.push('Bob closes document: Bob avatar disappears immediately')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,checks,errors:0}))
}finally{
  await bob?.context.close().catch(()=>{})
  await alice?.context.close().catch(()=>{})
  await browser?.close().catch(()=>{})
  vite.kill('SIGINT')
  await new Promise(resolve=>{if(vite.exitCode!==null||vite.signalCode!==null)return resolve();vite.once('exit',resolve);setTimeout(resolve,2000)})
  api.close();await new Promise(resolve=>backend.close(resolve))
  fs.rmSync(output,{recursive:true,force:true})
}
