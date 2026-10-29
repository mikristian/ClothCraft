import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Uses a local sample seam inside an isolated browser, without writing the
// user's existing project or touching the native simulator.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const page=await browser.newPage({viewport:{width:1380,height:850}})
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-interval-metrics',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const bridge=await import('/src/core/rustSelectionMetricsKernel.js')
    const measured=await import('/src/core/clothcraftSelectionMetrics.js')
    const loaded=await bridge.initializeRustSelectionMetricsKernel()
    const snapshot={revision:3,uv:[[0,0],[.1,0],[.1,.1]],
      positions:[[0,0,0],[.12,0,0],[.12,.12,0]],
      panels:[{id:'body',boundaries:{side:[0,1,2]}}],
      template:{seams:[{id:'side-seam',a:{panel:'body',edge:'side',range:[.25,.75]},
        b:{panel:'body',edge:'side',range:[.25,.75]}}]}}
    const value=measured.measureNativeSelection(snapshot,{seamId:'side-seam'})
    return {loaded,backend:bridge.rustSelectionMetricsReady()?'rust-wasm':'javascript-fallback',value}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.backend,'rust-wasm')
  assert.equal(result.value.kind,'sewing')
  assert(Math.abs(result.value.first.length2DCm-10)<1e-10)
  assert(Math.abs(result.value.first.length3DCm-12)<1e-10)
  assert.deepEqual(result.value.second,result.value.first)
  console.log(JSON.stringify({pass:true,view:'EXO V2 browser seam metrics',...result}))
} finally {await browser.close()}
