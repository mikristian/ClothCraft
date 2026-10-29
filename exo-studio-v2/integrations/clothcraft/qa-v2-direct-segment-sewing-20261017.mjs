// Disposable native-Rust browser acceptance of CLO Segment Sewing.
// Confirms that two actual 2D boundary clicks sew immediately, without a popup.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=mkdtempSync(path.join(tmpdir(),'exo-segment-direct-'))
mkdirSync(path.join(dir,'workspace'),{recursive:true})
const nativePort=6800+Math.floor(Math.random()*120),uiPort=nativePort+170
const api='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const children=[],sent=[],responses=[],errors=[]
function start(command,args,env={}){
 const child=spawn(command,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 children.push(child)
}
async function ready(url){
 for(let i=0;i<120;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1100)})).ok)return}catch{}await sleep(250)}
 throw Error('Fixture unavailable: '+url)
}
async function snapshot(){
 const response=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
 const payload=await response.json()
 assert(payload.ok,'Rust snapshot failed: '+payload.error)
 return payload.data
}
function edgeLength(s,panel,edge){
 const range=s.panels.find(p=>p.id===panel)
 const indices=range?.boundaries?.[edge]||[]
 let length=0
 for(let i=1;i<indices.length;i++){
  const a=s.uv[indices[i-1]],b=s.uv[indices[i]]
  if(a&&b)length+=Math.hypot(a[0]-b[0],a[1]-b[1])
 }
 return length
}
async function midpoint(page,key){
 return page.locator('[data-segment-sew-candidate="true"]').evaluateAll((nodes,key)=>{
  const el=nodes.find(node=>node.getAttribute('data-edge')===key)
  if(!el||el.points.numberOfItems<2)return null
  const p=el.points.getItem(Math.floor((el.points.numberOfItems-1)/2))
  const q=el.points.getItem(Math.floor((el.points.numberOfItems-1)/2)+1)
  const pt=el.ownerSVGElement.createSVGPoint();pt.x=(p.x+q.x)/2;pt.y=(p.y+q.y)/2
  const screen=pt.matrixTransform(el.getScreenCTM())
  return {x:screen.x,y:screen.y}
 },key)
}
let browser
try{
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:dir,
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
 })
 start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:api})
 await Promise.all([ready(api+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const page=await browser.newPage({viewport:{width:1680,height:1060}})
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  let request={}
  try{request=route.request().postDataJSON()}catch{}
  sent.push(request)
  const response=await route.fetch({url:api+'/workspace',headers})
  try{const r=await response.json();responses.push({request,ok:r.ok,error:r.error,body:r.data})}catch{}
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 const before=await snapshot()
 const linked=new Set((before.template?.seams||[]).flatMap(seam=>[seam.a,seam.b]
  .filter(Boolean).map(b=>b.panel+':'+b.edge)))
 const keys=[...new Set(await page.locator('.cc-board [data-edge]').evaluateAll(nodes=>nodes.map(el=>el.dataset.edge)))]
  .filter(key=>!linked.has(key)&&key.split(':').length===2)
 const candidates=keys.map(key=>{
  const [panel,edge]=key.split(':');return {key,panel,edge,length:edgeLength(before,panel,edge)}
 }).filter(x=>x.length>.03)
 let pair
 for(let i=0;i<candidates.length&&!pair;i++)for(let j=i+1;j<candidates.length;j++){
  if(candidates[i].panel!==candidates[j].panel &&
    Math.abs(candidates[i].length-candidates[j].length)<.008){pair=[candidates[i],candidates[j]];break}
 }
 assert(pair,'No two unsewn edges with compatible native lengths: '+JSON.stringify(candidates))
 const button=page.locator('[data-clo-slot="2d:B02"]')
 await button.click()
 const board=page.locator('.cc-board')
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
 assert.equal(await button.getAttribute('aria-pressed'),'true','Segment Sewing button should be highlighted')
 assert.equal(await page.locator('[data-native-sewing-panel="true"]').count(),0,'No seam popup for Segment Sewing')
 // SVG icons inside the tool chrome precede the physical pattern canvas.
 const cursor=await board.locator('svg[aria-label^="Metric 2D pattern board"]').evaluate(el=>getComputedStyle(el).cursor)
 assert.match(cursor,/sewing-machine\.svg/,'SVG sewing-machine cursor must be active')
 assert.equal((await page.request.get(ui+'/cursors/sewing-machine.svg')).status(),200)
 assert((await page.locator('[data-segment-sew-candidate="true"]').count())>8,'Eligible edges should be marked')
 const first=await midpoint(page,pair[0].key)
 assert(first,'Cannot locate first actual seam edge')
 await page.mouse.move(first.x,first.y)
 await page.waitForFunction(key=>document.querySelector('[data-sew-edge-state="hover"]')!=null,pair[0].key,{timeout:4500})
 await page.mouse.click(first.x,first.y)
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewStage==='second')
 assert.equal(await page.locator('[data-sew-edge-state="first"]').count()>0,true)
 assert.match(await page.locator('[data-native-sewing-tool-dock]').innerText(),/Select second boundary/)
 // QA image is disposable; never overwrite a user's existing reference screenshot.
 const shot=path.join(dir,'exo-v2-direct-segment-sewing-qa.png')
 await page.screenshot({path:shot})
 const second=await midpoint(page,pair[1].key)
 assert(second,'Cannot locate second actual seam edge')
 await page.mouse.click(second.x,second.y)
 let after=before
 for(let i=0;i<70;i++){
  await sleep(170)
  const changed=responses.filter(r=>r.request?.command?.kind==='Sew'&&r.ok).at(-1)
  if(changed){after=changed.body;break}
 }
 assert.equal(after.template.seams.length,before.template.seams.length+1,
  'Second sewing-edge click must submit and persist Rust Sew automatically: '+JSON.stringify(responses.filter(r=>r.request?.command?.kind==='Sew').map(r=>r.error)))
 const newlySewn=after.template.seams.find(s=>!before.template.seams.some(old=>old.id===s.id))
 assert(newlySewn?.id,'Exactly one named native seam must be newly authored')
 await page.waitForFunction(id=>document.querySelector('.cc-board')?.dataset.selectedNativeSeam===id,
  newlySewn.id,{timeout:10000})
 const edit=sent.filter(r=>r.command?.kind==='Sew').at(-1)
 assert.deepEqual(edit.command.a.range,[0,1])
 assert.deepEqual(edit.command.b.range,[0,1])
 assert.equal(edit.command.a.panel,pair[0].panel)
 assert.equal(edit.command.b.panel,pair[1].panel)
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewStage==='first')
 assert.equal(await page.locator('[data-native-sewing-panel="true"]').count(),0)
 // Free Sewing has its own direct fractional selection flow without a popup.
 await page.locator('[data-clo-slot="2d:B03"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 assert.equal(await board.getAttribute('data-segment-sewing'),'false')
 assert.equal(await page.locator('[data-native-sewing-panel="true"]').count(),0)
 assert.match(await page.locator('[data-native-sewing-tool-dock]').innerText(),/Click start of first boundary/)
 assert.equal(await page.getByRole('checkbox',{name:'Allow Free Sewing easing'}).isChecked(),false,
  'Easing must remain explicit until user approves mismatched sewing lengths')
 // Native Undo / Redo must restore the SAME authored correspondence. This is
 // an isolated disposable Rust session; do not mutate any user garment file.
 const nativeAction=async(op,revision)=>{
  const response=await page.request.post(api+'/workspace',{
   data:{op,revision},headers:{'Content-Type':'application/json'}})
  const payload=await response.json()
  assert(payload.ok,op+' failed: '+payload.error)
  return payload.data
 }
 const undone=await nativeAction('undo',after.revision)
 assert.equal(undone.template.seams.length,before.template.seams.length,'Undo must remove only the new sewing relationship')
 const redone=await nativeAction('redo',undone.revision)
 assert.equal(redone.template.seams.length,after.template.seams.length,'Redo must restore the same sewing relationship')
 assert.deepEqual(redone.template.seams.at(-1),after.template.seams.at(-1),'Redo must preserve authored ranges and settings')
 assert.deepEqual(errors,[],'Browser errors')
 console.log(JSON.stringify({pass:true,initialSeams:before.template.seams.length,newSeams:after.template.seams.length,
  edges:pair.map(x=>({key:x.key,lengthCm:+(x.length*100).toFixed(1)})),noPopup:true,
  blueActive:true,hoverHighlight:true,sewingMachineCursor:true,autoCommit:true,freeSewIntact:true,
  nativeUndoRedo:true,
  requests:sent.length,errors,screenshot:shot},null,2))
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
