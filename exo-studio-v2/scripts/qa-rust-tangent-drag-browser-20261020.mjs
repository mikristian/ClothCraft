// Read-only source browser acceptance: no persisted garment or installed app writes.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const context=await browser.newContext({viewport:{width:1280,height:800}})
  const page=await context.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustTangentDragKernel.js')
    const drag=await import('/src/core/freeTangentDrag.js')
    const ready=await kernel.initializeRustTangentDragKernel()
    return {
      ready,
      status:kernel.rustTangentDragKernelStatus(),
      incoming:drag.freeTangentDragDelta([.018,-.036],'in'),
      outgoing:drag.freeTangentDragDelta([.018,-.036],'out'),
      invalid:drag.freeTangentDragDelta([Number.NaN,0],'in'),
      absent:drag.freeTangentDragDelta([0,.018],'bad'),
    }
  })
  assert.equal(result.ready,true)
  assert.equal(result.status.backend,'rust-wasm')
  for(const [actual,expected] of [
    [result.incoming,[-.1,.2]],
    [result.outgoing,[.1,-.2]],
  ])for(let axis=0;axis<2;axis++){
    assert.ok(Math.abs(actual[axis]-expected[axis])<1e-12,
      `axis ${axis}: got ${actual[axis]}, expected ${expected[axis]}`)
  }
  assert.equal(result.invalid,null)
  assert.equal(result.absent,null)
  console.log(JSON.stringify({pass:true,...result}))
} finally {await browser.close()}
