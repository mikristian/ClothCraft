import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Uses the running V2 browser app and no user document mutations.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const page=await browser.newPage({viewport:{width:1480,height:900}})
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-strain',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustStrainKernel.js')
    const view=await import('/src/core/clothcraftStrainView.js')
    const loaded=await kernel.initializeRustStrainKernel()
    const snapshot={uv:[[0,0],[1,0],[1,1],[0,1]],
      positions:[[0,0,0],[1.2,0,0],[1.2,1,0],[0,1,0]],
      triangles:[[0,1,2],[0,2,3]]}
    return {loaded,status:kernel.rustStrainKernelStatus(),
      extensions:view.vertexExtensions(snapshot),
      triangle:view.triangleExtension(snapshot.uv.slice(0,3),snapshot.positions.slice(0,3))}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.extensions.length,4)
  assert.ok(result.extensions.every(Number.isFinite))
  assert.ok(result.triangle > 0.19 && result.triangle < 0.21)
  console.log(JSON.stringify({pass:true,view:'EXO V2 browser Rust strain',...result}))
}finally{await browser.close()}
