// Read-only live UI test: a drag on a sewn curve must STAGE the exact polygon,
// not commit a rejected Shape or silently modify sewing. Never clicks Apply.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_CURVE_QA_UI||'http://127.0.0.1:5284'
const bridge=process.env.EXO_CURVE_QA_BRIDGE||'http://127.0.0.1:5385'
const targetEdge=process.env.EXO_CURVE_QA_EDGE||'front:side-left'
const snapshot=async()=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',headers:{
    'Content-Type':'application/json','Origin':ui},body:JSON.stringify({op:'snapshot'})})
  const data=await response.json()
  assert(data.ok,'Cannot inspect native fixture')
  return data.data
}
const original=await snapshot()
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={url:ui,revision:original.revision,results:[],unexpectedWrites:[],errors:[]}
try{
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>report.errors.push(error.message))
  await page.route('**/workspace',async route=>{
    if(route.request().method()==='POST'){
      const body=route.request().postDataJSON()
      if(!['snapshot','pause'].includes(body?.op)){
        report.unexpectedWrites.push({op:body.op,kind:body.command?.kind})
        await route.fulfill({status:409,contentType:'application/json',
          body:JSON.stringify({ok:false,error:'QA blocks all native edits'})})
        return
      }
    }
    await route.continue()
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=staged-sides',
    {waitUntil:'domcontentloaded',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true})
  if(await twoD.count())await twoD.first().click()
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  await board.locator(`[data-2d-edge-hit="${targetEdge}"]`).first().waitFor({state:'attached',timeout:25000})
  const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
  if(await edit.count())await edit.first().click()
  const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true})
  if(await curve.count())await curve.first().click()
  else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await board.locator('svg[data-native-tool="curve"]').waitFor({timeout:8000})
  const target=board.locator(`[data-2d-edge-hit="${targetEdge}"]`).first()
  const mid=await target.evaluate(node=>{
    const points=node.points
    const p=points.getItem(Math.floor(points.numberOfItems/2))
    const screen=new DOMPoint(p.x,p.y).matrixTransform(node.getScreenCTM())
    return {x:screen.x,y:screen.y}
  })
  await page.mouse.click(mid.x,mid.y)
  const pendingButton=board.locator(`[data-enable-curve-seam-ease="${targetEdge}"]`)
  await pendingButton.waitFor({timeout:6000})
  assert.match(await pendingButton.innerText(),/Allow different sewn-edge lengths/)
  const handle=board.locator(`[data-curve-handle^="${targetEdge}:"]`).first()
  await handle.waitFor({state:'attached',timeout:6000})
  const box=await handle.boundingBox()
  assert(box,'Side Bézier handle must be physically visible')
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
  await page.mouse.down()
  await page.mouse.move(box.x+box.width/2+14,box.y+box.height/2-12,{steps:7})
  await page.mouse.up()
  await page.waitForTimeout(380)
  assert.match(await pendingButton.innerText(),/Apply this yellow curve/)
  assert(await board.locator('[data-active-bezier-contour]').count()>0,'Proposed curve preview should not snap away before approval')
  assert.deepEqual(report.unexpectedWrites,[],'A curve drag with strict sewn edges must never write before user opts in')
  const after=await snapshot()
  assert.equal(after.revision,original.revision,'Strict seam preview modified real native project')
  assert.deepEqual(after.template.seams,original.template.seams,'Strict seam preview modified production sewing')
  assert.deepEqual(report.errors,[],'Browser/runtime errors found')
  report.results.push({edge:targetEdge,staged:true,previewStillVisible:true,
    cta:await pendingButton.innerText(),committed:false})
  console.log(JSON.stringify({...report,pass:true},null,2))
}finally{await browser.close()}
