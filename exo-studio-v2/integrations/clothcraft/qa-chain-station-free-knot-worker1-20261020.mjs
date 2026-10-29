// Isolated DOM QA: station drag followed by a new free-knot drag.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const ui='http://127.0.0.1:5297',bridge='http://127.0.0.1:5385'
const snapshot=async()=>{
 const r=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5284'},body:JSON.stringify({op:'snapshot'})});const data=await r.json();assert(data.ok);return data.data
}
const initial=await snapshot(),log=[]
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const page=await browser.newPage({viewport:{width:2200,height:1250}})
 await page.route('**/workspace',async route=>{
  const body=route.request().postDataJSON()
  if(body.op!=='snapshot'&&body.op!=='pause')return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:'read-only'})})
  const r=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5284'},body:JSON.stringify(body)})
  return route.fulfill({status:r.status,contentType:'application/json',body:await r.text()})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=worker1-gesture-chain',{waitUntil:'domcontentloaded'})
 await page.locator('[data-2d-pattern-piece="front"]').first().waitFor({state:'attached',timeout:30000})
 const twoD=page.getByRole('button',{name:'2D only',exact:true});if(await twoD.count())await twoD.first().click()
 const edit=page.getByRole('button',{name:'Edit Pattern',exact:true});if(await edit.count())await edit.first().click()
 const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true});if(await curve.count())await curve.first().click()
 else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
 const panel=page.locator('[data-2d-pattern-piece="front"]'),paper=panel.locator('[data-pattern-surface="drafting-paper"]')
 const station=panel.locator('[data-side-edit-station="front:side-left:between"] circle:first-child')
 await station.waitFor({state:'attached'})
 const state=async phase=>({phase,paper:await paper.getAttribute('data-paper-preview-state'),knots:await panel.locator('[data-free-curve-point]').count(),apply:await page.locator('[data-enable-curve-seam-ease="front:side-left"]').allTextContents(),paperD:(await paper.getAttribute('d'))?.length})
 log.push(await state('initial'))
 const r=await station.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2
 assert.equal(await station.evaluate((el,[x,y])=>document.elementFromPoint(x,y)===el,[x,y]),true)
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+22,y-12,{steps:6});await page.mouse.up()
 await page.waitForTimeout(250)
 log.push(await state('after station pointerup'))
 const knot=panel.locator('[data-free-curve-point^="front:side-left:"] circle:first-child').first()
 await knot.waitFor({state:'attached',timeout:3000})
 const k=await knot.boundingBox(),kx=k.x+k.width/2,ky=k.y+k.height/2
 const target=await knot.evaluate((el,p)=>({isSelf:document.elementFromPoint(p.x,p.y)===el,hit:document.elementFromPoint(p.x,p.y)?.outerHTML?.slice(0,240)}),{x:kx,y:ky})
 log.push({phase:'second target',target})
 await page.mouse.move(kx,ky);await page.mouse.down()
 log.push(await state('after second pointerdown'))
 await page.mouse.move(kx+15,ky-11,{steps:5})
 log.push(await state('during second drag'))
 await page.mouse.up();await page.waitForTimeout(250)
 log.push(await state('after second pointerup'))
 const final=await snapshot();assert.equal(final.revision,initial.revision);assert.deepEqual(final.template.panels,initial.template.panels)
 console.log(JSON.stringify({nativeUnchanged:true,log},null,2))
}finally{await browser.close()}
