// Regress the exact user's CLO-photo comparison on a disposable browser.
// All native writes are rejected, including side-curve and InternalLine edits.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const ui=process.env.EXO_PHOTO_QA_UI||'http://127.0.0.1:5284'
const bridge='http://127.0.0.1:5385/workspace'
const snapshot=async()=>{
  const r=await fetch(bridge,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot'})})
  const j=await r.json();assert(j.ok,j.error);return j.data
}
const original=await snapshot()
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={red:[],hover:[],curved:null,blockedWrites:[],errors:[]}
try{
  const page=await browser.newPage({viewport:{width:1800,height:1100}})
  page.on('pageerror',e=>report.errors.push(e.message))
  await page.route('**/workspace',async route=>{
    let op;try{op=route.request().postDataJSON()?.op}catch{}
    if(op&&!['snapshot','pause'].includes(op)){
      report.blockedWrites.push(op)
      await route.fulfill({status:409,contentType:'application/json',
        body:JSON.stringify({ok:false,error:'Read-only QA'})})
    }else await route.continue()
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const two=page.getByRole('button',{name:'2D only',exact:true})
  if(await two.count())await two.first().click()
  await page.locator('[data-2d-pattern-piece="front"]').waitFor({state:'attached'})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await page.locator('svg[data-native-tool="curve"]').waitFor({state:'attached'})
  const readGuide=async id=>page.locator('[data-guide-id="'+id+'"] polyline[data-guide-curve]').evaluate(el=>{
    const points=el.getAttribute('points').trim().split(/\s+/).map(pair=>pair.split(',').map(Number))
    const mid=points[Math.floor(points.length/2)]
    const p=new DOMPoint(mid[0],mid[1]).matrixTransform(el.getScreenCTM())
    return {points,mid:[p.x,p.y],stroke:el.getAttribute('stroke')}
  })
  // Every short red tick must physically START at a named native underarm
  // vertex, not at an invented triangle near the torso center.
  for(const name of ['front','back']){
    const p=original.template.panels.find(row=>row.id===name)
    const range=original.panels.find(row=>row.id===name)
    const g=page.locator('[data-red-dart-guides="'+name+'"]')
    assert.equal(await g.getAttribute('data-dart-style'),'short-point-tick')
    assert.equal(await g.locator('line').count(),2)
    assert.equal(await g.locator('path').count(),0,'Floating triangular dart is forbidden')
    const radians=(p.layout_rotation_degrees||0)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians)
    for(const edge of ['side-left','side-right']){
      const index=p.polygon.edges.indexOf(edge)
      assert(index>=0)
      const anchor=p.polygon.points[edge==='side-left'?(index+1)%p.polygon.points.length:index]
      const expected=[range.layout[0]+anchor[0]*c-anchor[1]*s,
        range.layout[1]+anchor[0]*s+anchor[1]*c]
      const line=g.locator('[data-red-dart-anchor-edge="'+edge+'"]')
      const actual=await line.evaluate(el=>({
        a:[Number(el.getAttribute('x1')),Number(el.getAttribute('y1'))],
        b:[Number(el.getAttribute('x2')),Number(el.getAttribute('y2'))],
        stroke:el.getAttribute('stroke')
      }))
      assert(Math.hypot(actual.a[0]-expected[0],actual.a[1]-expected[1])<.000001)
      assert(Math.abs(Math.hypot(actual.a[0]-actual.b[0],actual.a[1]-actual.b[1])-.0420476)<.001)
      assert.equal(actual.stroke,'#e03c42')
      report.red.push({panel:name,edge,physicalVertex:true,shortLine:true})
    }
  }
  // Independent whole half: gesture can curve ONLY left chest section.
  const id='front:chest:0:left',rightId='front:chest:0:right'
  const start=await readGuide(id),rightStart=await readGuide(rightId)
  await page.mouse.move(...start.mid)
  await page.mouse.down()
  await page.mouse.move(start.mid[0]+12,start.mid[1]-30,{steps:6})
  await page.waitForTimeout(150)
  const during=await readGuide(id)
  assert.notDeepEqual(during.points,start.points,'Yellow left curve does not actually change')
  assert.equal(during.stroke,'#ffe600','Dragging selected interval must be bright yellow')
  assert.deepEqual(during.points[0],start.points[0])
  assert.deepEqual(during.points.at(-1),start.points.at(-1))
  assert.deepEqual((await readGuide(rightId)).points,rightStart.points,
    'Changing left side illegally changed right side')
  await page.mouse.up()
  const committed=await readGuide(id)
  assert.deepEqual(committed.points,during.points,'Curved guide did not persist after pointer release')
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('[data-2d-pattern-piece="front"]').waitFor({state:'attached'})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'curve'}})))
  await page.locator('svg[data-native-tool="curve"]').waitFor({state:'attached'})
  assert.deepEqual((await readGuide(id)).points,committed.points,
    'Curved drafting interval was not recovered after reopen')
  report.curved={id,independent:true,brightYellow:true,endpointsUnchanged:true,localPersistence:true}
  // These are drafting guides only. They must not mutate the native
  // garment, create stray InternalLine writes or change 3D fabric geometry.
  const final=await snapshot()
  assert.equal(final.revision,original.revision)
  assert.deepEqual(final.template.panels,original.template.panels)
  assert.equal(report.blockedWrites.length,0)
  assert.deepEqual(report.errors,[])
  console.log(JSON.stringify({pass:true,revision:final.revision,...report},null,2))
}finally{await browser.close()}
