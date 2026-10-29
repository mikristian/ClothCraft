import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Isolated browser context. Uses read-only sample math and does not edit the
// running design document or user storage.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-free-sewing',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const wasm=await import('/src/core/rustFreeSewingKernel.js')
    const sewing=await import('/src/core/freeSewingGeometry.js')
    const loaded=await wasm.initializeRustFreeSewingKernel()
    const coordinates=[[0,0],[.1,0],[.1,.1]]
    const indices=[0,1,2]
    return {loaded,backend:wasm.rustFreeSewingKernelStatus().backend,
      projection:sewing.projectFreeSewingPoint(indices,coordinates,[.11,.05]),
      station:sewing.freeSewingPointAtFraction(indices,coordinates,.75),
      range:sewing.freeSewingRangePoints(indices,coordinates,.2,.8)}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.backend,'rust-wasm')
  assert(Math.abs(result.projection.fraction-.75)<1e-10)
  assert(Math.abs(result.station[0]-.1)<1e-10)
  assert(Math.abs(result.station[1]-.05)<1e-10)
  assert.equal(result.range.length,3)
  console.log(JSON.stringify({pass:true,view:'EXO V2 live browser',...result}))
}finally{await browser.close()}
