// Disposable native 2D pattern-rendering QA. Never opens a saved user project.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import {mkdir, mkdtemp, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as wait} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=path.join(root,'docs/qa/pattern-visual-20261018')
const scratch=await mkdtemp(path.join(tmpdir(),'exo-pattern-visual-'))
await mkdir(path.join(scratch,'workspace'),{recursive:true})
await mkdir(output,{recursive:true})
const processes=[]
async function freePort(){
  const server=createServer()
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve))
  const port=server.address().port
  await new Promise(resolve=>server.close(resolve))
  return port
}
const nativePort=await freePort(),uiPort=await freePort()
const api=`http://127.0.0.1:${nativePort}`,ui=`http://127.0.0.1:${uiPort}`
function launch(file,args,env={}){
  const p=spawn(file,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  processes.push(p)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await wait(200)
  }
  throw Error(`Server did not start: ${url}`)
}
let browser
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:scratch,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([ready(api+'/health'),ready(ui)])
  const opened=await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'open',preset:'tshirt'})}).then(r=>r.json())
  assert(opened.ok,opened.error||'Native T-shirt fixture failed')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist']})
  const page=await browser.newPage({viewport:{width:1728,height:1060}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  // Desktop routes normally target the installed native service. Redirect
  // every workspace request to this disposable native fixture instead.
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:api+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  await page.waitForTimeout(2500)
  const startup=await page.evaluate(()=>({title:document.title,boards:document.querySelectorAll('.cc-board').length,
    panels:document.querySelectorAll('[data-2d-pattern-piece]').length,
    body:document.body?.innerText?.slice(0,450)||''}))
  console.log('PATTERN_VISUAL_STARTUP',JSON.stringify({startup,errors}))
  await page.screenshot({path:path.join(output,'00-startup.png')})
  await board.locator('[data-2d-pattern-piece]').first().waitFor({timeout:40000})
  await page.waitForTimeout(650)
  await board.screenshot({path:path.join(output,'01-patterns-overview.png')})
  const pieces=board.locator('[data-2d-pattern-piece]')
  const candidate=pieces.filter({has:page.locator('[data-panel]')}).first()
  const panelId=await candidate.getAttribute('data-2d-pattern-piece')
  const hit=board.locator(`[data-panel="${panelId}"]`)
  await hit.click({force:true})
  await page.waitForTimeout(300)
  if(await board.locator('[data-2d-pattern-selected="true"]').count()===0){
    const rect=await hit.boundingBox()
    if(rect)await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2)
  }
  const selected=board.locator('[data-2d-pattern-selected="true"]')
  assert(await selected.count()>0,'Selecting the native pattern must show selected rendering')
  await board.screenshot({path:path.join(output,'02-selected-pattern.png')})
  const inspection=await board.evaluate(element=>{
    const selection=element.querySelector('[data-2d-pattern-selected="true"]')
    const others=[...element.querySelectorAll('[data-2d-pattern-selected="false"]')]
    const path=selection?.querySelector('[data-panel]')
    const cutline=selection?.querySelector('polyline[vector-effect="non-scaling-stroke"]')
    return {
      pieces:element.querySelectorAll('[data-2d-pattern-piece]').length,
      boardMode:element.dataset.editorMode||element.getAttribute('data-2d-editor-mode'),
      tool:element.querySelector('svg[data-native-tool]')?.getAttribute('data-native-tool'),
      selectedPieces:element.querySelectorAll('[data-2d-pattern-selected="true"]').length,
      cornerNodes:selection?.querySelectorAll('[data-2d-visible-corner]').length||0,
      selectedFill:path?.getAttribute('fill'),
      unselectedFill:others[0]?.querySelector('[data-panel]')?.getAttribute('fill'),
      cutlineStroke:cutline?.getAttribute('stroke'),
      cutlineWidth:cutline?.getAttribute('stroke-width'),
      grids:[...element.querySelectorAll('pattern')].map(n=>Number(n.getAttribute('width'))),
      viewWidth:Number(element.querySelector('svg[data-native-tool]')?.viewBox.baseVal.width),
      nativeRevision:element.getAttribute('data-document-revision'),
    }
  })
  console.log('PATTERN_VISUAL_INSPECTION',JSON.stringify(inspection))
  assert.equal(inspection.selectedFill,'#fff8c9','Selected pattern should use pale CLO drafting paper')
  assert(inspection.cornerNodes>0,'Selected pattern must expose authored corners')
  assert.deepEqual(inspection.grids,inspection.viewWidth>1.25?[.05,.25]:[.01,.05],
    'Overview grid and fine drafting grid must use the right metric level of detail')
  const bounds=await board.boundingBox()
  await page.mouse.move(bounds.x+bounds.width*.52,bounds.y+bounds.height*.49)
  for(let i=0;i<12;i++)await page.mouse.wheel(0,-120)
  await page.waitForTimeout(250)
  const zoom=await board.evaluate(el=>({
    viewWidth:el.querySelector('svg[data-native-tool]')?.viewBox.baseVal.width,
    grids:[...el.querySelectorAll('pattern')].map(n=>Number(n.getAttribute('width'))),
    cornerNodes:el.querySelectorAll('[data-2d-pattern-selected="true"] [data-2d-visible-corner]').length,
    revision:el.getAttribute('data-document-revision'),
  }))
  assert(zoom.viewWidth<1.25,'Wheel zoom should reveal 1cm metric grid')
  assert.deepEqual(zoom.grids,[.01,.05],'Close zoom must show 1cm/5cm grid')
  assert.equal(zoom.revision,inspection.nativeRevision,'Camera zoom must not modify native garment')
  await board.screenshot({path:path.join(output,'03-zoom-detail.png')})
  const edgeTarget=await board.locator('[data-2d-pattern-selected="true"] polyline[data-edge]').evaluateAll(nodes=>{
    const svg=document.querySelector('.cc-board svg[data-native-tool]')
    const bounds=svg?.getBoundingClientRect()
    for(const node of nodes){
      if(node.points.numberOfItems<2)continue
      const a=node.points.getItem(0),b=node.points.getItem(node.points.numberOfItems-1)
      const pt=svg.createSVGPoint()
      pt.x=(a.x+b.x)/2;pt.y=(a.y+b.y)/2
      const xy=pt.matrixTransform(node.getScreenCTM())
      if(xy.x>bounds.x+25&&xy.x<bounds.right-25&&xy.y>bounds.y+25&&xy.y<bounds.bottom-25)
        return {x:xy.x,y:xy.y,edge:node.dataset.edge}
    }
    return null
  })
  assert(edgeTarget,'At least one selected pattern edge should be visible at close zoom')
  await page.mouse.move(edgeTarget.x,edgeTarget.y)
  await page.waitForTimeout(130)
  const readout=await board.locator('[data-2d-boundary-readout]').first().evaluate(node=>{
    const edge=node.getAttribute('data-2d-boundary-readout')
    const paths=[...document.querySelectorAll('polyline[data-edge]')].filter(item=>item.dataset.edge===edge)
    const length=paths.reduce((sum,path)=>{
      let travelled=0
      for(let i=1;i<path.points.numberOfItems;i++){
        const a=path.points.getItem(i-1),b=path.points.getItem(i)
        travelled+=Math.hypot(b.x-a.x,b.y-a.y)
      }
      return sum+travelled
    },0)
    return {edge,approxCm:Number(node.getAttribute('data-2d-readout-approx-cm')),
      polylineCm:length*100,label:node.textContent.trim()}
  })
  assert(readout.approxCm>0&&readout.label.includes('≈'),'Selected native boundary shows an approximate cutline length')
  assert(Math.abs(readout.approxCm-readout.polylineCm)<.003,
    'Displayed boundary length must agree with the tessellated model-space outline')
  await board.screenshot({path:path.join(output,'04-edge-readout.png')})
  const finalRevision=await board.getAttribute('data-document-revision')
  assert.equal(finalRevision,inspection.nativeRevision,'Selected edge hover must never edit garment')
  await board.getByRole('button',{name:'Grid',exact:true}).click()
  await board.getByRole('button',{name:'Frame all'}).click()
  await page.waitForTimeout(180)
  const cleanDraft=await board.evaluate(node=>({
    avatarSilhouette:node.querySelectorAll('[aria-label="Centered front avatar silhouette"]').length,
    selectedPieces:node.querySelectorAll('[data-2d-pattern-selected="true"]').length,
    panels:node.querySelectorAll('[data-2d-pattern-piece]').length,
    selectedCornerNodes:node.querySelectorAll('[data-2d-pattern-selected="true"] [data-2d-visible-corner]').length,
    unselectedCornerNodes:node.querySelectorAll('[data-2d-pattern-selected="false"] [data-2d-visible-corner]').length,
    gridActive:node.querySelector('button[aria-label="Grid"]')?.getAttribute('aria-pressed'),
    revision:node.getAttribute('data-document-revision'),
  }))
  assert.equal(cleanDraft.avatarSilhouette,0,'Neutral CLO-like grid view must hide placement silhouette')
  assert(cleanDraft.selectedCornerNodes>0&&cleanDraft.unselectedCornerNodes>0,
    'CLO-style dark selected nodes and muted unselected nodes must both be present')
  assert.equal(cleanDraft.gridActive,'true','Grid view must remain active')
  assert.equal(cleanDraft.revision,inspection.nativeRevision,'Changing display modes must not edit garment')
  await board.screenshot({path:path.join(output,'05-clo-grid-mode.png')})
  assert.deepEqual(errors,[],'No browser runtime errors expected')
  await writeFile(path.join(output,'results.json'),JSON.stringify({inspection,zoom,readout,cleanDraft,errors,fixture:'native tshirt default',output},null,2)+'\n')
  console.log(JSON.stringify({ok:true,...inspection,zoom,readout,cleanDraft,output},null,2))
}finally{
  if(browser)await browser.close()
  for(const p of processes){try{process.kill(-p.pid,'SIGTERM')}catch{try{p.kill('SIGTERM')}catch{}}}
}
