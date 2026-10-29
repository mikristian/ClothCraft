// Live disposable Rust + Vite + Chrome QA. No production project state is touched.
// Verifies Free Sewing, icon pointers on real tool activations, and cursor reset.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {setTimeout as pause} from 'node:timers/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-v2-cursor-qa-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const bin=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
assert(existsSync(bin),'Native Rust session binary missing')
const port=7700+Math.floor(Math.random()*100),native=`http://127.0.0.1:${port}`,ui=`http://127.0.0.1:${port+105}`
const children=[],errors=[],networkFailures=[],requests=[],report={output,checks:[]}
const run=(file,args,env={})=>{const c=spawn(file,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}});children.push(c)}
const ready=async url=>{for(let i=0;i<125;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1100)})).ok)return}catch{}await pause(220)}throw Error('Service not ready '+url)}
const snapshot=async()=>{const r=await fetch(native+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})});const p=await r.json();assert(p.ok,p.error||'Native snapshot failed');return p.data}
const length=(s,panel,edge)=>{
 const range=s.panels?.find(p=>p.id===panel),ids=range?.boundaries?.[edge]||[];let value=0
 for(let i=1;i<ids.length;i++){const a=s.uv?.[ids[i-1]],b=s.uv?.[ids[i]];if(a&&b)value+=Math.hypot(a[0]-b[0],a[1]-b[1])}
 return value
}
const svgFractionPoint=async(page,key,fraction)=>page.locator('.cc-board [data-free-sew-candidate="true"]').evaluateAll((els,{key,fraction})=>{
 const el=els.find(node=>node.getAttribute('data-edge')===key)
 if(!el||el.points.numberOfItems<2)return null
 let total=0
 for(let i=1;i<el.points.numberOfItems;i++){
  const a=el.points.getItem(i-1),b=el.points.getItem(i);total+=Math.hypot(b.x-a.x,b.y-a.y)
 }
 let distance=fraction*total
 let i=1
 for(;i<el.points.numberOfItems-1;i++){
  const a=el.points.getItem(i-1),b=el.points.getItem(i),segment=Math.hypot(b.x-a.x,b.y-a.y)
  if(distance<=segment)break
  distance-=segment
 }
 const a=el.points.getItem(i-1),b=el.points.getItem(i),segment=Math.hypot(b.x-a.x,b.y-a.y)||1
 const t=Math.max(0,Math.min(1,distance/segment))
 const point=el.ownerSVGElement.createSVGPoint();point.x=a.x+(b.x-a.x)*t;point.y=a.y+(b.y-a.y)*t
 const screen=point.matrixTransform(el.getScreenCTM());return {x:screen.x,y:screen.y}
},{key,fraction})
let browser
try{
 run(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:bin,EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
 })
 run(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port+105),'--strictPort'],
  {VITE_CLOTHCRAFT_BRIDGE_URL:native})
 await Promise.all([ready(native+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const page=await browser.newPage({viewport:{width:1680,height:1040}})
 page.on('pageerror',err=>errors.push(err.message))
 page.on('requestfailed',request=>networkFailures.push(request.url()+' '+request.failure()?.errorText))
 await page.route('**/workspace',async route=>{
  const req=route.request(),headers={...req.headers()};delete headers.origin
  try{requests.push(req.postDataJSON())}catch{}
  const res=await route.fetch({url:native+'/workspace',headers})
  await route.fulfill({response:res,headers:{...res.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=tool-cursors',{waitUntil:'domcontentloaded'})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:50000})
 const board=page.locator('.cc-board'),svg=board.locator('svg').first(),canvas3d=page.locator('.cc-viewport-3d canvas').first()
 const pointer=async locator=>locator.evaluate(el=>getComputedStyle(el).cursor)
 const checkSlot=async(id,target,pattern)=>{
  await page.locator(`[data-clo-slot="${id}"]`).click()
  await page.waitForFunction(({target,pattern})=>{
    const el=document.querySelector(target);return el&&getComputedStyle(el).cursor.includes(pattern)
  },{target,pattern},{timeout:12000})
  const cursor=await pointer(page.locator(target).first())
  report.checks.push({slot:id,cursor})
 }
 // A real sewing machine icon is active on the entire Free Sewing canvas and
 // on the interactive boundaries, with the same highlighted hover target.
 await page.locator('[data-clo-slot="2d:B03"]').click()
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.freeSewing==='true')
 assert.match(await pointer(svg),/sewing-machine\.svg/)
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.cc-viewport-3d canvas')).cursor.includes('sewing-machine.svg'))
 assert.match(await pointer(canvas3d),/sewing-machine\.svg/)
 assert((await board.locator('[data-free-sew-candidate="true"]').count())>8)
 assert.match(await board.locator('[data-free-sew-hint]').innerText(),/Free Sewing/)
 const edge=board.locator('[data-free-sew-candidate="true"]').first()
 assert.match(await pointer(edge),/sewing-machine\.svg/)
 report.checks.push('Free Sewing uses sewing machine pointer in 2D and 3D and highlights real candidate edges')

 const before=await snapshot(),linked=new Set((before.template?.seams||[]).flatMap(seam=>
  [seam.a,seam.b].filter(Boolean).map(boundary=>boundary.panel+':'+boundary.edge)))
 const keys=[...new Set(await board.locator('[data-free-sew-candidate="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.edge)))]
  .filter(key=>!linked.has(key)&&key?.split(':').length===2)
 const candidates=keys.map(key=>{const [panel,edge]=key.split(':');return {key,panel,edge,length:length(before,panel,edge)}}).filter(item=>item.length>.03)
 let pair
 for(let i=0;i<candidates.length&&!pair;i++)for(let j=i+1;j<candidates.length;j++){
  if(candidates[i].panel!==candidates[j].panel&&Math.abs(candidates[i].length-candidates[j].length)<.008){
   pair=[candidates[i],candidates[j]];break
  }
 }
 assert(pair,'No compatible free seam fixture boundaries')
 const first=await svgFractionPoint(page,pair[0].key,.15)
 assert(first,'Missing first free edge fraction')
 await page.mouse.move(first.x,first.y)
 await page.waitForFunction(()=>document.querySelector('[data-sew-edge-state="hover"]')!==null)
 assert.equal(await page.locator('[data-native-sewing-panel]').count(),0,'Free Sewing must work directly on edges')
 for(const [index,key,fraction] of [[1,pair[0].key,.15],[2,pair[0].key,.85],
  [3,pair[1].key,.15],[4,pair[1].key,.85]]){
  const mark=await svgFractionPoint(page,key,fraction)
  assert(mark,'Cannot resolve real clicked boundary fraction '+key)
  await page.mouse.move(mark.x,mark.y)
  await page.mouse.click(mark.x,mark.y)
  if(index<4){
   await page.waitForFunction(n=>document.querySelector('.cc-board')?.dataset.freeSewPointsCount===String(n),index,{timeout:7000})
   report.checks.push(`Free seam point ${index}: ${key} at ${fraction}`)
  }
 }
 let after=before
 for(let i=0;i<60;i++){await pause(160);after=await snapshot();if(after.template.seams.length>before.template.seams.length)break}
 assert.equal(after.template.seams.length,before.template.seams.length+1,'Free partial sewing must author a real Rust seam')
 const nativeSew=requests.filter(req=>req.command?.kind==='Sew').at(-1)
 assert(nativeSew?.command?.a?.range?.[0]>.10&&nativeSew?.command?.a?.range?.[1]<.90,
  'Free seam must author partial edge A range')
 assert(nativeSew?.command?.b?.range?.[0]>.10&&nativeSew?.command?.b?.range?.[1]<.90,
  'Free seam must author partial edge B range')
 report.checks.push({freeSewNative:true,ranges:[nativeSew.command.a.range,nativeSew.command.b.range],
  seamsBefore:before.template.seams.length,seamsAfter:after.template.seams.length,edges:pair.map(i=>i.key)})

 // Every available icon must resolve over HTTP and each tool must actually
 // adopt its own icon, then restore selection's default after changing mode.
 for(const asset of ['sewing-machine','cad-polygon','cad-pen','cad-notch','cad-points','cad-move','cad-brush','cad-measure']){
  const status=(await page.request.get(ui+'/cursors/'+asset+'.svg')).status()
  assert.equal(status,200,'Cursor SVG failed: '+asset)
 }
 await checkSlot('2d:B02','.cc-board svg','sewing-machine.svg')
 assert.equal(await board.getAttribute('data-segment-sewing'),'true')
 assert.equal(await board.getAttribute('data-free-sewing'),'false')
 assert((await board.locator('[data-segment-sew-candidate="true"]').count())>8)
 const firstSegment=board.locator('[data-segment-sew-candidate="true"]').first()
 await firstSegment.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})))
 await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewStage==='second')
 report.checks.push('Segment Sewing retains two-edge selection and sewing cursor after Free Sewing')
 await checkSlot('2d:A04','.cc-board svg','cad-polygon.svg')
 await checkSlot('2d:A05','.cc-board svg','cad-pen.svg')
 await checkSlot('2d:A08','.cc-board svg','cad-notch.svg')
 await checkSlot('2d:A02','.cc-board svg','cad-points.svg')
 await checkSlot('2d:A01','.cc-board svg','') // reset is checked below
 const selectedCursor=await pointer(svg)
 assert(!selectedCursor.includes('cad-notch.svg')&&!selectedCursor.includes('sewing-machine.svg'),'Selecting 2D tool must clear previous sewing cursor')
 await checkSlot('3d:A03','.cc-viewport-3d canvas','cad-brush.svg')
 await checkSlot('3d:B03','.cc-viewport-3d canvas','cad-pen.svg')
 await checkSlot('3d:A20','.cc-viewport-3d canvas','cad-measure.svg')
 await checkSlot('3d:A02','.cc-viewport-3d canvas','cad-move.svg')
 assert.deepEqual(errors,[],'Browser exceptions after tool switching')
 report.pass=true;report.errors=errors;report.failedRequests=networkFailures;report.output=output
 console.log(JSON.stringify(report,null,2))
}catch(error){
 console.error(JSON.stringify({...report,pass:false,error:error.stack||error.message,errors,failedRequests:networkFailures,
  recentRequests:requests.slice(-6)},null,2))
 process.exitCode=1
}finally{
 await browser?.close().catch(()=>{})
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
