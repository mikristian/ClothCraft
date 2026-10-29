// Disposable native Chromium smoke: grouped Segment Sewing through real 2D clicks.
// Runs one exclusive UI fixture on 5188 with a random isolated Rust API port.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import net from 'node:net'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.resolve(process.env.EXO_SEWING_SESSION_BIN||process.env.EXO_CLOTHCRAFT_SESSION_BIN||
  path.join(root,'research/oss/clothcraft/target/debug/exo-session'))
assert(existsSync(binary),`Updated native session binary missing: ${binary}`)
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-grouped-sewing-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const uiPort=5188,ui=`http://127.0.0.1:${uiPort}`
const children=[],requests=[],replies=[],errors=[]
const ensureFree=port=>new Promise((resolve,reject)=>{
  const server=net.createServer();server.once('error',reject)
  server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(server.address()?.port||port)))
})
async function randomPort(){
  const server=net.createServer()
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{
    const port=server.address().port;server.close(()=>resolve(port))
  })})
}
function start(command,args,env={}){
  const child=spawn(command,args,{cwd:root,stdio:'ignore',detached:true,env:{...process.env,...env}})
  children.push(child)
}
async function ready(url){
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error(`Disposable fixture not ready: ${url}`)
}
async function midpoint(page,key){
  return page.locator('[data-segment-sew-candidate="true"]').evaluateAll((nodes,edgeKey)=>{
    const node=nodes.find(el=>el.dataset.edge===edgeKey)
    if(!node||node.points.numberOfItems<2)return null
    const i=Math.floor((node.points.numberOfItems-1)/2),a=node.points.getItem(i),b=node.points.getItem(i+1)
    const point=node.ownerSVGElement.createSVGPoint()
    point.x=(a.x+b.x)/2;point.y=(a.y+b.y)/2
    const screen=point.matrixTransform(node.getScreenCTM())
    return {x:screen.x,y:screen.y}
  },key)
}
const seamIds=snapshot=>new Set(snapshot.template.seams.map(seam=>seam.id))
let browser,nativePort,api,stage='initial',report={pass:false}
try{
  await ensureFree(uiPort)
  nativePort=await randomPort()
  await ensureFree(nativePort)
  api=`http://127.0.0.1:${nativePort}`
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0',
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([ready(`${api}/health`),ready(ui)])
  const native=async body=>{
    const response=await fetch(`${api}/workspace`,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(body)})
    const result=await response.json()
    assert(result.ok,`${body.op} failed: ${result.error}`)
    return result.data
  }
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1680,height:1060}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const request=route.request().postDataJSON();requests.push(request)
    const response=await route.fetch({url:`${api}/workspace`,headers})
    const result=await response.json().catch(()=>null)
    replies.push({request,ok:result?.ok,error:result?.error,data:result?.data})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
  const before=await native({op:'snapshot'})
  assert.equal(before.template.seams.length,8,'Unexpected preset baseline sewing inventory')
  const tool=page.locator('[data-clo-slot="2d:B02"]')
  await tool.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
  const dock=page.locator('[data-native-sewing-tool-dock]')
  await dock.waitFor({state:'visible'})
  const connection=dock.getByRole('combobox',{name:'Segment sewing connection type'})
  await connection.selectOption('symmetric')
  assert.equal(await connection.inputValue(),'symmetric')
  stage='symmetric-selected'
  const keys=await page.locator('[data-segment-sew-candidate="true"]').evaluateAll(nodes=>
    [...new Set(nodes.map(node=>node.dataset.edge))])
  const sewn=new Set(before.template.seams.flatMap(seam=>[seam.a,seam.b].map(ref=>`${ref.panel}:${ref.edge}`)))
  const available=keys.filter(key=>!sewn.has(key))
  const groups=[['front:neck-left','back:neck-left'],['front:cuff-left','back:cuff-left'],
    ['front:neck-right','back:neck-right'],['front:cuff-right','back:cuff-right']]
  const target=groups.find(([a,b])=>available.includes(a)&&available.includes(b))
  assert(target,`No symmetric free source pair: ${JSON.stringify(available)}`)
  const first=await midpoint(page,target[0]);assert(first,`Missing 2D pointer target ${target[0]}`)
  await page.mouse.click(first.x,first.y)
  await page.waitForFunction(()=>/1 staged|boundary 2 of 2/i.test(document.querySelector('[data-native-sewing-tool-dock]')?.textContent||''))
  stage='one-group-boundary-staged'
  const second=await midpoint(page,target[1]);assert(second,`Missing 2D pointer target ${target[1]}`)
  await page.mouse.click(second.x,second.y)
  for(let i=0;i<50&&!requests.some(r=>r.command?.kind==='SewSymmetric');i++)await sleep(150)
  const commit=replies.find(r=>r.request?.command?.kind==='SewSymmetric'&&r.ok)
  if(!commit){
    const errorsFromNative=replies.filter(r=>r.request?.command?.kind==='SewSymmetric').map(r=>r.error)
    const message=await page.locator('.cc-error,.cc-notice').allTextContents()
    report={pass:false,stage:'group-preflight-or-commit-blocked',target,groupSelected:true,
      stagedFirst:true,requests:requests.filter(r=>r.command?.kind==='SewSymmetric').length,
      errorsFromNative,messages:message,baselineSeams:before.template.seams.length,
      browserErrors:errors,output}
    assert.deepEqual(errors,[],'Uncaught browser exception')
    console.log(JSON.stringify(report,null,2))
    process.exitCode=1
  }else{
    stage='committed'
    const after=commit.data
    const added=after.template.seams.filter(seam=>!seamIds(before).has(seam.id))
    assert.equal(added.length,2,'Symmetric atomic transaction must produce two relationships')
    assert.equal(after.revision,before.revision+1)
    const ids=added.map(seam=>seam.id)
    await page.waitForFunction(id=>document.querySelector('.cc-board')?.dataset.selectedNativeSeam===id,ids[0],{timeout:12000})
    assert((await page.locator('.cc-notice').allTextContents()).some(text=>/Symmetric sewing: saved 2/.test(text)))
    const undo=await native({op:'undo',revision:after.revision})
    assert.equal(undo.template.seams.length,before.template.seams.length)
    const redo=await native({op:'redo',revision:undo.revision})
    assert.deepEqual(redo.template.seams.filter(seam=>ids.includes(seam.id)),added)
    assert.deepEqual(errors,[],'Uncaught browser exceptions')
    report={pass:true,stage:'native-symmetric-committed',baselineSeams:before.template.seams.length,
      newSeamIds:ids,afterSeams:after.template.seams.length,target,selectedIn2D:true,
      singleRevision:true,nativeUndoRedo:true,browserErrors:errors,requests:requests.length,output}
    console.log(JSON.stringify(report,null,2))
  }
}catch(error){
  console.error(JSON.stringify({pass:false,stage,error:String(error.stack||error),
    browserErrors:errors,requests:requests.filter(r=>r.command?.kind==='SewSymmetric'),output},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
