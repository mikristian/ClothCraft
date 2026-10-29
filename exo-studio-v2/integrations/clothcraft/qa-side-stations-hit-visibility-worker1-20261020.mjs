// Browser-only, actual trusted pointer QA. Every native mutation receives 409.
// One fresh tab per drag prevents a synthetic pointercancel followed by mouseup
// from accidentally committing a staged curve through pointer capture.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {curveDraftDimensions} from '../../src/core/patternCurveDrafting.js'

const ui=process.env.EXO_STATION_UI||'http://127.0.0.1:5297'
const bridge=process.env.EXO_STATION_BRIDGE||'http://127.0.0.1:5385'
const viewportWidth=Number(process.env.EXO_STATION_VIEWPORT_WIDTH||2200)
const viewportHeight=Number(process.env.EXO_STATION_VIEWPORT_HEIGHT||1250)
const split=process.env.EXO_STATION_SPLIT==='1'
const rpc=async input=>{
  const res=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5284'},body:JSON.stringify(input)})
  const out=await res.json();assert(out.ok,JSON.stringify(out));return out.data
}
const before=await rpc({op:'snapshot'})
const report={ui,revision:before.revision,viewportWidth,viewportHeight,split,stations:[],errors:[],blockedWrites:[]}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  for(const panelId of ['front','back'])for(const side of ['side-left','side-right'])for(const level of ['between','belly']){
    const id=`${panelId}:${side}:${level}`
    const page=await browser.newPage({viewport:{width:viewportWidth,height:viewportHeight}})
    page.on('pageerror',e=>report.errors.push({id,error:e.message}))
    await page.route('**/workspace',async route=>{
      const body=route.request().postDataJSON()
      if(!['snapshot','pause'].includes(body?.op)){
        report.blockedWrites.push({id,op:body?.op,kind:body?.command?.kind})
        return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:'QA prevents installed native writes'})})
      }
      const res=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://127.0.0.1:5284'},body:JSON.stringify(body)})
      return route.fulfill({status:res.status,contentType:'application/json',body:await res.text()})
    })
    try{
      await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=worker1-visible-stations',{waitUntil:'domcontentloaded',timeout:30000})
      await page.locator(`[data-2d-pattern-piece="${panelId}"]`).first().waitFor({state:'attached',timeout:30000})
      const twoD=page.getByRole('button',{name:'2D only',exact:true})
      if(!split&&await twoD.count())await twoD.first().click()
      const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
      if(await edit.count())await edit.first().click()
      const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true})
      if(await curve.count())await curve.first().click()
      else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
      const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool="curve"]')}).first()
      const panel=board.locator(`[data-2d-pattern-piece="${panelId}"]`)
      if(await panel.getAttribute('data-2d-pattern-selected')!=='true')await panel.locator('[data-pattern-surface="drafting-paper"]').dispatchEvent('click',{bubbles:true})
      assert.equal(await panel.getAttribute('data-2d-pattern-selected'),'true',`selection ${id}`)
      const marker=panel.locator(`[data-side-edit-station="${id}"] circle:first-child`)
      await marker.waitFor({state:'attached',timeout:10000})
      // Observe the board's own framing without Playwright scrolling it.
      const metadata=await marker.evaluate(node=>{
        const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2
        const hit=document.elementFromPoint(x,y)
        return {x,y,width:innerWidth,height:innerHeight,
          hitDirect:hit===node,hitTag:hit?.tagName,hitStation:hit?.closest('[data-side-edit-station]')?.getAttribute('data-side-edit-station')||null,
          hitPreview:hit?.outerHTML?.slice(0,240),markerPointer:getComputedStyle(node).pointerEvents,
          markerVisibility:getComputedStyle(node).visibility,markerDisplay:getComputedStyle(node).display,
          markers:[...document.querySelectorAll(`[data-editable-side-stations="${node.closest('[data-editable-side-stations]').getAttribute('data-editable-side-stations')}"] [data-side-edit-station]`)].length}
      })
      assert(metadata.x>=0&&metadata.y>=0&&metadata.x<metadata.width&&metadata.y<metadata.height,`off viewport ${id}: ${JSON.stringify(metadata)}`)
      assert.equal(metadata.hitDirect,true,`intercept ${id}: ${JSON.stringify(metadata)}`)
      assert.equal(metadata.markers,4,`missing markers ${id}`)
      const paper=panel.locator('[data-pattern-surface="drafting-paper"]')
      const original=await paper.getAttribute('d')
      const measures=panel.locator(`[data-curve-pattern-measurements="${panelId}"] [data-curve-measured-edge]`)
      const polygon=before.template.panels.find(p=>p.id===panelId).polygon
      const calculated=curveDraftDimensions(polygon)
      const labels=await measures.evaluateAll(els=>els.map(el=>({edge:el.getAttribute('data-curve-measured-edge'),cm:Number(el.getAttribute('data-curve-measured-length-cm'))})))
      assert.equal(labels.length,14,`14 labels ${id}`)
      for(const expected of calculated){const got=labels.find(r=>r.edge===expected.edge);assert(got&&Math.abs(got.cm-expected.length*100)<.0011,`edge ${id}:${expected.edge}`)}
      await page.evaluate(()=>{window.__stationPointerLog=[];for(const type of ['pointermove','pointerdown','pointercancel'])document.addEventListener(type,e=>{if(window.__stationPointerLog.length<40)window.__stationPointerLog.push({type,trusted:e.isTrusted,tag:e.target?.tagName,station:e.target?.closest?.('[data-side-edit-station]')?.getAttribute('data-side-edit-station'),x:e.clientX,y:e.clientY})},true)})
      await page.mouse.move(metadata.x,metadata.y)
      await page.mouse.down()
      await page.mouse.move(metadata.x+(side==='side-left'?18:-18),metadata.y-10,{steps:6})
      await page.waitForTimeout(120)
      const previewState=await paper.getAttribute('data-paper-preview-state')
      const moved=await paper.getAttribute('d')!==original
      const pointerLog=await page.evaluate(()=>window.__stationPointerLog)
      const svg=board.locator('svg[data-native-tool="curve"]')
      await svg.dispatchEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse',button:0,buttons:0,clientX:metadata.x+18,clientY:metadata.y-10})
      const result={id,metadata,pointerLog,previewState,paperChanged:moved,measurements:labels.length,cancelSent:true}
      report.stations.push(result)
      assert(pointerLog.some(p=>p.type==='pointerdown'&&p.trusted&&p.station===id),`real pointerdown hit ${id}: ${JSON.stringify(pointerLog)}`)
      assert(pointerLog.some(p=>p.type==='pointermove'&&p.trusted),`real pointermove ${id}`)
      assert.equal(previewState,'uncommitted-curve',`preview ${id}: ${JSON.stringify(result)}`)
      assert(moved,`paper unchanged ${id}`)
    }finally{await page.close()}
  }
  const after=await rpc({op:'snapshot'})
  assert.equal(after.revision,before.revision,'native revision mutated')
  assert.deepEqual(after.template.panels,before.template.panels,'native panels mutated')
  assert.deepEqual(report.errors,[],'browser errors')
  console.log(JSON.stringify({pass:true,...report},null,2))
}catch(e){console.error('STATION_QA_FAILURE',e.stack,JSON.stringify(report,null,2));process.exitCode=1}
finally{await browser.close()}
