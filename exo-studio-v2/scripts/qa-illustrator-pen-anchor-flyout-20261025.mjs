import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-pen-anchor-flyout-'))
const api='http://127.0.0.1:5449',ui='http://127.0.0.1:5286'
const children=[]
const start=(command,args,env={})=>children.push(spawn(command,args,{cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,...env}}))
const wait=async url=>{
  for(let n=0;n<120;n++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Service not ready '+url)
}
const call=async body=>{
  const result=await(await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)})).json()
  assert.ok(result.ok,result.error||JSON.stringify(result).slice(0,300))
  return result.data
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5449',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  })
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],
    {VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([wait(api+'/health'),wait(ui)])
  await call({op:'open',preset:'tshirt'})
  const initial=await call({op:'snapshot'})
  const initialIds=new Set(initial.template.panels.map(p=>p.id))
  await call({op:'edit',revision:initial.revision,command:{kind:'Polygon',fabric:initial.template.fabrics[0].id,
    points:[[-.66,.17],[-.36,.17],[-.36,.46],[-.66,.46]],tangents:[[0,0],[0,0],[0,0],[0,0]]}})
  const afterCreation=await call({op:'snapshot'})
  const added=afterCreation.template.panels.find(p=>!initialIds.has(p.id))
  assert.ok(added,'Independent rectangle missing')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1540,height:975}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=penFlyout20261025',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board'),svg=board.locator('svg[data-native-tool]')
  await svg.waitFor({state:'visible',timeout:40000})
  // The dedicated Pattern Design sidebar belongs to the full 2D layout.
  await page.locator('[data-tool-family="collapse-3d"] > button').first().click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='2d')
  const pen=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="vector-pen"]')
  await pen.waitFor({state:'visible',timeout:15000})
  await pen.scrollIntoViewIfNeeded()
  const family=pen.locator('..'),menu=family.locator('.exo-pen-flyout')
  await pen.hover()
  assert.equal(await menu.count(),0,'Sidebar Pen choices must wait for press-and-hold')
  const rect=await pen.boundingBox()
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2)
  await page.mouse.down()
  await page.waitForTimeout(530)
  assert.equal(await pen.getAttribute('aria-expanded'),'true','Sidebar Pen long hold did not open')
  await page.mouse.up()
  for(const label of ['Pen Tool','Pencil Tool','Anchor Point Tool','Direct Selection Tool','Add Anchor Point Tool','Delete Anchor Point Tool'])
    assert.equal(await menu.getByRole('menuitemradio',{name:label,exact:true}).count(),1,'Missing Illustrator subtool '+label)
  assert.equal(await menu.locator('[role="menuitemradio"]').count(),6,'VectorCraft family must include Pen, Pencil, Anchor Point, Direct Selection, Add and Delete')
  const menuBounds=await menu.boundingBox()
  assert.ok(menuBounds&&menuBounds.width>200&&menuBounds.x+menuBounds.width<=1540,
    'Sidebar flyout was clipped or positioned outside viewport')
  assert.ok(Math.abs(menuBounds.x-(rect.x+rect.width+7))<3,
    'Flyout must sit directly beside the toolbar button, not float over the canvas')
  await menu.getByRole('menuitemradio',{name:'Anchor Point Tool',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  assert.equal(await menu.count(),0,'Choosing a tool must dismiss flyout')
  await board.locator(`path[data-panel="${added.id}"]`).first().click({force:true})
  let anchor=board.locator(`circle[data-panel-id="${added.id}"][data-pattern-anchor-index="1"]`)
  await anchor.waitFor({state:'visible',timeout:14000})
  const corner=await anchor.boundingBox()
  assert.ok(corner)
  await page.mouse.move(corner.x+corner.width/2,corner.y+corner.height/2)
  await page.mouse.down()
  await page.mouse.move(corner.x+corner.width/2+18,corner.y+corner.height/2+20,{steps:7})
  await page.mouse.up()
  // An unsewn rectangle commits its native Rust Shape directly on release.
  // Sewn contours still require explicit seam-ease review.
  let curved=await call({op:'snapshot'})
  for(let i=0;i<40&&curved.revision<=afterCreation.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));curved=await call({op:'snapshot'})
  }
  assert.ok(curved.revision>afterCreation.revision,'Anchor Point drag did not commit native curves')
  const curvedPanel=curved.template.panels.find(p=>p.id===added.id)
  const shape=curvedPanel.polygon
  assert.ok(Object.keys(shape.curves||{}).length>=2,'Dragging must create opposed cubic handles')
  // Rust normalize() rebases local coordinates by the new Bézier control
  // bounds and moves layout_2d by the exact inverse offset. Compare the
  // physical 2D board position, not local storage coordinates.
  const worldCorner=panel=>panel.polygon.points[1].map((v,k)=>v+panel.layout_2d[k])
  const before=worldCorner(added),after=worldCorner(curvedPanel)
  assert.ok(Math.hypot(...after.map((v,k)=>v-before[k]))<1e-9,
    `Anchor Point must preserve board-space vertex location: ${JSON.stringify({before,after})}`)
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=revision,
    curved.revision,{timeout:10000})
  // Verify the actual ANCHOR POINT tool moves a Bézier handle. This must be
  // its own gesture rather than borrowing Direct Selection's success.
  await board.getByRole('button',{name:'Focus selected'}).click()
  const anchorHandles=board.locator(`[data-curve-handle^="${added.id}:"]`)
  await anchorHandles.first().waitFor({state:'visible',timeout:10000})
  let anchorHandleBox=null
  for(let i=0;i<await anchorHandles.count();i++){
    const candidate=anchorHandles.nth(i),r=await candidate.boundingBox(),id=await candidate.getAttribute('data-curve-handle')
    if(r&&await page.evaluate(([x,y,id])=>document.elementFromPoint(x,y)?.closest?.('[data-curve-handle]')?.dataset.curveHandle===id,
      [r.x+r.width/2,r.y+r.height/2,id])){anchorHandleBox=r;break}
  }
  assert.ok(anchorHandleBox,'Anchor Point tool must show reachable native Bézier handles')
  await page.mouse.move(anchorHandleBox.x+anchorHandleBox.width/2,anchorHandleBox.y+anchorHandleBox.height/2)
  await page.mouse.down()
  await page.mouse.move(anchorHandleBox.x+anchorHandleBox.width/2+17,anchorHandleBox.y+anchorHandleBox.height/2+16,{steps:7})
  await page.mouse.up()
  let anchorHandleEdited=await call({op:'snapshot'})
  for(let i=0;i<40&&anchorHandleEdited.revision<=curved.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));anchorHandleEdited=await call({op:'snapshot'})
  }
  assert.ok(anchorHandleEdited.revision>curved.revision,'Anchor Point handle drag did not commit a real Rust edit')
  assert.notDeepEqual(anchorHandleEdited.template.panels.find(p=>p.id===added.id).polygon.curves,
    shape.curves,'Anchor Point handle drag did not reshape the cubic')
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=revision,
    anchorHandleEdited.revision,{timeout:10000})
  // Direct Selection must also manipulate actual native cubic control
  // handles, not merely drag the contour corner.
  const nativeDirect=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="direct-select"]')
  await nativeDirect.scrollIntoViewIfNeeded()
  await nativeDirect.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='direct-select')
  await board.getByRole('button',{name:'Focus selected'}).click()
  const tangents=board.locator(`[data-curve-handle^="${added.id}:"]`)
  await tangents.first().waitFor({state:'visible',timeout:10000})
  let tangentBox=null
  for(let i=0;i<await tangents.count();i++){
    const candidate=tangents.nth(i),r=await candidate.boundingBox(),id=await candidate.getAttribute('data-curve-handle')
    if(r&&await page.evaluate(([x,y,id])=>document.elementFromPoint(x,y)?.closest?.('[data-curve-handle]')?.dataset.curveHandle===id,
      [r.x+r.width/2,r.y+r.height/2,id])){tangentBox=r;break}
  }
  assert.ok(tangentBox,'No native Bézier handle is unobstructed by a toolbar')
  await page.mouse.move(tangentBox.x+tangentBox.width/2,tangentBox.y+tangentBox.height/2)
  await page.mouse.down()
  await page.mouse.move(tangentBox.x+tangentBox.width/2+22,tangentBox.y+tangentBox.height/2-17,{steps:7})
  await page.mouse.up()
  let tangentEdited=await call({op:'snapshot'})
  for(let i=0;i<40&&tangentEdited.revision<=anchorHandleEdited.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));tangentEdited=await call({op:'snapshot'})
  }
  assert.ok(tangentEdited.revision>anchorHandleEdited.revision,
    'Direct Selection handle gesture must commit through Rust')
  assert.notDeepEqual(tangentEdited.template.panels.find(p=>p.id===added.id).polygon.curves,
    anchorHandleEdited.template.panels.find(p=>p.id===added.id).polygon.curves,'Direct Selection handle drag must really reshape the native curve')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'anchor-point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=revision,
    tangentEdited.revision,{timeout:10000})
  anchor=board.locator(`circle[data-panel-id="${added.id}"][data-pattern-anchor-index="1"]`)
  await anchor.waitFor({state:'visible'})
  await anchor.click({force:true})
  let flattened=await call({op:'snapshot'})
  for(let i=0;i<40&&flattened.revision<=tangentEdited.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));flattened=await call({op:'snapshot'})
  }
  assert.ok(flattened.revision>tangentEdited.revision,'Click on smooth anchor did not submit native conversion')
  assert.deepEqual(flattened.template.panels.find(p=>p.id===added.id).polygon.curves||{}, {},
    'Click should remove the curve handles and restore a sharp corner')
  // Illustrator Direct Selection must also edit an ALREADY committed native
  // garment piece through Rust, not just an uncommitted canvas-only draft.
  await nativeDirect.scrollIntoViewIfNeeded()
  await nativeDirect.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='direct-select')
  await board.locator(`path[data-panel="${added.id}"]`).first().click({force:true})
  const nativeVertex=board.locator(`circle[data-control-point="vertex"][data-panel-id="${added.id}"][data-pattern-anchor-index="1"]`)
  await nativeVertex.waitFor({state:'visible'})
  const nativeBox=await nativeVertex.boundingBox()
  await page.mouse.move(nativeBox.x+nativeBox.width/2,nativeBox.y+nativeBox.height/2)
  await page.mouse.down()
  await page.mouse.move(nativeBox.x+nativeBox.width/2+21,nativeBox.y+nativeBox.height/2+12,{steps:6})
  await page.mouse.up()
  let movedNative=await call({op:'snapshot'})
  for(let i=0;i<40&&movedNative.revision<=flattened.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));movedNative=await call({op:'snapshot'})
  }
  assert.ok(movedNative.revision>flattened.revision,
    'Direct Selection must commit the point movement through native Rust')
  const movedPanel=movedNative.template.panels.find(p=>p.id===added.id)
  const physical=panel=>panel.polygon.points.map(point=>point.map((value,k)=>value+panel.layout_2d[k]))
  const oldPhysical=physical(flattened.template.panels.find(p=>p.id===added.id)),newPhysical=physical(movedPanel)
  assert.ok(Math.hypot(...newPhysical[1].map((v,k)=>v-oldPhysical[1][k]))>.001,
    'Direct Selection must move the chosen native physical point')
  // Rust may materialize an intermediate station when remapping a real edge;
  // match native neighbors by material coordinates rather than array index.
  for(const index of [0,2,3])assert.ok(newPhysical.some(point=>
    Math.hypot(...point.map((v,k)=>v-oldPhysical[index][k]))<1e-7),
    'Direct Selection must retain each untouched native physical corner')
  // VectorCraft #1111: select a straight segment with ANCHOR POINT and pull
  // the line up/down. Endpoints stay in place; cubic controls save in Rust.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'anchor-point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  await board.getByRole('button',{name:'Focus selected'}).click()
  const reshapeEdges=board.locator(`[data-anchor-reshape-hit^="${added.id}:"]`)
  await reshapeEdges.first().waitFor({state:'visible'})
  let chosenReshape=null
  for(let i=0;i<await reshapeEdges.count()&&!chosenReshape;i++){
    const element=reshapeEdges.nth(i),edgeName=(await element.getAttribute('data-anchor-reshape-hit')).slice(added.id.length+1)
    for(const fraction of [.27,.43,.6,.73]){
      const candidate=await element.evaluate((el,f)=>{
        const p=el.getPointAtLength(el.getTotalLength()*f).matrixTransform(el.getScreenCTM())
        return [p.x,p.y]
      },fraction)
      const clear=await page.evaluate(([x,y,id])=>
        document.elementFromPoint(x,y)?.closest?.('[data-anchor-reshape-hit]')?.getAttribute('data-anchor-reshape-hit')===id,
        [...candidate,`${added.id}:${edgeName}`])
      if(clear){chosenReshape={edgeName,point:candidate};break}
    }
  }
  assert.ok(chosenReshape,'Anchor Point could not acquire any actual native pattern segment')
  const preReshape=await call({op:'snapshot'})
  const initialPolygon=preReshape.template.panels.find(p=>p.id===added.id)
  await page.mouse.move(...chosenReshape.point)
  await page.mouse.down()
  await page.mouse.move(chosenReshape.point[0],chosenReshape.point[1]-24,{steps:8})
  await board.locator('[data-native-cubic-preview]').waitFor({state:'visible',timeout:5000})
  const nativeLiveMeasure=board.locator('[data-native-cubic-length-cm]').first()
  // Some miniature zoomed contours put the label outside the viewport in
  // this stress test; its material-space geometry must still be computed.
  await nativeLiveMeasure.waitFor({state:'attached',timeout:5000})
  assert.ok(Number(await nativeLiveMeasure.getAttribute('data-native-cubic-length-cm'))>0)
  assert.ok(Number.isFinite(Number(await nativeLiveMeasure.getAttribute('data-native-cubic-length-delta-cm'))),
    'Curve adjustment must display an accurate changing arc length')
  await page.mouse.up()
  let reshaped=await call({op:'snapshot'})
  for(let i=0;i<40&&reshaped.revision<=preReshape.revision;i++){
    await new Promise(resolve=>setTimeout(resolve,150));reshaped=await call({op:'snapshot'})
  }
  assert.ok(reshaped.revision>preReshape.revision,'Dragging an Anchor Point line did not produce a Rust revision')
  const reshapedPolygon=reshaped.template.panels.find(p=>p.id===added.id)
  assert.ok(reshapedPolygon.polygon.curves?.[chosenReshape.edgeName],
    'Dragging a straight line must produce persisted native cubic handles on that edge')
  const preWorld=physical(initialPolygon),postWorld=physical(reshapedPolygon)
  assert.equal(postWorld.length,preWorld.length)
  for(let i=0;i<preWorld.length;i++)assert.ok(Math.hypot(...postWorld[i].map((v,k)=>v-preWorld[i][k]))<1e-7,
    'Reshape Segment must preserve all physical native corner coordinates')
  await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
    reshaped.revision,{timeout:10000})
  await board.getByRole('button',{name:'Frame all'}).click()
  await pen.focus()
  await pen.press('ArrowRight')
  assert.equal(await pen.getAttribute('aria-expanded'),'true','ArrowRight should open keyboard flyout')
  await page.keyboard.press('Escape')
  await page.waitForFunction(()=>document.querySelector('.exo-pattern-toolpanel [data-pattern-design-tool="vector-pen"]')?.getAttribute('aria-expanded')==='false',null,{timeout:3000})
  assert.equal(await pen.getAttribute('aria-expanded'),'false','Escape should close keyboard flyout')
  assert.equal(await board.locator('[data-pen-dimensions]').count(),0,
    'Pen measurements must NOT appear in a floating canvas widget')
  // Reference gesture: hold the Pen button, scrub sideways into an option,
  // release to choose without an additional click.
  const afterPen=await pen.boundingBox()
  await page.mouse.move(afterPen.x+afterPen.width/2,afterPen.y+afterPen.height/2)
  await page.mouse.down()
  await page.waitForTimeout(430)
  const penOption=menu.getByRole('menuitemradio',{name:'Pen Tool',exact:true})
  const penRect=await penOption.boundingBox()
  assert.ok(penRect,'Pen side flyout failed to appear during hold')
  await page.mouse.move(penRect.x+penRect.width/2,penRect.y+penRect.height/2,{steps:5})
  await page.mouse.up()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen')
  assert.equal(await pen.getAttribute('aria-expanded'),'false','Releasing over Pen should close the side dropdown')
  // Regression: a sibling switch must NOT clear two or three uncommitted Pen
  // anchors. Use actual press-and-hold UI and the same Rust-connected board.
  const v=await svg.evaluate(node=>{
    const box=node.viewBox.baseVal
    return {x:box.x,y:box.y,width:box.width,height:box.height}
  })
  const onScreen=async([x,y])=>svg.evaluate((node,p)=>{
    const at=new DOMPoint(p[0],p[1]).matrixTransform(node.getScreenCTM())
    return {x:at.x,y:at.y}
  },[x,y])
  const marks=[[.43,.62],[.54,.62],[.59,.72]].map(([x,y])=>[v.x+x*v.width,v.y+y*v.height])
  const firstMark=await onScreen(marks[0]);await page.mouse.click(firstMark.x,firstMark.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'1')
  const firstPreview=await onScreen([v.x+.57*v.width,v.y+.62*v.height])
  await page.mouse.move(firstPreview.x,firstPreview.y,{steps:6})
  const firstLength=board.locator('[data-pen-live-length]')
  await firstLength.waitFor({state:'visible',timeout:5000})
  const firstPosition=await firstLength.evaluate(node=>({
    x:Number(node.getAttribute('x')),y:Number(node.getAttribute('y')),
    metres:Number(node.getAttribute('data-pen-live-length-metres')),
    text:node.textContent.trim()
  }))
  assert.ok(firstPosition.metres>0,'Length must start before placing the second anchor')
  const firstAnchorY=Number(await board.locator('[data-vector-pen-anchor-hit="0"]').getAttribute('cy'))
  assert.ok(firstPosition.y>firstAnchorY+3e-4,
    'Live measurement must sit BELOW the first provisional line')
  const anotherPreview=await onScreen([v.x+.65*v.width,v.y+.62*v.height])
  await page.mouse.move(anotherPreview.x,anotherPreview.y,{steps:6})
  await page.waitForFunction(before=>Number(document.querySelector('.cc-board [data-pen-live-length]')
    ?.getAttribute('data-pen-live-length-metres'))>before,firstPosition.metres,{timeout:5000})
  assert.ok(await board.locator('[data-pen-dimensions]').count()===0,
    'No floating Pen measurements popup')
  // Clothing pattern scenario: choose inches while still in Pen, extend the
  // first line until the CLO-like label reads 28.00 in, then click. The
  // clicked geometry must be EXACTLY 28 inches, not just rounded text.
  const unitsButton=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="pen-units"]')
  await unitsButton.scrollIntoViewIfNeeded()
  await unitsButton.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.penUnit==='cm')
  await unitsButton.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board [data-pen-live-length]')?.getAttribute('data-line-length-unit')==='in')
  const propertyUnit=page.getByRole('combobox',{name:'Property Editor length unit'})
  await propertyUnit.waitFor({state:'visible'})
  await page.waitForFunction(()=>document.querySelector('select[aria-label="Property Editor length unit"]')?.value==='in',
    null,{timeout:7000})
  assert.equal(await propertyUnit.inputValue(),'in',
    'CLO inspector and Pen segment readout must use the same units')
  await propertyUnit.selectOption('cm')
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.penUnit==='cm')
  await propertyUnit.selectOption('in')
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.penUnit==='in')
  const point0=board.locator('[data-vector-pen-anchor-hit="0"]')
  const source=await point0.evaluate(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))])
  const desiredPoint=await point0.evaluate((node,meters)=>{
    // The actual canvas renders points inside an offset group. Transform
    // through the anchor's own CTM, not just the root SVG's viewBox.
    const xy=new DOMPoint(Number(node.getAttribute('cx'))+meters,
      Number(node.getAttribute('cy'))).matrixTransform(node.getScreenCTM())
    return {x:xy.x,y:xy.y}
  },28*.0254-.000017)
  await page.mouse.move(desiredPoint.x,desiredPoint.y,{steps:6})
  await page.waitForFunction(()=>document.querySelector('.cc-board [data-pen-live-length]')?.textContent?.includes('28.00 in'),
    null,{timeout:7000})
  const exactLabel=await firstLength.textContent()
  assert.ok(exactLabel.includes('28.00 in'))
  assert.equal(await firstLength.getAttribute('data-clo-inline-length'),'live')
  await page.screenshot({path:'integrations/clothcraft/output/qa-pen-clo-inline-28-inches-20261025.png'})
  await page.mouse.click(desiredPoint.x,desiredPoint.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'2')
  const inserted=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(nodes=>nodes.map(node=>
    [Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))]))
  const exactMetres=Math.hypot(inserted[1][0]-inserted[0][0],inserted[1][1]-inserted[0][1])
  assert.ok(Math.abs(exactMetres-28*.0254)<1e-9,
    'The line clicked at 28.00 in must actually measure 0.7112 native metres')
  const thirdMark=await onScreen(marks[2]);await page.mouse.click(thirdMark.x,thirdMark.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','Pen must create an unfinished 3-anchor draft')
  // The label is attached to the CURRENT geometric segment; extending the
  // cursor must change its actual length while no measurement panel appears.
  const hover1=await onScreen([v.x+.70*v.width,v.y+.72*v.height])
  const hover2=await onScreen([v.x+.76*v.width,v.y+.72*v.height])
  await page.mouse.move(hover1.x,hover1.y)
  await board.locator('[data-pen-live-length]').waitFor({state:'visible'})
  const shortLength=await board.locator('[data-pen-live-length]').textContent()
  await page.mouse.move(hover2.x,hover2.y)
  await page.waitForFunction(previous=>document.querySelector('.cc-board [data-pen-live-length]')?.textContent!==previous,
    shortLength,{timeout:4000})
  const longerLength=await board.locator('[data-pen-live-length]').textContent()
  assert.notEqual(shortLength,longerLength,'Live Pen length must update as the cursor moves')
  assert.ok(await board.locator('[data-pen-edge-length]').count()>=2,
    'Real segment lengths must be rendered directly alongside their path segments')
  assert.equal(await board.locator('[data-context-anchor-tools]').count(),0,
    'Pen drawing must remain unobstructed by contextual actions')
  const penControl=await pen.boundingBox()
  await page.mouse.move(penControl.x+penControl.width/2,penControl.y+penControl.height/2)
  await page.mouse.down();await page.waitForTimeout(430);await page.mouse.up()
  await menu.getByRole('menuitemradio',{name:'Anchor Point Tool',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3',
    'Changing Pen to Anchor Point deleted the unfinished path')
  // Reshape the LINE itself on an unfinished Pen path, just like VectorCraft
  // AnchorTool. This must not require committing it to Rust first.
  const draftShape=board.locator('[data-vector-pen-preview="cubic"]')
  const straightDraftPath=await draftShape.getAttribute('d')
  const draftVerticesBefore=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(nodes=>
    nodes.map(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))]))
  const draftSegmentPoint=await draftShape.evaluate(path=>{
    const xy=path.getPointAtLength(path.getTotalLength()*.21).matrixTransform(path.getScreenCTM())
    return [xy.x,xy.y]
  })
  await page.mouse.move(...draftSegmentPoint)
  await page.mouse.down()
  await page.mouse.move(draftSegmentPoint[0],draftSegmentPoint[1]-27,{steps:7})
  await page.mouse.up()
  await page.waitForFunction(previous=>
    document.querySelector('[data-vector-pen-preview="cubic"]')?.getAttribute('d')!==previous,
    straightDraftPath,{timeout:5000})
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3',
    'Pulling an unfinished Pen segment must not add or remove anchors')
  const draftVerticesAfter=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(nodes=>
    nodes.map(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))]))
  assert.deepEqual(draftVerticesAfter,draftVerticesBefore,
    'Draft segment reshape must not translate material anchor locations')
  const glass=board.locator('[data-context-anchor-tools="liquid-glass"]')
  await glass.waitFor({state:'visible',timeout:5000})
  const lastAnchor=board.locator('[data-vector-pen-anchor-hit="2"]')
  const anchorBox=await lastAnchor.boundingBox(),glassBox=await glass.boundingBox()
  assert.ok(anchorBox&&glassBox&&Math.hypot(glassBox.x-anchorBox.x,glassBox.y-anchorBox.y)<360,
    'Glass anchor actions must follow the actual pattern within 360 pixels')
  await page.mouse.move(anchorBox.x+anchorBox.width/2,anchorBox.y+anchorBox.height/2)
  await page.mouse.down()
  await page.mouse.move(anchorBox.x+anchorBox.width/2+24,anchorBox.y+anchorBox.height/2-19,{steps:5})
  await page.mouse.up()
  assert.ok(await board.locator('[data-vector-pen-handle="2:1"]').count()>=1,
    'Dragging an unfinished Pen anchor with its sibling tool must create smooth handles')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','Dragging anchor must not move/delete another draft vertex')
  await lastAnchor.click({force:true})
  await page.waitForFunction(()=>document.querySelectorAll('.cc-board [data-vector-pen-handle="2:1"]').length===0,
    null,{timeout:3000})
  assert.equal(await board.locator('[data-vector-pen-handle="2:1"]').count(),0,
    'Clicking the smooth draft anchor should restore its corner without deleting the path')
  // VectorCraft Direct Selection moves a single real draft anchor without
  // turning the same press into another Pen vertex or deleting its path.
  const direct=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="direct-select"]')
  await direct.scrollIntoViewIfNeeded();await direct.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='direct-select')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3')
  const originalAnchors=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(nodes=>
    nodes.map(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))]))
  const chosen=board.locator('[data-vector-pen-anchor-hit="1"]')
  const chooseBox=await chosen.boundingBox()
  await page.mouse.move(chooseBox.x+chooseBox.width/2,chooseBox.y+chooseBox.height/2)
  await page.mouse.down()
  await page.mouse.move(chooseBox.x+chooseBox.width/2+31,chooseBox.y+chooseBox.height/2-23,{steps:5})
  await page.mouse.up()
  const editedAnchors=await board.locator('[data-vector-pen-anchor-hit]').evaluateAll(nodes=>
    nodes.map(node=>[Number(node.getAttribute('cx')),Number(node.getAttribute('cy'))]))
  assert.equal(editedAnchors.length,3)
  assert.deepEqual(editedAnchors[0],originalAnchors[0])
  assert.deepEqual(editedAnchors[2],originalAnchors[2])
  assert.ok(Math.hypot(...editedAnchors[1].map((v,i)=>v-originalAnchors[1][i]))>0.001,
    'Direct Selection must really move the chosen anchor')
  assert.equal(await board.locator('[data-pen-edge-length]').count(),2,
    'Inline measurements must update while editing a draft anchor')
  // Return to Anchor Point for the add/remove controls.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
    {detail:{tool:'anchor-point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='anchor-point')
  await glass.getByRole('button',{name:'Add anchor point'}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='split')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3','Selecting + must not insert anything by itself')
  // Click the actual segment, rather than inserting after whichever point
  // happened to be selected before the user chose +.
  const mid=await board.locator('[data-vector-draft-split-hit]').evaluate(el=>{
    const p=el.getPointAtLength(el.getTotalLength()*.23).matrixTransform(el.getScreenCTM())
    return {x:p.x,y:p.y}
  })
  await page.mouse.click(mid.x,mid.y)
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'4',
    'Clicking the chosen Pen segment with + must create a real draft anchor')
  await svg.focus()
  await page.keyboard.press('-')
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='remove-anchor')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'4','Selecting − must not remove anything by itself')
  const insertedAnchor=board.locator('[data-vector-pen-anchor-hit="1"]')
  await insertedAnchor.click({force:true})
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3',
    'Clicking a chosen draft anchor with − must remove exactly that anchor')
  // Returning to Pen remains inside the same shared draft session.
  const back=await pen.boundingBox()
  await page.mouse.move(back.x+back.width/2,back.y+back.height/2)
  await page.mouse.down();await page.waitForTimeout(430);await page.mouse.up()
  await menu.getByRole('menuitemradio',{name:'Pen Tool'}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='vector-pen')
  assert.equal(await svg.getAttribute('data-vector-draft-count'),'3',
    'Changing Anchor Point back to Pen deleted the unfinished path')
  const beforeDraftCommit=await call({op:'snapshot'})
  await svg.focus();await page.keyboard.press('Enter')
  await page.waitForFunction(revision=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>revision,
    beforeDraftCommit.revision,{timeout:20000})
  const afterDraftCommit=await call({op:'snapshot'})
  assert.ok(afterDraftCommit.revision>beforeDraftCommit.revision,
    'Completed shared Pen/Anchor draft did not reach native Rust')
  const cutButton=page.locator('.exo-pattern-toolpanel [data-pattern-design-tool="native-cut-room"]')
  await cutButton.waitFor({state:'visible'})
  assert.equal(await page.locator('.cc-embedded-root > button.wide-action').count(),0,
    'Old floating CUT white button must be removed')
  const cutRequest=page.waitForRequest(request=>{
    try{return request.url().endsWith('/workspace')&&request.postDataJSON()?.op==='production-cutlines'}
    catch{return false}
  },{timeout:10000})
  await cutButton.click()
  await cutRequest
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,sidebarLongHold:true,illustratorSubtools:6,
    anchorDragCreatesNativeCurves:true,anchorClickRemovesNativeCurves:true,anchorPositionPreserved:true,
    keyboardFlyout:true,scrubReleaseSelect:true,penAnchorDraftPreserved:true,directSelectMovesSingleAnchor:true,
    noPenWidget:true,inlineLiveMeasurements:true,firstAnchorPreClickMeasurement:true,
    exact28InchPenPlacement:true,cloInlineSelectedUnits:true,inspectorUnitsSynced:true,
    draftSmoothCornerGestures:true,draftSegmentPullCurve:true,
    anchorToolNativeHandleMove:true,nativeSegmentPullCurve:true,
    glassNearPattern:true,draftPlusMinus:true,
    nativeDraftCommit:true,nativeDirectSelectionMovesOnePoint:true,nativeDirectHandleMove:true,
    cutButtonIn2dToolbar:true,cutButtonInvokesNative:true,
    revisions:[afterCreation.revision,curved.revision,anchorHandleEdited.revision,tangentEdited.revision,flattened.revision,movedNative.revision,reshaped.revision,afterDraftCommit.revision],pageErrors:errors.length}))
}finally{
  await browser?.close().catch(()=>{})
  for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
}
