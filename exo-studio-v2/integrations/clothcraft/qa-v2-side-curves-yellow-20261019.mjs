// Read-only visual regression probe. Never releases a pressed pointer over SVG.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_SIDE_QA_UI||process.env.EXO_CURVE_QA_UI||'http://127.0.0.1:5284'
const bridge=process.env.EXO_CURVE_QA_BRIDGE||'http://127.0.0.1:5385'
const report={ui,bridge,checks:[],warnings:[],errors:[]}
const check=(name,condition,detail)=>{report.checks.push({name,pass:Boolean(condition),detail})}
async function snapshot(){
  const response=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json',Origin:ui},body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(10000)})
  const json=await response.json();assert(json.ok,JSON.stringify(json));return json.data
}
let browser,page,before
try{
  before=await snapshot()
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',e=>report.errors.push(e.message))
  page.on('request',request=>{
    if(request.url().endsWith('/workspace')&&request.method()==='POST'){
      try{const data=request.postDataJSON();if(!['snapshot'].includes(data.op))report.errors.push('Unexpected native write request: '+data.op)}catch{}
    }
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=side-curve-yellow',{waitUntil:'domcontentloaded',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true});if(await twoD.count())await twoD.first().click()
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  await board.locator('[data-2d-edge-hit^="front:"]').first().waitFor({state:'attached',timeout:30000})
  const editPattern=page.getByRole('button',{name:'Edit Pattern',exact:true});if(await editPattern.count())await editPattern.first().click()
  const hits=await board.locator('[data-2d-edge-hit]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('data-2d-edge-hit')))])
  const side=hits.filter(id=>/side/i.test(id));check('side boundaries exist',side.length>0,{side,hits})
  const target=board.locator('[data-2d-edge-hit="front:side-left"]').first()
  await target.scrollIntoViewIfNeeded()
  const box=await target.boundingBox();assert(box,'side boundary must have screen bounds')
  const position=await target.evaluate(node=>{
    const p=node.points?.getItem(Math.floor(node.points.numberOfItems/2))
    const m=node.getScreenCTM();if(!p||!m)return null
    const v=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:v.x,y:v.y}
  })
  check('side midpoint can be found',Boolean(position),position)
  assert(position,'side midpoint unavailable')
  await page.mouse.move(position.x,position.y)
  await page.waitForTimeout(120)
  const hover=await board.locator('[data-cutline-hover-blue="true"]').evaluateAll(nodes=>nodes.map(n=>({stroke:n.getAttribute('stroke'),html:n.outerHTML.slice(0,180)})))
  check('vivid blue hover on side',hover.some(item=>item.stroke?.toLowerCase()==='#009dff'),hover)
  const guides=await board.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="center-front"] [data-center-guide-interval]').count()
  check('front center vertical guide visible',guides>0,{intervals:guides})
  const curveButton=page.getByRole('button',{name:'Edit Curve Point',exact:true})
  if(await curveButton.count())await curveButton.first().click()
  const mode=await board.locator('svg[data-native-tool]').getAttribute('data-native-tool')
  check('curve tool active',mode==='curve',{mode})
  // Selection is a read-only pointer move; pressing a boundary in curve mode
  // inserts a real free curve point and must never be done in this QA.
  // A second edge click creates a Shape. Guard the fixture before performing
  // exactly one safe selection click and verify no command leaves this page.
  const preselected=await board.locator('[data-active-curve-edge="true"]').evaluateAll(ns=>ns.map(n=>({edge:n.closest('[data-panel]')?.getAttribute('data-panel'),stroke:n.getAttribute('stroke')})))
  const selectedAlready=await board.locator('[data-2d-edge-hit="front:side-left"]').evaluate(node=>{
    const container=node.parentElement
    return !!container?.querySelector('[data-active-curve-edge="true"]')
  })
  if(selectedAlready)throw Error('Fixture already selected front:side-left; refusing second click that may commit Shape. '+JSON.stringify(preselected))
  await target.click({position:{x:Math.max(1,Math.min(box.width/2,box.width-1)),y:Math.max(1,Math.min(box.height/2,box.height-1))}})
  await page.waitForTimeout(180)
  const yellow=await target.evaluate(node=>[...node.parentElement.querySelectorAll('[data-active-curve-edge="true"]')].map(n=>({stroke:n.getAttribute('stroke'),width:n.getAttribute('stroke-width')})))
  check('persistent neon yellow selected side cutline',yellow.some(n=>n.stroke?.toLowerCase()==='#ffe600'),{selector:'[data-2d-edge-hit="front:side-left"] + parent [data-active-curve-edge="true"]',yellow})
  await page.mouse.move(0,0)
  await page.waitForTimeout(120)
  const persistent=await target.evaluate(node=>[...node.parentElement.querySelectorAll('[data-active-curve-edge="true"]')].map(n=>n.getAttribute('stroke')))
  check('yellow persists without hover',persistent.includes('#ffe600'),persistent)
  const arms=await board.locator('[data-bezier-arm^="front:side-left:"] [data-bezier-tangent-line]').evaluateAll(ns=>ns.map(n=>n.getAttribute('stroke')))
  check('selected side Bezier arms neon yellow',arms.length>0&&arms.every(n=>n?.toLowerCase()==='#ffe600'),{selector:'[data-bezier-arm^="front:side-left:"] [data-bezier-tangent-line]',arms})
  const seamEaseOptIn=await board.locator('[data-enable-curve-seam-ease="front:side-left"]').count()
  check('strict sewn side exposes explicit native-ease action without modifying sewing',seamEaseOptIn===1,
    {selector:'[data-enable-curve-seam-ease="front:side-left"]',count:seamEaseOptIn})
  const handles=board.locator('[data-curve-handle^="front:side-left:"]')
  if(await handles.count()){
    const handle=handles.first(),r=await handle.boundingBox()
    assert(r,'visible handle bounds')
    const x=r.x+r.width/2,y=r.y+r.height/2
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+12,y-9,{steps:6})
    const preview=await board.locator('[data-active-bezier-contour], [data-native-free-curve-preview] polyline').evaluateAll(ns=>ns.map(n=>({stroke:n.getAttribute('stroke'),selector:n.hasAttribute('data-active-bezier-contour')?'data-active-bezier-contour':'data-native-free-curve-preview polyline'})))
    const active=await board.locator('[data-active-curve-handle="true"]').evaluateAll(ns=>ns.map(n=>({stroke:n.getAttribute('stroke'),fill:n.getAttribute('fill')})))
    check('drag preview is bright yellow',preview.some(p=>p.stroke?.toLowerCase()==='#ffe600'),preview)
    check('active handle bright yellow',active.some(p=>p.stroke?.toLowerCase()==='#ffe600'),active)
    await page.locator('svg[data-native-tool]').first().dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true})
    await page.mouse.move(0,0)
    report.checks.push({name:'pointer cancelled without mouseup',pass:true})
  }else report.warnings.push('No front side-left Bézier handles after selecting side; drag preview skipped.')
  const after=await snapshot()
  check('native revision unchanged',after.revision===before.revision,{before:before.revision,after:after.revision})
  check('no browser/runtime/write errors',report.errors.length===0,report.errors)
  if(report.checks.some(c=>!c.pass))process.exitCode=1
}catch(error){report.errors.push(String(error.stack||error));process.exitCode=1}
finally{await browser?.close().catch(()=>{});console.log(JSON.stringify({...report,pass:process.exitCode!==1&&report.checks.every(c=>c.pass)},null,2))}
