// Isolated, read-only renderer regression. Unlike the older 2D marquee test,
// this checks CAD mode with the avatar intentionally hidden by default.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage({viewport:{width:1512,height:900}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board').first()
  await board.locator('[data-panel="front"]').waitFor()
  const select=board.getByRole('toolbar',{name:'2D viewport quick tools'}).getByRole('button',{name:'Select / Transform',exact:true})
  await select.click()
  await board.locator('[data-panel="front"]').first().click()
  const marquee=board.locator('[data-2d-marquee="front"]')
  await marquee.waitFor()
  const measure=async()=>marquee.evaluate(root=>{
    const svg=root.ownerSVGElement
    const toPx=(element,dimension)=>{
      const box=element.getBoundingClientRect()
      return dimension==='width'?box.width:box.height
    }
    const handles=[...root.querySelectorAll('[data-2d-scale-guide]')]
    const rotation=root.querySelector('[data-2d-rotate]')
    return {
      count:handles.length,
      widths:handles.map(h=>toPx(h,'width')),
      heights:handles.map(h=>toPx(h,'height')),
      rotationDiameter:toPx(rotation,'width'),
      lineWidth:Number(root.querySelector('rect')?.getAttribute('stroke-width')),
      viewBox:svg.getAttribute('viewBox'),
    }
  })
  const initial=await measure()
  assert.equal(initial.count,8)
  assert(initial.widths.every(x=>Math.abs(x-7)<.5),'resize handles must render 7 CSS px')
  assert(initial.heights.every(x=>Math.abs(x-7)<.5),'resize handles must render 7 CSS px high')
  assert(Math.abs(initial.rotationDiameter-10)<.6,'rotation knob must render 10 CSS px')
  assert.equal(initial.lineWidth,.9)
  await board.locator('svg').first().hover({position:{x:180,y:180}})
  await page.mouse.wheel(0,-300)
  await page.waitForTimeout(160)
  const zoomed=await measure()
  assert.notEqual(zoomed.viewBox,initial.viewBox,'wheel should adjust CAD view')
  assert(zoomed.widths.every(x=>Math.abs(x-7)<.5),'handle sizes should remain stable after zoom')
  assert(Math.abs(zoomed.rotationDiameter-10)<.6,'rotation size should remain stable after zoom')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,initial,zoomed,pageErrors:errors},null,2))
} finally {
  await browser.close()
}
