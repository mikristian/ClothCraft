// Read-only browser QA. Routes EVERY mutation to a hard 409; only snapshots may
// reach the user's native bridge. No installed native, project or Board writes.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {evaluateFreeCurve} from '../../src/core/nativeFreeCurvePoints.js'
import {sideCurveStation,torsoSideCurveStations,curveDraftDimensions} from '../../src/core/patternCurveDrafting.js'

const ui=process.env.EXO_STATION_QA_UI||'http://127.0.0.1:5284'
const bridge=process.env.EXO_STATION_QA_BRIDGE||'http://127.0.0.1:5385'
const snapshot=async()=>{const res=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':ui},body:JSON.stringify({op:'snapshot'})});const json=await res.json();assert(json.ok,'Read-only source snapshot unavailable: '+JSON.stringify(json.error));return json.data}
const initial=await snapshot()
let browser
const report={ui,sourceRevision:initial.revision,panels:[],blockedWriteAttempts:[],pageErrors:[]}
try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  // Keep full board and inspector in view. At narrower widths the pattern
  // station can sit under the expanded right-side Information accordion.
  const page=await browser.newPage({viewport:{width:2200,height:1200}})
  page.on('pageerror',e=>report.pageErrors.push(e.message))
  await page.route('**/workspace',async route=>{
    const request=route.request(),body=request.method()==='POST'?request.postDataJSON():null
    if(body&&!['snapshot','pause'].includes(body.op)){
      report.blockedWriteAttempts.push({op:body.op,kind:body.command?.kind})
      await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:'read-only QA blocks installed native writes'})})
      return
    }
    await route.continue()
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=side-station-qa',{waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('[data-2d-pattern-piece="front"]').first().waitFor({state:'attached',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true})
  if(await twoD.count())await twoD.first().click()
  const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
  if(await edit.count())await edit.first().click()
  const curve=page.getByRole('button',{name:'Edit Curve Point',exact:true})
  if(await curve.count())await curve.first().click()
  else await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool="curve"]')}).first()
  await board.waitFor({timeout:15000})
  for(const panelId of ['front','back']){
    const polygon=initial.template.panels.find(p=>p.id===panelId)?.polygon
    assert(polygon, 'Missing native '+panelId)
    const panel=board.locator('[data-2d-pattern-piece="'+panelId+'"]')
    await panel.waitFor({state:'attached'})
    // Dispatch directly to the paper so overlapping guide and station hit
    // targets cannot intercept selection of the back panel.
    if(await panel.getAttribute('data-2d-pattern-selected')!=='true')
      await panel.locator('[data-pattern-surface="drafting-paper"]').dispatchEvent('click',{bubbles:true})
    assert.equal(await panel.getAttribute('data-2d-pattern-selected'),'true','Failed to select '+panelId)
    const markers=panel.locator('[data-editable-side-stations="'+panelId+'"] [data-side-edit-station]')
    await markers.first().waitFor({state:'attached',timeout:8000})
    assert.equal(await markers.count(),4,panelId+' needs two intermediate plus two belly native-spline stations')
    const guide=panel.locator('[data-2d-guide-track="waist"],[data-2d-guide-track="belly"]')
    const stationRecords=[]
    for(const side of ['side-left','side-right']){
      const sideMarkers=[]
      for(const level of ['between','belly']){
        const marker=panel.locator('[data-side-edit-station="'+panelId+':'+side+':'+level+'"]')
        assert.equal(await marker.count(),1, 'Missing '+panelId+':'+side+':'+level)
        const obj=await marker.evaluate(node=>{const dot=node.querySelector('circle:last-of-type');return {t:Number(node.getAttribute('data-side-edit-station-t')),point:[Number(dot.getAttribute('cx')),Number(dot.getAttribute('cy'))]}})
        const material=evaluateFreeCurve(polygon,side,obj.t)
        assert(material?.every(Number.isFinite),'Invalid material spline station')
        // Source-param t is published at 8 decimal places: tolerate its
        // expected subnanometre rounding, but never an arbitrary guide dot.
        assert(obj.t>.008&&obj.t<.992,'Station parameter must remain internal')
        sideMarkers.push({level,...obj,material})
        if(level==='belly'){
          assert(await guide.count()>0,'Missing physical belly horizontal guide')
          const guideDistance=await guide.evaluateAll((groups,point)=>{
            const endpoints=groups.flatMap(group=>[
              ...[...group.querySelectorAll('line')].flatMap(line=>[
                [Number(line.getAttribute('x1')),Number(line.getAttribute('y1'))],
                [Number(line.getAttribute('x2')),Number(line.getAttribute('y2'))]
              ]),
              ...[...group.querySelectorAll('polyline[data-guide-curve]')].flatMap(polyline=>{
                const points=polyline.points
                return points?.numberOfItems?[
                  [points.getItem(0).x,points.getItem(0).y],
                  [points.getItem(points.numberOfItems-1).x,points.getItem(points.numberOfItems-1).y]
                ]:[]
              })
            ])
            return endpoints.length?Math.min(...endpoints.map(p=>Math.hypot(p[0]-point[0],p[1]-point[1]))):Infinity
          },obj.point)
          assert(guideDistance<0.002,'Belly station must hit actual guide endpoint, delta='+guideDistance)
        }
      }
      assert(sideMarkers[0].material[1]<sideMarkers[1].material[1],'Between marker should precede belly')
      stationRecords.push({side,markers:sideMarkers})
    }
    const rows=curveDraftDimensions(polygon)
    assert.equal(rows.length,14,'Expected 14 named native outline edges')
    const overlay=panel.locator('[data-curve-pattern-measurements="'+panelId+'"]')
    await overlay.waitFor({state:'attached',timeout:8000})
    const displayed=await overlay.locator('[data-curve-measured-edge]').evaluateAll(nodes=>nodes.map(n=>({edge:n.getAttribute('data-curve-measured-edge'),cm:Number(n.getAttribute('data-curve-measured-length-cm')),text:n.textContent})))
    assert.equal(displayed.length,14,'Physical cm overlay should have all 14 edges')
    for(const row of rows){
      const got=displayed.find(item=>item.edge===row.edge)
      assert(got,'Missing measured edge '+row.edge)
      assert(Math.abs(got.cm-row.length*100)<.0011,'Physical length mismatch '+row.edge)
      assert.match(got.text,/cm/)
    }
    const paper=panel.locator('[data-pattern-surface="drafting-paper"]')
    const before=await paper.getAttribute('d')
    const station=panel.locator('[data-side-edit-station="'+panelId+':side-left:between"] circle:first-child')
    const box=await station.boundingBox();assert(box,'No physical station hit area')
    const x=box.x+box.width/2,y=box.y+box.height/2
    const hit=await station.evaluate((node,p)=>{
      const found=document.elementFromPoint(p.x,p.y)
      return {direct:found===node,tag:found?.tagName,station:found?.closest('[data-side-edit-station]')?.getAttribute('data-side-edit-station'),pointerEvents:found?getComputedStyle(found).pointerEvents:null,html:found?.outerHTML?.slice(0,420),ancestor:found?.parentElement?.outerHTML?.slice(0,200)}
    },{x,y})
    assert(hit.direct,'Pointer center intercepted: '+JSON.stringify(hit))
    await page.mouse.move(x,y)
    await page.mouse.down()
    await page.mouse.move(x+18,y-10,{steps:5})
    await page.waitForTimeout(150)
    const active=await paper.getAttribute('data-paper-preview-state')
    const changed=await paper.getAttribute('d')
    assert.equal(active,'uncommitted-curve','Preview must use proposed outline path')
    assert.notEqual(changed,before,'Filled paper silhouette must move with native side drag')
    await board.locator('svg[data-native-tool="curve"]').dispatchEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse',button:0,buttons:0,clientX:x+18,clientY:y-10})
    // Avoid mouse.up(): any pointerup would intentionally invoke Shape commit.
    report.panels.push({panel:panelId,stations:stationRecords,edgeMeasurements:displayed.length,paperPreviewChanged:true,pointerCancelSent:true})
  }
  const final=await snapshot()
  assert.equal(final.revision,initial.revision,'QA changed native garment revision')
  assert.deepEqual(final.template.panels,initial.template.panels,'QA modified native polygon')
  assert.deepEqual(report.pageErrors,[],'Browser errors')
  console.log(JSON.stringify({pass:true,readOnly:true,...report},null,2))
}finally{await browser?.close()}
