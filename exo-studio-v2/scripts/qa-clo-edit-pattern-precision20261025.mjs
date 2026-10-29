import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-clo-edit-precision-'))
const api='http://127.0.0.1:5449',ui='http://127.0.0.1:5286',children=[]
const start=(cmd,args,env={})=>children.push(spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}}))
const wait=async url=>{
  for(let i=0;i<100;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(750)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Service unavailable: '+url)
}
const call=async body=>{
  const response=await(await fetch(api+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)})).json()
  assert.ok(response.ok,response.error||JSON.stringify(response).slice(0,400))
  return response.data
}
const nextRevision=async earlier=>{
  let snapshot=await call({op:'snapshot'})
  for(let i=0;i<45&&snapshot.revision<=earlier;i++){
    await new Promise(resolve=>setTimeout(resolve,120))
    snapshot=await call({op:'snapshot'})
  }
  assert.ok(snapshot.revision>earlier,'Rust revision did not advance')
  return snapshot
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5449',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')})
  start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5286','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:api})
  await Promise.all([wait(ui),wait(api+'/health')])
  await call({op:'open',preset:'tshirt'})
  const initial=await call({op:'snapshot'}),ids=new Set(initial.template.panels.map(p=>p.id))
  await call({op:'edit',revision:initial.revision,command:{kind:'Polygon',
    fabric:initial.template.fabrics[0].id,
    points:[[-.66,.17],[-.36,.17],[-.36,.46],[-.66,.46]],
    tangents:[[0,0],[0,0],[0,0],[0,0]]}})
  const created=await call({op:'snapshot'}),target=created.template.panels.find(p=>!ids.has(p.id))
  assert.ok(target)
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1510,height:965}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=cloParity20261025',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board'),svg=board.locator('svg[data-native-tool]').first()
  await svg.waitFor({state:'visible',timeout:40000})
  await page.locator('[data-tool-family="collapse-3d"] > button').first().click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='2d')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'point'}})))
  await page.waitForFunction(()=>document.querySelector('.cc-board svg[data-native-tool]')?.dataset.nativeTool==='point')
  await board.locator(`[data-2d-edge-hit^="${target.id}:"]`).first().dispatchEvent('click')
  const vertex=i=>board.locator(`[data-control-point="vertex"][data-panel-id="${target.id}"][data-pattern-anchor-index="${i}"]`)
  await vertex(0).waitFor({state:'visible'})
  await page.keyboard.down('Shift')
  await vertex(0).click({force:true})
  await vertex(1).click({force:true})
  await page.keyboard.up('Shift')
  assert.equal(await vertex(0).getAttribute('data-clo-multi-selected'),'true')
  assert.equal(await vertex(1).getAttribute('data-clo-multi-selected'),'true')
  const precision=board.locator('[data-clo-precision-edit]')
  await precision.waitFor({state:'visible'})
  assert.ok((await precision.textContent()).includes('2 selected native point'))
  const nativeUnits=await board.getAttribute('data-pen-unit')
  const units={mm:.001,cm:.01,in:.0254,m:1}
  assert.ok(units[nativeUnits])
  const delta=.01
  await precision.getByRole('textbox',{name:'Move selected X'}).fill(String(delta/units[nativeUnits]))
  await precision.getByRole('textbox',{name:'Move selected Y'}).fill('0')
  await precision.locator('[data-clo-apply-multi-point]').click()
  const moved=await nextRevision(created.revision)
  const before=created.template.panels.find(p=>p.id===target.id)
  const after=moved.template.panels.find(p=>p.id===target.id)
  const world=panel=>panel.polygon.points.map(point=>point.map((value,i)=>value+panel.layout_2d[i]))
  const origin=world(before),updated=world(after)
  for(const index of [0,1])assert.ok(Math.abs(updated[index][0]-origin[index][0]-delta)<1e-7)
  for(const index of [2,3])assert.ok(Math.hypot(...updated[index].map((v,j)=>v-origin[index][j]))<1e-7)

  await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
    moved.revision,{timeout:10000})
  const edgeName=after.polygon.edges[1],edge=board.locator(`[data-2d-edge-hit="${target.id}:${edgeName}"]`).first()
  await edge.waitFor({state:'attached'})
  await edge.click({button:'right',force:true})
  await precision.getByRole('textbox',{name:'Change Length target'}).waitFor({state:'visible'})
  await precision.getByRole('combobox',{name:'Change Length location'}).selectOption('end')
  const initialLength=Math.hypot(...after.polygon.points[2].map((v,i)=>v-after.polygon.points[1][i]))
  const exactTarget=initialLength+.0127
  await precision.getByRole('textbox',{name:'Change Length target'}).fill(String(exactTarget/units[nativeUnits]))
  await precision.locator('[data-clo-apply-change-length]').click()
  const lengthChanged=await nextRevision(moved.revision)
  const changed=lengthChanged.template.panels.find(p=>p.id===target.id)
  const actual=Math.hypot(...changed.polygon.points[2].map((v,i)=>v-changed.polygon.points[1][i]))
  assert.ok(Math.abs(actual-exactTarget)<1e-8,'Native Change Length exact length mismatch')
  assert.deepEqual(changed.polygon.edges,after.polygon.edges)
  await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
    lengthChanged.revision,{timeout:10000})
  // CLO gesture: dragging any Shift-selected point moves the entire native
  // selection as one Shape transaction, not just the grabbed corner.
  const selectedPoint=vertex(0),box=await selectedPoint.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2-18,{steps:7})
  await page.mouse.up()
  const dragged=await nextRevision(lengthChanged.revision)
  const physicalBefore=world(changed),physicalAfter=world(dragged.template.panels.find(p=>p.id===target.id))
  const moved0=physicalAfter[0].map((v,i)=>v-physicalBefore[0][i])
  const moved1=physicalAfter[1].map((v,i)=>v-physicalBefore[1][i])
  assert.ok(Math.hypot(...moved0)>.001,'Dragging selected anchor did not move group')
  assert.ok(Math.hypot(...moved0.map((v,i)=>v-moved1[i]))<1e-7,
    'Native group drag must translate both selected points equally')
  for(const index of [2,3])assert.ok(Math.hypot(...physicalAfter[index].map((v,i)=>v-physicalBefore[index][i]))<1e-7,
    'Unselected corners moved during group drag')
  await page.waitForFunction(rev=>Number(document.querySelector('.cc-board')?.dataset.documentRevision)>=rev,
    dragged.revision,{timeout:10000})
  const corners=await Promise.all([0,1,2,3].map(async i=>vertex(i).boundingBox()))
  assert.ok(corners.every(Boolean),'Native points unavailable for CLO marquee')
  const minX=Math.min(...corners.map(r=>r.x))-14,minY=Math.min(...corners.map(r=>r.y))-14
  const maxX=Math.max(...corners.map(r=>r.x+r.width))+14,maxY=Math.max(...corners.map(r=>r.y+r.height))+14
  await page.keyboard.down('Shift')
  await page.mouse.move(minX,minY)
  await page.mouse.down()
  await page.mouse.move(maxX,maxY,{steps:10})
  await board.locator('[data-clo-native-point-marquee]').waitFor({state:'attached'})
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const selectedAfterMarquee=await board.locator(`[data-control-point="vertex"][data-panel-id="${target.id}"][data-clo-multi-selected="true"]`).count()
  assert.equal(selectedAfterMarquee,4,'Shift marquee must select all four enclosed native points')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,shiftSelected:2,nativeMultiMoveDeltaM:delta,
    nativeLengthTargetM:exactTarget,nativeLengthActualM:actual,
    groupDragDeltaM:moved0,marqueeSelected:selectedAfterMarquee,
    revisions:[created.revision,moved.revision,lengthChanged.revision,dragged.revision],errors:0}))
}finally{
  await browser?.close()
  for(const child of children){try{process.kill(-child.pid,'SIGTERM')}catch{}}
}
