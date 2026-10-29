// CLO-like 2D display/guide/curve integration test against an isolated Rust session.
// Does not load or modify the user's persisted native garment workspace.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const output=mkdtempSync(path.join(tmpdir(),'exo-cad-guides-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
// 5284 is a trusted, unused QA origin; 5286 may run another local application.
const nativePort=5437,uiPort=5284
const base='http://127.0.0.1:'+nativePort,ui='http://127.0.0.1:'+uiPort
const processes=[],errors=[],failures=[],commands=[]
function launch(executable,args,env={}){
  const child=spawn(executable,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  processes.push(child)
}
async function ready(url){
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
    await sleep(250)
  }
  throw Error('Unable to start isolated service: '+url)
}
async function command(body){
  const r=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const json=await r.json()
  assert(json.ok,json.error||JSON.stringify(json))
  return json.data
}
let browser,page
try{
  launch(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:String(nativePort),EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  launch(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(uiPort),'--strictPort'],{VITE_CLOTHCRAFT_BRIDGE_URL:base})
  await Promise.all([ready(base+'/health'),ready(ui)])
  await command({op:'open',preset:'tshirt'})
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',e=>errors.push(e.message))
  page.on('response',async r=>{
    if(r.url().includes('/workspace')&&r.status()>=400)failures.push({
      status:r.status(),url:r.url(),command:r.request().postData()?.slice(0,430),
      response:(await r.text().catch(()=>''))?.slice(0,430)})
  })
  page.on('request',r=>{
    if(r.url().endsWith('/workspace')&&r.method()==='POST'){try{commands.push(r.postDataJSON())}catch{}}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  await page.waitForTimeout(1200)
  console.log('CAD_BOARD_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
    boards:document.querySelectorAll('.cc-board').length,
    boardHtml:document.querySelector('.cc-board')?.outerHTML.slice(0,400),
    guidePanels:document.querySelectorAll('[data-2d-guide-panel]').length,
    nativeWindows:document.querySelectorAll('.cc-viewport-2d').length,
    url:location.href,
    mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),
    errors:[...document.querySelectorAll('.cc-error')].map(n=>n.textContent.slice(0,120)),
  }))))
  await board.locator('[data-2d-guide-panel="front"]').waitFor({state:'attached',timeout:60000})
  // Test the actual Settings catalog, not just a synthetic event dispatched
  // straight into the canvas: the optional VectorCraft Pen must be discoverable.
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  const settings=page.getByRole('dialog',{name:'User Settings'})
  await settings.waitFor({state:'visible',timeout:9000})
  await settings.getByRole('button',{name:'Tool Index'}).click()
  await settings.getByRole('textbox',{name:'Search all tools'}).fill('VectorCraft')
  await settings.locator('[data-tool-index-id="extra:vector-pen"]').waitFor({state:'visible'})
  await settings.locator('[data-tool-index-id="extra:vector-pencil"]').waitFor({state:'visible'})
  await settings.locator('[data-tool-index-id="extra:vectorcraft-edit-pattern"]').waitFor({state:'visible'})
  await settings.getByRole('button',{name:'Use VectorCraft Edit Pattern · Curve Points'}).click()
  await settings.waitFor({state:'hidden'})
  await board.locator('svg[data-native-tool="curve"]').waitFor({state:'visible',timeout:6000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  assert.equal(await board.locator('[data-2d-selected-guide]').count(),0,'No floating guide popup')
  assert.equal(await board.getByRole('group',{name:'2D pattern display layers'}).count(),0,'No floating three-button overlay')
  const menu=board.getByRole('group',{name:'2D Pattern Display options'})
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  await menu.waitFor({state:'visible'})
  for(const label of ['Show Reference Lines','Show Internal Lines','Show Notches','Show Seam Allowance'])
    assert(await menu.getByLabel(label).isVisible(),'CLO-style display toggle absent: '+label)
  // CLO's flyout is transient. Close it before hitting pattern points beneath.
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  const checks=[]
  for(const panel of ['front','back']){
    for(const kind of ['chest','belly','hem-upper','hem-lower']){
      const segments=board.locator('[data-guide-panel="'+panel+'"][data-2d-construction="'+kind+'"]')
      assert.equal(await segments.count(),2,panel+' '+kind+' must have two selectable intervals')
      const dots=board.locator('[data-2d-guide-panel="'+panel+'"] [data-2d-shared-nodes="'+kind+'"] circle')
      assert.equal(await dots.count(),3,panel+' '+kind+' requires exactly three shared dots')
      for(let i=0;i<2;i++){
        const guide=segments.nth(i)
        const pt=await guide.evaluate(node=>{
          const line=node.querySelector('line')
          const p=new DOMPoint((Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2,
            (Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2)
            .matrixTransform(line.getScreenCTM())
          return {x:p.x,y:p.y}
        })
        await page.mouse.move(pt.x,pt.y)
        await page.waitForFunction(({panel,kind,i})=>{
          const elements=document.querySelectorAll('[data-guide-panel="'+panel+'"][data-2d-construction="'+kind+'"]')
          return elements[i]?.getAttribute('data-hovered')==='true'
        },{panel,kind,i},{timeout:2500}).catch(async()=>{
          const diagnostic=await page.evaluate(({panel,kind,i,x,y})=>({
            hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,250),
            hovered:[...document.querySelectorAll('[data-guide-panel="'+panel+'"][data-2d-construction="'+kind+'"]')].map(n=>({id:n.getAttribute('data-guide-id'),hovered:n.getAttribute('data-hovered')})),
            mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),
          }),{panel,kind,i,x:pt.x,y:pt.y})
          throw Error('Hover failed '+JSON.stringify({panel,kind,i,diagnostic}))
        })
        await page.mouse.click(pt.x,pt.y)
        await page.waitForFunction(({panel,kind,i})=>{
          const elements=document.querySelectorAll('[data-guide-panel="'+panel+'"][data-2d-construction="'+kind+'"]')
          return elements[i]?.querySelector('line')?.getAttribute('stroke')==='#ed9d26'
        },{panel,kind,i},{timeout:2000}).catch(async()=>{
          const diagnostic=await page.evaluate(({panel,kind,i,x,y})=>({
            hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,260),
            segments:[...document.querySelectorAll('[data-guide-panel="'+panel+'"][data-2d-construction="'+kind+'"]')].map(n=>({id:n.getAttribute('data-guide-id'),stroke:n.querySelector('line')?.getAttribute('stroke'),hovered:n.getAttribute('data-hovered')})),
            selected:document.querySelector('[data-2d-selected-guide]')?.outerHTML.slice(0,180),
            selectedAcrossBoard:[...document.querySelectorAll('[data-guide-id] line[stroke="#ed9d26"]')].map(n=>n.parentElement?.getAttribute('data-guide-id')),
            mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),
          }),{panel,kind,i,x:pt.x,y:pt.y})
          throw Error('Guide click failed '+JSON.stringify({panel,kind,i,diagnostic}))
        })
        assert.equal(await board.locator('[data-2d-selected-guide]').count(),0,'Guide popup must stay absent')
        checks.push({panel,kind,half:i,hover:true,selection:true})
      }
    }
    const shoulders=board.locator('[data-2d-guide-panel="'+panel+'"] [data-guide-boundary] [data-guide-segment]')
    console.log('SHOULDER_DIAG',JSON.stringify({panel,shoulderGroups:await board.locator('[data-2d-guide-panel="'+panel+'"] [data-guide-boundary]').count(),
      segmentCount:await shoulders.count(),shoulderReferences:await board.locator('[data-2d-guide-panel="'+panel+'"] [data-2d-construction="shoulder-offset-reference"]').count(),
      guideHtml:(await board.locator('[data-2d-guide-panel="'+panel+'"]').first().getAttribute('clip-path'))}))
    assert(await shoulders.count()>0,panel+' missing shoulder reference selection')
    const nodes=board.locator('[data-2d-guide-panel="'+panel+'"] [data-guide-boundary] [data-2d-shared-nodes] circle')
    assert.equal(await nodes.count(),4,panel+' shoulder references must have exactly two endpoints each')
    const center=board.locator('[data-guide-panel="'+panel+'"][data-2d-construction^="center-"]')
    assert(await center.count()>=3,panel+' centerline must be independently selectable')
    // The centerline intersects the same actual center node used by each
    // horizontal guide. Those node coordinates must be identical, not offset
    // display-only circles near the intersection.
    for(const kind of ['chest','belly','hem-upper','hem-lower']){
      const centerNode=board.locator('[data-2d-guide-panel="'+panel+'"] [data-2d-shared-nodes="'+kind+'"] circle').nth(1)
      const location=await centerNode.evaluate(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))])
      const coincident=await center.evaluateAll((groups,[x,y])=>groups.some(group=>{
        const line=group.querySelector('line')
        return ['x1','x2'].some((xField,i)=>Math.hypot(Number(line.getAttribute(xField))-x,
          Number(line.getAttribute(i===0?'y1':'y2'))-y)<1e-8)
      }),location)
      assert(coincident,panel+' '+kind+' dot must be exactly shared with vertical center reference')
    }
    for(const [name,locator] of [['shoulder',shoulders.first()],['centerline',center.nth(1)]]){
      const position=await locator.evaluate(group=>{
        const line=group.querySelector('polyline[data-guide-curve],line')
        const point=line.tagName.toLowerCase()==='polyline'
          ?line.getAttribute('points').trim().split(/\s+/).map(v=>v.split(',').map(Number))[Math.floor(line.getAttribute('points').trim().split(/\s+/).length/2)]
          :[(Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2,
            (Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2]
        const p=new DOMPoint(point[0],point[1]).matrixTransform(line.getScreenCTM())
        return {x:p.x,y:p.y}
      })
      await page.mouse.move(position.x,position.y)
      await locator.waitFor({state:'attached'})
      await page.waitForFunction(([name,panel])=>[...document.querySelectorAll('[data-guide-panel="'+panel+'"]')]
        .some(node=>node.getAttribute('data-hovered')==='true'&&
          (name==='shoulder'?node.getAttribute('data-guide-kind')==='shoulder-offset-reference':
            node.getAttribute('data-guide-kind')?.startsWith('center-'))),[name,panel],{timeout:5000})
      await page.mouse.click(position.x,position.y)
      assert.equal(await board.locator('[data-2d-selected-guide]').count(),0,
        'Selecting '+name+' must never show the old construction-guide popup')
      checks.push({panel,kind:name,hover:true,selection:true})
    }
  }
  const selectedShot=path.join(output,'cad-segments-selected.png')
  await board.screenshot({path:selectedShot})
  // Create a real InternalLine from a selected chest half, verify that the
  // persisted Rust object is selectable on the pattern and can be removed.
  const chestHalf=board.locator('[data-guide-id="front:chest:0:left"]')
  const chestPoint=await chestHalf.evaluate(group=>{
    const line=group.querySelector('line')
    const p=new DOMPoint((Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2,
      (Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2).matrixTransform(line.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.move(chestPoint.x,chestPoint.y)
  await page.mouse.click(chestPoint.x,chestPoint.y)
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  await board.getByRole('button',{name:'Create native internal line'}).click()
  await page.waitForFunction(()=>document.querySelectorAll('[data-native-internal-line^="front:"]').length===1,{},{timeout:20000})
  const createdSnapshot=await command({op:'snapshot'})
  const storedLine=createdSnapshot.template.panels.find(p=>p.id==='front')?.polygon?.lines?.[0]
  assert(storedLine?.points?.length===2,'Authored native line missing from Rust snapshot')
  const nativeLine=board.locator('[data-native-internal-line^="front:"]').first()
  await menu.getByRole('button',{name:'Show Reference Lines'}).click()
  assert.equal(await board.locator('[data-2d-construction="chest"]').count(),0,'Reference lines visibility failed')
  assert.equal(await nativeLine.count(),1,'Persisted internal lines must remain visible without guides')
  await menu.getByRole('button',{name:'Show Internal Lines'}).click()
  assert.equal(await board.locator('[data-native-internal-line]').count(),0,'Native line toggle should hide persisted lines')
  await menu.getByRole('button',{name:'Show Internal Lines'}).click()
  assert.equal(await board.locator('[data-native-internal-line]').count(),1,'Native line toggle must restore persisted lines')
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  const nativeHit=await nativeLine.evaluate(group=>{
    const line=group.querySelector('[data-guide-id] polyline[data-guide-curve]')
    const values=line.getAttribute('points').trim().split(/\s+/)
    const midpoint=values[Math.floor(values.length/2)].split(',').map(Number)
    const p=new DOMPoint(midpoint[0],midpoint[1]).matrixTransform(line.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.move(nativeHit.x,nativeHit.y)
  await page.mouse.click(nativeHit.x,nativeHit.y)
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  await board.getByRole('button',{name:'Remove native internal line'}).click()
  await page.waitForFunction(()=>document.querySelectorAll('[data-native-internal-line^="front:"]').length===0,{},{timeout:20000})
  await menu.getByRole('button',{name:'Show Reference Lines'}).click()
  assert(await board.locator('[data-guide-segment]').count()>0,'Reference lines not restored')
  for(const label of ['Show Notches','Show Seam Allowance']){
    await menu.getByRole('button',{name:label}).click()
    if(label==='Show Notches')assert.equal(await board.locator('[data-reference-mark="notch"]').count(),0,
      'Hiding notches must hide visual sample marks as well as native cut notches')
    await menu.getByRole('button',{name:label}).click()
  }
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  await page.mouse.move(1100,830)
  await board.getByRole('button',{name:'2D Pattern Display'}).press('Escape')
  assert.equal(await menu.isVisible(),false,'Display options should collapse')
  // CLO curve workflow: select named neckline segment, materialize its editable
  // native cubic Bezier pair, then drag one genuine control handle.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await sleep(350)
  console.log('CURVE_TOOL_DIAG',JSON.stringify(await page.evaluate(()=>({
    tool:document.querySelector('.cc-board svg[data-native-tool]')?.getAttribute('data-native-tool'),
    mode:document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode'),
    visibleOptions:[...document.querySelectorAll('.cc-corner-tool-host button')].map(n=>n.getAttribute('aria-label')).filter(Boolean).slice(0,12)
  }))))
  if(await board.locator('svg[data-native-tool="curve"]').count()===0)
    await board.getByRole('button',{name:'Edit Curves'}).first().click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='curve',{},{timeout:5000})
  const neckline=board.locator('[data-2d-edge-hit^="front:"][data-2d-edge-hit*="neck"]').first()
  assert(await neckline.count(),'Tshirt source missing named neckline edge')
  const neckName=await neckline.getAttribute('data-2d-edge-hit')
  const neckPoint=await neckline.evaluate(node=>{
    const coordinates=node.getAttribute('points').trim().split(/\s+/).map(v=>v.split(',').map(Number))
    const midpoint=coordinates[Math.floor(coordinates.length/2)]
    const screen=new DOMPoint(midpoint[0],midpoint[1]).matrixTransform(node.getScreenCTM())
    return {x:screen.x,y:screen.y}
  })
  await page.mouse.click(neckPoint.x,neckPoint.y)
  await sleep(1000)
  console.log('CURVE_DIAG',JSON.stringify({neckName,neckPoint,shapeCommands:commands.filter(c=>c.command?.kind==='Shape').slice(-2),
    hit:await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.outerHTML.slice(0,300),neckPoint),
    handles:await board.locator('[data-curve-handle^="front:"]').count(),mode:await board.getAttribute('data-2d-editor-mode')}))
  await page.waitForFunction(()=>document.querySelectorAll('[data-curve-handle^="front:"]').length>=2,{},{timeout:12000})
  const curvePreview=board.locator('[data-native-cubic-preview="front:neck-bottom"]')
  await curvePreview.waitFor({state:'visible',timeout:8000})
  const initialLength=Number(await curvePreview.locator('[data-native-cubic-length-cm]').getAttribute('data-native-cubic-length-cm'))
  assert(Number.isFinite(initialLength)&&initialLength>1,'Neckline edit must expose physical-length measurement')
  const handle=board.locator('[data-curve-handle^="front:"]').first()
  const first=await handle.evaluate(node=>({x:node.getBoundingClientRect().x+node.getBoundingClientRect().width/2,
    y:node.getBoundingClientRect().y+node.getBoundingClientRect().height/2}))
  await page.mouse.move(first.x,first.y)
  await page.mouse.down()
  await page.mouse.move(first.x+18,first.y-12,{steps:5})
  const liveShape=await curvePreview.locator('path').getAttribute('d')
  await page.mouse.up()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.getAttribute('data-2d-editor-mode')==='edit')
  assert(commands.some(c=>c.command?.kind==='Shape'),'Neckline conversion should save native Shape')
  await page.waitForFunction(()=>window.performance&&document.querySelectorAll('[data-curve-handle^="front:"]').length>=2)
  const shapeEdits=commands.filter(c=>c.command?.kind==='Shape')
  assert(shapeEdits.length>=2,'Dragging Bezier handle must author a second native shape edit')
  const originalControl=shapeEdits[0].command.polygon.curves['neck-bottom']?.[0]
  const changedControl=shapeEdits.at(-1).command.polygon.curves['neck-bottom']?.[0]
  assert(originalControl&&changedControl&&Math.hypot(changedControl[0]-originalControl[0],
    changedControl[1]-originalControl[1])>.002,'Dragging neckline handle did not change cubic control geometry')
  assert(/^M .* C /.test(liveShape)&&!liveShape.includes('NaN'),'Dragging handle must preview measured cubic geometry')
  // Selecting/dragging a real vertex now edits the existing contour. It must
  // NOT toggle its curve type on pointerdown, which previously blocked drags.
  const vertex=board.locator('[data-control-point="vertex"][data-panel-id="front"]').nth(7)
  await vertex.waitFor({state:'visible'})
  const at=await vertex.evaluate(node=>{const box=node.getBoundingClientRect()
    return {x:box.x+box.width/2,y:box.y+box.height/2}})
  const beforeAnchors=commands.filter(c=>c.command?.kind==='Anchor').length
  await page.mouse.move(at.x,at.y)
  await page.mouse.down()
  await page.mouse.move(at.x+14,at.y-14,{steps:6})
  const ghost=board.locator('[data-pattern-vertex-preview="front:7"]')
  await ghost.waitFor({state:'visible',timeout:3000})
  await page.mouse.up()
  await page.waitForFunction(()=>document.querySelector('[data-pattern-vertex-preview="front:7"]')===null)
  assert(commands.filter(c=>c.command?.kind==='Anchor').length>beforeAnchors,
    'Dragging an existing point in Edit Pattern must author native Anchor move')
  assert.equal(errors.length,0,'Page errors: '+errors.join(' | '))
  assert.equal(failures.length,0,'Workspace HTTP errors: '+JSON.stringify(failures))
  console.log(JSON.stringify({pass:true,output,screenshot:selectedShot,checks:checks.length,neckName,
    storedLineId:storedLine.id,necklineLengthCm:initialLength,curveCommands:shapeEdits.length,errors,failures},null,2))
}catch(error){
  const file=path.join(output,'cad-workflow-failure.png')
  await page?.screenshot({path:file}).catch(()=>{})
  console.error(JSON.stringify({pass:false,output,screenshot:file,error:String(error.stack||error),errors,failures},null,2))
  process.exitCode=1
}finally{
  await browser?.close().catch(()=>{})
  for(const child of processes)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
