import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:5208/docs/qa/hardware-curved-20261018/harness.html')
await page.evaluate(async()=>{
 const React=(await import('/node_modules/.vite/deps/react.js')).default
 const DOM=(await import('/node_modules/.vite/deps/react-dom_client.js')).default
 const {default:Library}=await import('/src/components/HardwareLibrary.jsx')
 document.body.innerHTML='<div id="qa" style="width:360px;background:#161b24;color:white"></div>'
 DOM.createRoot(document.getElementById('qa')).render(React.createElement(Library,{search:'zipper'}))
})
const tile=page.locator('[data-library-hover-id="hardware:metal-jeans-zipper"]')
console.log('tiles',await page.locator('[data-library-hover-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.libraryHoverId)))
await tile.hover();await page.locator('[data-model-status="loaded"]').waitFor({timeout:20000})
await page.getByLabel('Toggle zipper roll preview').click();await page.waitForTimeout(250)
assert.equal(await page.getByLabel('Toggle zipper roll preview').getAttribute('aria-pressed'),'true')
await page.locator('[data-library-preview]').screenshot({path:'/tmp/exo-catalog-zipper-roll.png'})
assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,actualCatalogHover:true,interactiveRoll:true,errors}))
}finally{await browser.close()}
