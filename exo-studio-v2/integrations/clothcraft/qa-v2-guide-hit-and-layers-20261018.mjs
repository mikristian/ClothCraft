// Isolated live guide QA. No application sources or user project are mutated.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-guide-reference-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const nativePort=5421,uiPort=5284
const base='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const processes=[],errors=[],workspaceCalls=[],failedResponses=[],notchResponses=[]
const launch=(executable,args,env={})=>{
 const child=spawn(executable,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
 processes.push(child)
}
async function ready(url){
 for(let i=0;i<100;i++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(250)}
 throw Error('Service did not start: '+url)
}
async function command(body){
 const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const result=await response.json()
 assert(result.ok,JSON.stringify(result.error??result))
 return result.data
}
let browser,page
try{
 launch(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
 launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{
  VITE_CLOTHCRAFT_BRIDGE_URL:base})
 await Promise.all([ready(base+'/health'),ready(ui)])
 const initial=await command({op:'open',preset:'tshirt'})
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 page=await browser.newPage({viewport:{width:1728,height:1040}})
 page.on('pageerror',e=>errors.push(e.message))
 page.on('response',async r=>{if(r.status()>=400&&r.url().includes('/workspace')){const data=await r.json().catch(()=>null);failedResponses.push({status:r.status(),url:r.url(),request:r.request().postData()?.slice(0,1200),error:data?.error,responseOk:data?.ok})}})
 page.on('response',async r=>{if(r.url().endsWith('/workspace')&&r.request().method()==='POST'){
   const request=r.request().postDataJSON()
   if(request?.command?.kind==='Notch'){const body=await r.json().catch(()=>null);notchResponses.push({status:r.status(),ok:body?.ok,error:body?.error,revision:body?.data?.revision})}
 }})
 page.on('request',r=>{if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{workspaceCalls.push(r.postDataJSON())}catch{}}})
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
 const board=page.locator('.cc-board').first()
 await board.locator('[data-2d-guide-panel="front"]').waitFor({timeout:45000})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
 await page.waitForFunction(()=>document.querySelector('[data-2d-guide-panel="front"] [data-2d-construction="chest"] line[stroke="transparent"]')!==null,{},{timeout:6000})
 const screenshots=[]
 const screenPoint=async selector=>page.locator(selector).first().evaluate(node=>{
  const lines=[...node.querySelectorAll('line')]
  const line=lines.find(el=>el.getAttribute('stroke')==='transparent')||lines.at(-1)
  if(!line)throw Error('guide hit target missing '+node.outerHTML.slice(0,400))
  const p=new DOMPoint((Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2,
   (Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2).matrixTransform(line.getScreenCTM())
  const length=Math.hypot(Number(line.getAttribute('x2'))-Number(line.getAttribute('x1')),
   Number(line.getAttribute('y2'))-Number(line.getAttribute('y1')))*1000
  return {x:p.x,y:p.y,length}
 })
 const checks=[]
 for(const kind of ['chest','belly','center-front']){
  const selector='[data-2d-guide-panel="front"] [data-2d-construction="'+kind+'"]'
  const group=board.locator(selector).first()
  await group.waitFor({state:'attached',timeout:10000})
  const point=await screenPoint(selector)
  if(kind==='center-front'){
   const centerDiagnostic=await group.evaluate((node)=>{
    const svg=node.ownerSVGElement, hit=[...node.querySelectorAll('line')].find(el=>el.getAttribute('stroke')==='transparent')
    const clip=node.closest('[clip-path]'), rect=node.getBoundingClientRect(),hitRect=hit?.getBoundingClientRect()
    const matrix=hit?.getScreenCTM(), x1=Number(hit?.getAttribute('x1')), x2=Number(hit?.getAttribute('x2')),y1=Number(hit?.getAttribute('y1')),y2=Number(hit?.getAttribute('y2'))
    const mid=new DOMPoint((x1+x2)/2,(y1+y2)/2).matrixTransform(matrix)
    const fields=el=>({tag:el.tagName,panel:el.getAttribute('data-panel'),guide:el.getAttribute('data-2d-guide-panel'),pointerEvents:getComputedStyle(el).pointerEvents,clipPath:getComputedStyle(el).clipPath,rect:el.getBoundingClientRect().toJSON()})
    const ancestors=[];for(let e=hit;e&&ancestors.length<12;e=e.parentElement)ancestors.push(fields(e))
    return {endpoints:{x1,y1,x2,y2},mid:{x:mid.x,y:mid.y},rect:rect.toJSON(),hitRect:hitRect?.toJSON(),clip:clip?.getAttribute('clip-path'),clipMarkup:clip?.outerHTML.slice(0,180),viewport:svg.getBoundingClientRect().toJSON(),visibleWidth:rect.width,visibleHeight:rect.height,ancestors,
      elementsFromPoint:document.elementsFromPoint(mid.x,mid.y).slice(0,12).map(fields),
      nativeTool:svg.getAttribute('data-native-tool'),groupMarkup:node.outerHTML.slice(0,1200)}
   })
   console.log('CENTER_FRONT_DIAGNOSTIC',JSON.stringify(centerDiagnostic))
  }
  if(kind==='chest'){
   const diagnostic=await page.evaluate(({x,y})=>{
    const svg=document.querySelector('.cc-board svg')
    const guide=svg?.querySelector('[data-2d-guide-panel="front"] [data-2d-construction="chest"]')
    const hit=guide?.querySelectorAll('line')?.item(1)
    const describe=el=>({tag:el.tagName,panel:el.getAttribute('data-panel'),guide:el.getAttribute('data-guide-id'),
      construction:el.getAttribute('data-2d-construction'),className:el.getAttribute('class'),
      pointerEvents:getComputedStyle(el).pointerEvents,stylePointerEvents:el.getAttribute('pointer-events'),
      stroke:el.getAttribute('stroke')})
    const ancestors=[];for(let n=hit;n&&ancestors.length<13;n=n.parentElement)ancestors.push(describe(n))
    return {nativeTool:svg?.getAttribute('data-native-tool'),boardMode:document.querySelector('.cc-board')?.getAttribute('data-mode'),
      chestGroups:svg?.querySelectorAll('[data-2d-guide-panel="front"] [data-2d-construction="chest"]').length,
      transparentHits:guide?.querySelectorAll('line[stroke="transparent"]').length,
      guideMarkup:guide?.outerHTML.slice(0,1600),
      ancestors,stack:document.elementsFromPoint(x,y).slice(0,20).map(describe),
      panelCounts:[...new Set([...svg.querySelectorAll('[data-panel]')].map(el=>el.getAttribute('data-panel')))].map(p=>({panel:p,count:svg.querySelectorAll('[data-panel="'+p+'"]').length}))}
   },point)
   console.log('GUIDE_HIT_DIAGNOSTIC',JSON.stringify(diagnostic))
  }
  await page.mouse.click(point.x,point.y)
  const popup=board.locator('[data-2d-selected-guide="'+kind+'"]')
  // React may settle its selected panel and selected guide in separate commits.
  await popup.waitFor({state:'visible',timeout:3000}).catch(()=>{})
  if(!await popup.isVisible()){
   const hit=await page.evaluate(({x,y})=>({element:document.elementFromPoint(x,y)?.outerHTML.slice(0,550),
     mode:document.querySelector('.cc-board')?.dataset['2dEditorMode'],guide:document.querySelector('.cc-board [data-2d-selected-guide]')?.outerHTML.slice(0,240)}),point)
   console.log(JSON.stringify({diagnostic:'guide click missed',kind,point,hit}))
   assert.fail('Pointer hit fabric instead of '+kind+' construction guide: '+String(hit).slice(0,160))
  }
  await popup.waitFor({timeout:5000})
  const reported=Number(await popup.getAttribute('data-2d-selected-guide-length-mm'))
  assert(Math.abs(reported-point.length)<.15,kind+' guide length mismatch '+reported+' vs '+point.length)
  checks.push({kind,reportedMm:reported,geometryMm:point.length})
 }
 // Zoom using actual pointer wheel over board; the popup length must stay in material millimetres.
 const center=await screenPoint('[data-2d-guide-panel="front"] [data-2d-construction="chest"]')
 await page.mouse.move(center.x,center.y)
 await page.mouse.wheel(0,-470)
 await sleep(350)
 const zoomed=await screenPoint('[data-2d-guide-panel="front"] [data-2d-construction="chest"]')
 await page.mouse.click(zoomed.x,zoomed.y)
 await board.locator('[data-2d-selected-guide="chest"]').waitFor()
 const zoomLength=Number(await board.locator('[data-2d-selected-guide="chest"]').getAttribute('data-2d-selected-guide-length-mm'))
 assert(Math.abs(zoomLength-checks[0].reportedMm)<.15,'guide length changed after zoom')
 assert(Math.abs(zoomLength-zoomed.length)<.15,'zoom length differs from model geometry')
 assert(await board.locator('[data-2d-construction="shoulder-offset-reference"]').count()>0,'purple shoulder reference missing')
 assert(await board.locator('[data-2d-construction="center-front"] line[stroke-dasharray]').count()>0,'dotted center missing')
 assert.equal(await board.getAttribute('data-reference-guides-visible'),'true')
 await board.getByRole('button',{name:'Reference guides'}).click()
 assert.equal(await board.getAttribute('data-reference-guides-visible'),'false')
 assert.equal(await board.locator('[data-2d-construction="chest"]').count(),0,'reference guides should hide')
 await board.getByRole('button',{name:'Reference guides'}).click()
 assert(await board.locator('[data-2d-construction="chest"]').count()>0,'reference guides should return')
 for(const [name,attribute] of [['Native notches','data-native-notches-visible'],['Seam allowances','data-seam-allowances-visible']]){
   await board.getByRole('button',{name}).click()
   assert.equal(await board.getAttribute(attribute),'false',name+' should turn off independently')
   await board.getByRole('button',{name}).click()
   assert.equal(await board.getAttribute(attribute),'true',name+' should return')
 }
 await page.mouse.click(zoomed.x,zoomed.y)
 await board.locator('[data-2d-selected-guide="chest"]').waitFor()
 const screenshot=path.join(output,'reference-guides-selected.png')
 await board.screenshot({path:screenshot})
 screenshots.push(screenshot)
 const beforeCalls=workspaceCalls.length
 await board.getByRole('button',{name:'Create native internal line'}).click()
 await page.waitForFunction(()=>document.querySelector('.cc-board [data-2d-selected-guide]')===null)
 await sleep(1200)
 const nativeCommands=workspaceCalls.slice(beforeCalls).filter(x=>JSON.stringify(x).includes('InternalLine'))
 assert(nativeCommands.length>0,'Create native internal line did not issue a Rust command')
 const nativeLine=nativeCommands.find(x=>x.command?.kind==='InternalLine')
 assert(nativeLine,'Expected native InternalLine command')
 const p=nativeLine.command.points
 const nativeLengthMm=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1])*1000
 assert(Math.abs(nativeLengthMm-(zoomLength-20))<.2,'Native line should be inset 10mm at each end')
 const edgePoint=async edge=>page.locator('[data-2d-edge-hit="front:'+edge+'"]').first().evaluate(poly=>{
   const values=poly.getAttribute('points').trim().split(/\s+/).map(pair=>pair.split(',').map(Number))
   const index=Math.max(0,Math.floor((values.length-1)/2))
   const p=[(values[index][0]+values[index+1][0])/2,(values[index][1]+values[index+1][1])/2]
   const screen=new DOMPoint(p[0],p[1]).matrixTransform(poly.getScreenCTM())
   return {x:screen.x,y:screen.y}
 })
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'notch'}})))
 await page.waitForFunction(()=>document.querySelector('.cc-board svg')?.dataset.nativeTool==='notch')
 const notchPoint=await edgePoint('side-right')
 console.log('NOTCH_TARGET',JSON.stringify({notchPoint,hit:await page.evaluate(({x,y})=>({hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,400),tool:document.querySelector('.cc-board svg')?.dataset.nativeTool,mode:document.querySelector('.cc-board')?.dataset['2dEditorMode']}),notchPoint)}))
 await page.keyboard.down('Shift')
 try{await page.mouse.click(notchPoint.x,notchPoint.y)}finally{await page.keyboard.up('Shift')}
 await sleep(1250)
 console.log('NOTCH_AFTER_CLICK',JSON.stringify({calls:workspaceCalls.filter(c=>c.command?.kind==='Notch').slice(-3),notchResponses,notches:await page.locator('[data-native-notch="front:side-right"]').count(),errors,failedResponses}))
 await page.waitForFunction(()=>document.querySelectorAll('[data-native-notch="front:side-right"]').length===2,{},{timeout:45000})
 const afterNotches=await command({op:'snapshot'})
 const nativeDoubleNotches=afterNotches.template.panels.find(p=>p.id==='front')?.polygon?.notches?.['side-right']||[]
 assert.equal(nativeDoubleNotches.length,2,'Shift-click must author two actual Rust notches')
 assert(Math.abs(nativeDoubleNotches[1].t-nativeDoubleNotches[0].t)>.001,'Two authored notches must be distinct')
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'allowance'}})))
 await page.waitForFunction(()=>document.querySelector('.cc-board svg')?.dataset.nativeTool==='allowance')
 await board.getByRole('spinbutton',{name:'Seam allowance width in millimetres'}).fill('13.5')
 const allowancePoint=await edgePoint('side-left')
 await page.mouse.click(allowancePoint.x,allowancePoint.y)
 await page.waitForFunction(()=>document.querySelector('[data-native-allowance="front:side-left"]')!==null,{},{timeout:10000})
 const afterAllowance=await command({op:'snapshot'})
 const savedWidth=afterAllowance.template.panels.find(p=>p.id==='front')?.polygon?.seam_allowances?.['side-left']
 assert(Math.abs(savedWidth-.0135)<1e-8,'Native seam allowance did not preserve chosen 13.5mm width')
 if(failedResponses.length){
  const diagnosticResponse=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   revision:0,op:'edit',command:{kind:'InternalLine',panel:'front',points:[[.27,.40],[.69,.40]],tangents:[[0,0],[0,0]]}
  })})
  const diagnosticJson=await diagnosticResponse.json()
  console.log('INTERIOR_LINE_DIAGNOSTIC',JSON.stringify({httpStatus:diagnosticResponse.status,ok:diagnosticJson.ok,error:diagnosticJson.error,revision:diagnosticJson.data?.revision}))
 }
 assert.equal(errors.length,0,'JS errors: '+errors.join('; '))
 assert.equal(failedResponses.length,0,'failed workspace responses: '+JSON.stringify(failedResponses))
 await page.reload({waitUntil:'domcontentloaded'})
 await board.locator('[data-2d-guide-panel="front"]').waitFor({timeout:40000})
 const reopened=await command({op:'open',preset:'tshirt'})
 assert(reopened.panels?.length>0&&initial.panels?.length>0,'isolated Rust workspace unavailable after reload')
 console.log(JSON.stringify({pass:true,output,checks,zoomLength,nativeLengthMm,nativeDoubleNotches,savedWidth,nativeCommandCount:nativeCommands.length,
  nativeCommands,shoulderReferences:await board.locator('[data-2d-construction="shoulder-offset-reference"]').count(),
  screenshots,errors,failedResponses},null,2))
}catch(error){
 const screenshot=path.join(output,'reference-guide-failure.png')
 await page?.screenshot({path:screenshot}).catch(()=>{})
 console.error(JSON.stringify({pass:false,output,screenshot,error:String(error.stack||error),errors,failedResponses},null,2));process.exitCode=1
}
finally{
 await browser?.close().catch(()=>{})
 for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
