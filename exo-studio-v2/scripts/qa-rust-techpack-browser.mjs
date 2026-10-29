import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-techpack',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustMeasurementKernel.js')
    const loaded=await kernel.initializeRustMeasurementKernel()
    const bounds=[{points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],
      levels:[3,6,14,17]}]
    return {loaded,status:kernel.rustMeasurementKernelStatus(),
      spans:kernel.measureHorizontalSpans(bounds)[0]}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.deepEqual(result.spans,[10,10,10,10])
  console.log(JSON.stringify({pass:true,view:'EXO V2 browser Techpack POM',...result}))
}finally {await browser.close()}
