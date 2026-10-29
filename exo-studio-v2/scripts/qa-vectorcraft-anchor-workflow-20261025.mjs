/** Actual EXO metric SVG/Rust workflow, isolated from installed native garment. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const api='http://127.0.0.1:5447'
const installed=process.argv.includes('--installed')
const ui=installed?'http://127.0.0.1:5386':'http://127.0.0.1:5287'
const output=mkdtempSync(path.join(tmpdir(),'exo-vector-anchor-'))
const children=[]
const start=(file,args,env={})=>children.push(spawn(file,args,{cwd:root,stdio:'ignore',detached:true,
  env:{...process.env,...env}}))
const ready=async url=>{
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(700)})).ok)return}catch{}
    if(children.some(child=>child.exitCode!==null))throw Error('Disposable process exited')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Service not ready '+url)
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5447',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  if(!installed)start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5287','--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([ready(api+'/health'),ready(ui)])
  const open=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'open',preset:'tshirt'})})).json()
  assert.equal(open.ok,true)
  const revision=open.data.revision
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1560,height:950}})
  const errors=[],failedRequests=[]
  page.on('pageerror',error=>errors.push(String(error.message)))
  await page.route('**/workspace',async route=>{
    try{
      const headers={...route.request().headers()}
      delete headers.origin
      const response=await route.fetch({url:api+'/workspace',headers})
      if(response.status()>=400)failedRequests.push(response.status())
      await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
    }catch{await route.abort().catch(()=>{})}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  const svg=board.locator('svg[data-native-tool]')
  await svg.waitFor({state:'visible',timeout:40000})
  const screenAt=async coords=>svg.evaluate((element,coords)=>{
    const p=new DOMPoint(...coords).matrixTransform(element.getScreenCTM())
    return {x:p.x,y:p.y}
  },coords)
  // The available toolbar must expose BOTH VectorCraft drawing methods.
  const penFlyout=board.locator('[data-tool-family="polygon"] > button')
  await penFlyout.waitFor()
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'vector-pen'}})))
  try{
    await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen',null,{timeout:12000})
  }catch(error){
    console.log('TOOL_DIAG',await page.evaluate(()=>({boards:[...document.querySelectorAll('.cc-board')].map(b=>({
      svg:b.querySelector('svg')?.dataset.nativeTool,visible:b.getBoundingClientRect().width,
      text:b.innerText.slice(0,150)})),errors:document.querySelectorAll('[role=alert]').length})),errors)
    throw error
  }
  const points=[[-.55,.2],[-.30,.20],[-.38,.48],[-.1,.30]]
  for(const xy of points){
    const p=await screenAt(xy)
    await page.mouse.click(p.x,p.y)
  }
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'4')
  // The unfinished path must survive a switch to its sibling tool. Contextual
  // glass controls belong to Anchor Point, not to the active Pen drawing lane.
  assert.equal(await board.locator('[data-context-anchor-tools]').count(),0)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'anchor-point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'4','Switching from Pen to Anchor discarded the draft')
  const anchorBar=board.getByRole('toolbar',{name:'2D VectorCraft anchor tools'})
  await anchorBar.waitFor({state:'visible'})
  assert.equal(await board.locator('[data-context-anchor-tools="liquid-glass"]').count(),1)
  await page.keyboard.press('Escape')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','Escape should remove only last point')
  await page.keyboard.press('Escape')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'2','Repeated Escape removes one additional point')
  await page.keyboard.press('Meta+c')
  assert.equal(await anchorBar.getByRole('button',{name:'Convert anchor to curve'}).getAttribute('aria-pressed'),'true')
  assert.ok(await board.locator('[data-vector-pen-handle]').count()>=2,'Curve conversion must expose two editable handles')
  await anchorBar.getByRole('button',{name:'Add anchor point'}).click()
  await board.locator('svg[data-native-tool="split"]').waitFor()
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'2','+ must select Add, not edit immediately')
  const mid=await board.locator('[data-vector-draft-split-hit]').evaluate(path=>{
    const point=path.getPointAtLength(path.getTotalLength()*.4).matrixTransform(path.getScreenCTM())
    return [point.x,point.y]
  })
  await page.mouse.click(...mid)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','Plus should add an actual draft anchor')
  await svg.focus();await page.keyboard.press('-')
  await board.locator('svg[data-native-tool="remove-anchor"]').waitFor()
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','− must only activate Delete')
  await board.locator('[data-vector-pen-anchor-hit="1"]').click({force:true})
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'2','Minus should remove the active draft anchor')
  await page.keyboard.press('Escape')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'1')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'vector-pen'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'1','Anchor-to-Pen destroyed the draft')
  const beforeFinish=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'})})).json()
  assert.equal(beforeFinish.data.revision,revision,'Draft keyboard work must not silently write Rust')
  for(const xy of [[-.16,.04],[.01,.28]]){
    const p=await screenAt(xy)
    await page.mouse.click(p.x,p.y)
  }
  await page.keyboard.press('Enter')
  await page.waitForFunction(()=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>0)
  await page.waitForTimeout(900)
  const after=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'})})).json()
  assert.ok(after.data.revision>revision,'Enter must commit the complete point path to the isolated Rust document')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'0')
  const newPanel=after.data.template.panels.find(item=>item.id.startsWith('panel_'))
  assert.ok(newPanel?.polygon?.points?.length>=3,'Saved garment must contain the authored VectorCraft path')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'anchor-point'}})))
  await board.locator('svg[data-native-tool="anchor-point"]').waitFor()
  await board.locator(`path[data-panel="${newPanel.id}"]`).click({force:true})
  await board.locator(`[data-2d-pattern-piece="${newPanel.id}"][data-2d-pattern-selected="true"]`).waitFor()
  const vertex=board.locator(`circle[data-control-point="vertex"][data-panel-id="${newPanel.id}"]`).first()
  await vertex.click({force:true})
  const nativeControls=board.getByRole('toolbar',{name:'2D VectorCraft anchor tools'})
  await nativeControls.getByRole('button',{name:'Add anchor point'}).click()
  await board.locator('svg[data-native-tool="split"]').waitFor()
  const beforeNativeClick=await (await fetch(api+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})).json()
  assert.equal(beforeNativeClick.data.revision,after.data.revision,'Native + must not edit until the chosen cutline is clicked')
  const edgeHit=board.locator(`[data-2d-edge-hit^="${newPanel.id}:"]`).first()
  const target=await edgeHit.evaluate(el=>{
    const pts=el.points,ctm=el.getScreenCTM()
    let best=null
    for(let i=1;i<pts.length;i++){
      const a=pts.getItem(i-1),b=pts.getItem(i),length=Math.hypot(a.x-b.x,a.y-b.y)
      if(!best||length>best.length){const p=new DOMPoint((a.x+b.x)/2,(a.y+b.y)/2).matrixTransform(ctm);best={x:p.x,y:p.y,length}}
    }
    return best
  })
  assert.ok(target,'Native edge cannot be hit')
  await page.mouse.click(target.x,target.y)
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>revision,
    after.data.revision,{timeout:12000})
  const afterSplit=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'})})).json()
  const splitPolygon=afterSplit.data.template.panels.find(item=>item.id===newPanel.id)?.polygon
  assert.equal(splitPolygon?.points.length,newPanel.polygon.points.length+1,
    'The committed + command must create a real native Rust contour anchor')
  await svg.focus();await page.keyboard.press('-')
  await board.locator('svg[data-native-tool="remove-anchor"]').waitFor()
  const beforeNativeDelete=await (await fetch(api+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})).json()
  assert.equal(beforeNativeDelete.data.revision,afterSplit.data.revision,'Native − must wait for chosen anchor')
  const added=board.locator(`circle[data-control-point="vertex"][data-panel-id="${newPanel.id}"]`)
  await added.nth(1).click({force:true})
  await page.waitForTimeout(900)
  const afterRemove=await (await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'})})).json()
  assert.equal(afterRemove.data.template.panels.find(item=>item.id===newPanel.id)?.polygon?.points.length,
    newPanel.polygon.points.length,'The committed − command must remove the split anchor via Rust')
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.getAttribute('aria-busy')==='false',null,{timeout:16000})
  // Illustrator-like access stays inside the focused 2D editor, never
  // overrides the native 3D viewport's own keyboard events.
  for(const [key,tool] of [['p','vector-pen'],['b','vector-pencil'],['c','curve'],['v','select'],['a','direct-select']]){
    await svg.focus()
    await page.keyboard.press(key)
    await page.waitForFunction(name=>document.querySelector('svg[data-native-tool]')?.dataset.nativeTool===name,tool,{timeout:10000})
    assert.equal(await svg.getAttribute('data-native-tool'),tool,'2D shortcut '+key+' should activate '+tool)
  }
  await board.screenshot({path:path.join(output,'vectorcraft-anchor-2d-workspace.png')})
  assert.deepEqual(errors,[],'No UI render exceptions')
  assert.deepEqual(failedRequests,[],'No rejected native edit request')
  console.log(JSON.stringify({pass:true,installed,vectorPen:true,twoHandles:true,escapedOnePoint:true,
    shortcutCurve:'Meta+C',shortcuts:['P Pen','B Pencil','C Curve','V Select','A Direct Selection'],
    draftPlusMinus:true,nativePlusMinus:true,nativeCommit:true,source:'VectorCraft ports',pageErrors:0,output}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
