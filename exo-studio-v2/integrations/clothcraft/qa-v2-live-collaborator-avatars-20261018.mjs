// Multi-designer QA against an isolated running EXO V2 Vite + local bridge.
// EXO_LIVE_QA_URL=http://127.0.0.1:5189 EXO_LIVE_QA_BRIDGE=http://127.0.0.1:5291 node ...
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_LIVE_QA_URL||'http://127.0.0.1:5189'
const bridge=process.env.EXO_LIVE_QA_BRIDGE||'http://127.0.0.1:5291'
const checks=[],errors=[]
const provisioned=[]
let browser
async function api(method,path,body,key){
  const response=await fetch(bridge+path,{method,headers:{Origin:ui,...(key?{Authorization:`Bearer ${key}`}:{}) ,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json()
  assert(response.ok&&data.ok,`${method} ${path}: ${response.status} ${JSON.stringify(data)}`)
  return data
}
async function key(name){
  const result=await api('POST','/agent/v1/keys',{name,scopes:['read','edit'],expiresInDays:1})
  provisioned.push(result.id)
  return result.key
}
async function tab(name,credential){
  const ctx=await browser.newContext({viewport:{width:1440,height:950}})
  await ctx.addInitScript(({token,origin})=>{if(location.origin===origin)localStorage.setItem('exo.clothcraft.collaboration.agentKey.v1',token)},{token:credential,origin:ui})
  const page=await ctx.newPage()
  page.on('pageerror',error=>errors.push(`${name}: ${error.message}`))
  await page.goto(ui+'/?desktop=1&engine=legacy&testSession=two-designer-presence',{waitUntil:'domcontentloaded',timeout:30000})
  await page.getByRole('button',{name:'Open Sharing workspace'}).waitFor({timeout:30000})
  return {ctx,page}
}
async function selectProject(page,projectName){
  await page.getByRole('button',{name:'Open Sharing workspace'}).click()
  await page.getByRole('combobox',{name:'Choose shared project'}).selectOption({label:projectName})
}
try{
  const alice=await key('Live presence QA designer A'),bob=await key('Live presence QA designer B')
  await api('PUT','/collab/v1/me',{displayName:'Designer Alice',bio:''},alice)
  await api('PUT','/collab/v1/me',{displayName:'Designer Bob',bio:''},bob)
  const team=(await api('POST','/collab/v1/teams',{name:'Live Avatar QA Team'},alice)).team
  const project=(await api('POST','/collab/v1/projects',{teamId:team.id,name:'Live Avatar QA Garment'},alice)).project
  const invite=await api('POST','/collab/v1/shares',{targetType:'project',targetId:project.id,email:'bob@example.test',permission:'editor'},alice)
  await api('POST','/collab/v1/shares/redeem',{inviteToken:invite.inviteToken},bob)
  checks.push('two independent authenticated designers have access to the same project')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const a=await tab('Alice',alice),b=await tab('Bob',bob)
  const header=a.page.locator('.clo-mac-menu > .exo-collab-header')
  assert(await header.getByRole('button',{name:'Open designer profile'}).isVisible())
  assert(await header.getByRole('button',{name:'Open Sharing workspace'}).isVisible())
  assert(await header.getByRole('button',{name:/People in this project/}).isVisible())
  checks.push('top-right Share, designer avatar and people controls always visible')

  await selectProject(a.page,project.name)
  await a.page.getByRole('button',{name:'People in this project: 1 online'}).waitFor({timeout:20000})
  checks.push('opening shared project automatically joins presence room')
  await selectProject(b.page,project.name)
  await a.page.getByRole('button',{name:'People in this project: 2 online'}).waitFor({timeout:20000})
  await a.page.locator('.exo-collab-presence .exo-collab-avatar[title^="Designer Bob"]').waitFor({timeout:10000})
  await b.page.locator('.exo-collab-presence .exo-collab-avatar[title^="Designer Alice"]').waitFor({timeout:10000})
  checks.push('both browser sessions display live collaborator profile icons')

  await header.getByRole('button',{name:'People in this project: 2 online'}).click()
  await a.page.getByRole('dialog',{name:'People in this project'}).getByText('Designer Bob').waitFor()
  await a.page.getByRole('dialog',{name:'People in this project'}).getByText('Online',{exact:true}).first().waitFor()
  checks.push('people menu differentiates who is online in the same project')
  await a.page.getByRole('button',{name:'Open designer profile'}).click()
  await a.page.getByRole('dialog',{name:'Designer profile'}).getByRole('textbox',{name:'Profile display name'}).waitFor()
  checks.push('top-right personal profile icon opens editable profile settings')
  await b.page.goto('about:blank')
  await a.page.getByRole('button',{name:'People in this project: 1 online'}).waitFor({timeout:20000})
  assert.equal(await a.page.locator('.exo-collab-presence .exo-collab-avatar[title^="Designer Bob"]').count(),0)
  checks.push('closing one designer session removes avatar live, without reload')
  assert.deepEqual(errors,[],'No uncaught browser page errors')
  await a.ctx.close();await b.ctx.close()
  console.log(JSON.stringify({pass:true,checks,errors:0}))
}finally{
  await browser?.close()
  for(const id of provisioned)await fetch(bridge+'/agent/v1/keys/'+id,{method:'DELETE',headers:{Origin:ui}}).catch(()=>{})
}
