// Disposable end-to-end Free Sewing acceptance: four pointer picks create a
// real Rust seam using exact cutline fractions, with no sewing popup.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'
import {projectFreeSewingPoint,freeSewingPointAtFraction,freeSewingRangePoints} from '../../src/core/freeSewingGeometry.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=mkdtempSync(path.join(tmpdir(),'exo-free-direct-'))
mkdirSync(path.join(dir,'workspace'),{recursive:true})
const port=6920+Math.floor(Math.random()*70),api='http://127.0.0.1:'+port,
  ui=process.env.EXO_QA_UI_URL||'http://127.0.0.1:'+(port+150),
  children=[],requests=[],responses=[],errors=[]
function launch(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<125;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1100)})).ok)return}catch{}
  await sleep(200)
 }
 throw Error('Fixture not available: '+url)
}
async function snapshot(){
 const result=await fetch(api+'/workspace',{method:'POST',
  headers:{'Content-Type':'application/json'},body:'{"op":"snapshot"}'}).then(r=>r.json())
 assert(result.ok,result.error)
 return result.data
}
async function screenAt(page,key,fraction){
 return page.locator('.cc-board [data-free-sew-candidate="true"]').evaluateAll((nodes,{key,fraction})=>{
  const path=nodes.find(node=>node.dataset.edge===key)
  if(!path||path.points.numberOfItems<2)return null
  const points=Array.from({length:path.points.numberOfItems},(_,i)=>path.points.getItem(i))
  const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)
  let walked=0
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.y-a.y)
   if(walked+len>=fraction*length||i===points.length-1){
    const t=Math.max(0,Math.min(1,(fraction*length-walked)/(len||1)))
    const q=path.ownerSVGElement.createSVGPoint()
    q.x=a.x+(b.x-a.x)*t;q.y=a.y+(b.y-a.y)*t
    const screen=q.matrixTransform(path.getScreenCTM())
    return {x:screen.x,y:screen.y}
   }
   walked+=len
  }
  return null
 },{key,fraction})
}
let browser
try{
 const geoPoints=[[0,0],[.1,0],[.1,.15]]
 const sample=projectFreeSewingPoint([0,1,2],geoPoints,[.1,.075])
 assert(Math.abs(sample.fraction-.7)<1e-6,'Arc length fractions must follow full edge')
 assert(Math.abs(freeSewingPointAtFraction([0,1,2],geoPoints,.7)[1]-.075)<1e-6)
 assert(freeSewingRangePoints([0,1,2],geoPoints,.2,.8).length>=3)
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:dir,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:process.env.EXO_QA_NATIVE_BINARY||
    path.join(root,'research/oss/clothcraft/target/debug/exo-session'),EXO_CLOTHCRAFT_GPU:'0'
 })
 if(!process.env.EXO_QA_UI_URL)
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+150),'--strictPort'],
   {VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1680,height:1060}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  let input={};try{input=route.request().postDataJSON()}catch{}
  requests.push(input)
  const response=await route.fetch({url:api+'/workspace',headers})
  try{const data=await response.json();responses.push({input,ok:data.ok,error:data.error,body:data.data})}catch{}
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:40000})
 const before=await snapshot()
 const linked=new Set(before.template.seams.flatMap(s=>[s.a,s.b]
  .filter(Boolean).map(b=>b.panel+':'+b.edge)))
 const candidates=[...new Set(await page.locator('.cc-board [data-edge]').evaluateAll(nodes=>nodes.map(n=>n.dataset.edge)))]
  .filter(key=>!linked.has(key)&&key.split(':').length===2)
 const length=key=>{
  const [panel,edge]=key.split(':')
  const ids=before.panels.find(p=>p.id===panel)?.boundaries?.[edge]||[]
  return ids.slice(1).reduce((sum,id,i)=>{
   const a=before.uv[ids[i]],b=before.uv[id]
   return sum+(a&&b?Math.hypot(a[0]-b[0],a[1]-b[1]):0)
  },0)
 }
 const pair=[]
 for(const a of candidates)for(const b of candidates){
  if(pair.length)break
  if(a.split(':')[0]!==b.split(':')[0]&&length(a)>.045&&Math.abs(length(a)-length(b))<.002)
   pair.push(a,b)
 }
 assert.equal(pair.length,2,'No compatible unsown native boundary pair')
 const free=page.locator('[data-clo-slot="2d:B03"]')
 await free.click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 assert.equal(await free.getAttribute('aria-pressed'),'true')
 assert.equal(await page.locator('[data-native-sewing-panel]').count(),0)
 assert.match(await page.locator('.cc-board svg[aria-label^="Metric 2D pattern board"]').evaluate(el=>getComputedStyle(el).cursor),/sewing-machine\.svg/)
 const allowEase=page.getByRole('checkbox',{name:'Allow Free Sewing easing'})
 assert.equal(await allowEase.isChecked(),false,'Easing must begin disabled')
 await allowEase.check()
 assert.equal((await page.request.get(ui+'/cursors/sewing-machine.svg')).status(),200)
 const steps=[[pair[0],.2],[pair[0],.8],[pair[1],.2],[pair[1],.8]]
 for(let i=0;i<steps.length;i++){
  const [key,t]=steps[i]
  const p=await screenAt(page,key,t)
  assert(p,'Could not project '+key+' at '+t)
  await page.mouse.move(p.x,p.y)
  if(i===0)assert.equal(await page.locator('[data-sew-edge-state="hover"]').count()>0,true)
  await page.mouse.click(p.x,p.y)
  if(i<3){
   await page.waitForFunction(expected=>document.querySelector('.cc-board')?.dataset.freeSewStage===String(expected),i+1)
   assert.equal(await page.locator('[data-native-sewing-panel]').count(),0)
   assert.equal(await page.locator('[data-free-sew-marker]').count(),i+1)
  }
  if(i===1){
   const selected=page.locator('[data-free-sew-selected-range="confirmed"]')
   await selected.waitFor({state:'visible'})
   assert.equal(await selected.count(),1,'First fractional portion must highlight visibly')
   const range=[Number(await selected.getAttribute('data-range-start')),Number(await selected.getAttribute('data-range-end'))]
   assert(range[0]>.15&&range[0]<.27&&range[1]>.73&&range[1]<.87,'Visual range fractions '+range)
   await page.screenshot({path:path.join(dir,'exo-v2-free-sewing-direct-range-qa.png')})
  }
 }
 let after=before
 for(let i=0;i<80;i++){
  await sleep(150)
  const success=responses.find(r=>r.input?.command?.kind==='Sew'&&r.ok)
  if(success){after=success.body;break}
 }
 assert.equal(after.template.seams.length,before.template.seams.length+1,
  'Native free seam not created: '+JSON.stringify(responses.filter(r=>r.input?.command?.kind==='Sew').map(r=>r.error)))
 const newlySewn=after.template.seams.find(s=>!before.template.seams.some(old=>old.id===s.id))
 assert(newlySewn?.id,'A real named partial seam must be newly authored')
 await page.waitForFunction(id=>document.querySelector('.cc-board')?.dataset.selectedNativeSeam===id,
  newlySewn.id,{timeout:10000})
 const sew=requests.find(r=>r.command?.kind==='Sew').command
 for(const side of [sew.a,sew.b]){
  assert(side.range[0]>.15&&side.range[0]<.27,JSON.stringify(side.range))
  assert(side.range[1]>.73&&side.range[1]<.87,JSON.stringify(side.range))
 }
 assert.equal(sew.reverse,false,'Matched drawing direction must preserve second-edge orientation')
 assert.equal(sew.ease,true,'Visible Free Sewing easing toggle must reach Rust')
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewStage==='0')
 await page.locator('[data-clo-slot="2d:B02"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
 assert.equal(await page.locator('[data-native-sewing-panel]').count(),0)
 await page.locator('[data-clo-slot="2d:B03"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 assert.equal(await page.locator('.cc-board').getAttribute('data-free-sew-stage'),'0')
 assert.deepEqual(errors,[],'No browser errors')
 console.log(JSON.stringify({pass:true,beforeSeams:before.template.seams.length,
  afterSeams:after.template.seams.length,edges:pair,ranges:[sew.a.range,sew.b.range],
  noPopup:true,sewingMachineCursor:true,highlight:true,clickedPoints:4,
  automaticNativeCommit:true,toolSwitch:true,errors},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
