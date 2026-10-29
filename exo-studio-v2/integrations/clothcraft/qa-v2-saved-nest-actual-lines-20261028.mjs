/** Verify saved Liquid Glass button controls six native graded size lines, not legacy state. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_UI_URL||'http://127.0.0.1:5995'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.addInitScript(()=>{
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify({version:1,workspace:{viewportLayout:'2d',customToolbars:[{id:'saved-nest-native-qa',savedSourceId:'saved-liquid-glass-grade-nest',name:'Liquid Glass · Nest XS–XXL',dock:'floating',buttonOnly:true,finish:'glass',visible:true,tools:['exo:grade-nest-xs-xxl'],x:180,y:155}]}}))
 })
 const page=await context.newPage()
 await page.route('**/workspace',async route=>{const headers={...route.request().headers()};delete headers.origin;const res=await route.fetch({url:'http://127.0.0.1:5385/workspace',headers});await route.fulfill({response:res,headers:{...res.headers(),'access-control-allow-origin':new URL(url).origin}})})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url+'/?desktop=1&engine=clothcraft&testSession=nest-actual-lines',{waitUntil:'domcontentloaded'})
 const button=page.locator('[data-custom-bar="saved-nest-native-qa"] .exo-liquid-glass-nest-action')
 await button.waitFor({timeout:30000})
 const board=page.locator('.cc-viewport-2d .cc-board')
 await page.waitForTimeout(1400)
 console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({board:document.querySelectorAll('.cc-board').length,view2d:document.querySelectorAll('.cc-viewport-2d').length,alerts:[...document.querySelectorAll('[role=alert],.cc-error,.clo-native-error')].map(e=>e.textContent?.slice(0,190)).slice(0,5),body:document.body.innerText.slice(-400)}))))
 const count=()=>page.locator('[data-accumark-grade-overlay] [data-grade-size]').count()
 const before=await count()
 await button.click()
 await page.waitForTimeout(300)
 const after=await count()
 console.log(JSON.stringify({before,after,pressed:await button.getAttribute('aria-pressed'),nativeOverlays:await page.locator('[data-accumark-grade-overlay]').count(),errors}))
 assert(after>before,'Nest activation must increase rendered per-size graded outlines')
 assert(after>=6,'All six XS–XXL size outlines should render')
 const sizes=await page.locator('[data-accumark-grade-overlay]').evaluateAll(nodes=>nodes.map(node=>({panel:node.getAttribute('data-accumark-grade-overlay'),sizes:[...node.querySelectorAll('[data-grade-size]')].map(item=>item.getAttribute('data-grade-size'))})))
 const expected=['XS','S','M','L','XL','XXL']
 assert(sizes.length>=2,'A full Nest must cover both real T-shirt pattern blocks')
 assert(sizes.every(item=>expected.every(size=>item.sizes.includes(size))),`Every block must include all six size outlines: ${JSON.stringify(sizes)}`)
 console.log('SIX_SIZE_OUTLINES_BY_PANEL',JSON.stringify(sizes))
 await button.click()
 await page.waitForTimeout(250)
 const off=await count()
 assert(off<after,'Second click must hide grade outlines')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,before,after,off}))
}finally{await browser.close()}
