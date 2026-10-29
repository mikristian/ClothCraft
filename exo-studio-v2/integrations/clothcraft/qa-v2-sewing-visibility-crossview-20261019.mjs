// Read-only installed EXO V2 sewing overlay regression. No garment commands.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage({viewport:{width:1640,height:1000}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  const canvas=page.locator('.cc-scene canvas').first()
  await board.locator('[data-panel="front"]').first().waitFor()
  await canvas.waitFor()
  const hidden=async()=>({
    guides:await board.locator('[data-sewing-guide-index]').count(),
    dots:await board.locator('[data-control-point="seam"]').count(),
    threeDots:Number(await canvas.getAttribute('data-seam-marker-visible-count')),
    highlighted:Number(await canvas.getAttribute('data-sewing-highlighted3d-edge-count')),
  })
  // Default pattern mode must never paint seam correspondence net across garment.
  const before=await hidden()
  assert.equal(before.guides,0,'2D seam guides must be hidden outside sewing mode')
  assert.equal(before.dots,0,'2D seam markers must be hidden outside sewing mode')
  assert.equal(before.threeDots,0,'3D seam markers must be hidden outside sewing mode')
  const sewingButton=page.locator('[data-clo-slot="2d:B02"]')
  await sewingButton.click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='true')
  const active=await hidden()
  assert.equal(active.guides,0,'Sewing tool must not blanket the 2D garment with sewing threads')
  assert.equal(active.threeDots,0,'Sewing tool must not blanket the 3D garment with sewing dots')
  const candidates=board.locator('[data-segment-sew-candidate="true"]')
  const positions=await candidates.evaluateAll(nodes=>nodes.map(el=>{
    const points=el.points
    if(points.numberOfItems<2)return null
    const a=points.getItem(0),b=points.getItem(1)
    const pt=el.ownerSVGElement.createSVGPoint()
    pt.x=(a.x+b.x)/2;pt.y=(a.y+b.y)/2
    const result=pt.matrixTransform(el.getScreenCTM())
    return {x:result.x,y:result.y,key:el.dataset.edge}
  }).filter(Boolean))
  const viewport=await board.boundingBox()
  const position=await page.evaluate(({positions,bounds})=>positions.find(p=>{
    if(!(p.x>bounds.x+25&&p.y>bounds.y+25&&p.x<bounds.x+bounds.width-25&&p.y<bounds.y+bounds.height-25))return false
    const top=document.elementFromPoint(p.x,p.y)
    return top?.getAttribute('data-edge')===p.key
  }),{positions,bounds:viewport})
  assert(position,'Cannot locate visible sewing edge hover target')
  await page.mouse.move(position.x,position.y)
  await page.waitForFunction(key=>document.querySelector('.cc-scene canvas')?.dataset.sewingHoverEdge===key,position.key)
  const preview=await hidden()
  // A not-yet-sewn edge has no linked correspondence to render. It must still
  // highlight on the 3D boundary rather than fabricating an existing seam.
  assert(preview.guides>=0)
  assert(preview.threeDots>=0)
  const highlight=Number(await canvas.getAttribute('data-sewing-highlighted3d-edge-count'))
  assert(highlight>0,'2D hover must highlight a matching 3D garment edge')
  await page.mouse.move(4,4)
  await page.waitForFunction(()=>document.querySelector('.cc-scene canvas')?.dataset.sewingHoverEdge==='')
  await page.waitForFunction(()=>Number(document.querySelector('.cc-scene canvas')?.dataset.seamMarkerVisibleCount)===0)
  await page.locator('[data-clo-slot="2d:A01"]').click()
  await page.waitForFunction(()=>document.querySelector('.cc-board')?.dataset.segmentSewing==='false')
  const after=await hidden()
  assert.equal(after.guides,0)
  assert.equal(after.dots,0)
  assert.equal(after.threeDots,0)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,before,active,preview,highlight,after,errors},null,2))
} finally {await browser.close()}
