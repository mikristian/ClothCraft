// Narrow browser acceptance for the real Vite-served Rust split adapter.
// Does not depend on toolbar labels or modify the user's garment document.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const origin=process.env.EXO_SPLIT_QA_ORIGIN ?? 'http://127.0.0.1:5188'
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.EXO_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
try {
  const page=await browser.newPage()
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  await page.goto(`${origin}/?testSession=rust-split-kernel-smoke`,{waitUntil:'domcontentloaded'})
  const actual=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustSplitKernel.js')
    const drafting=await import('/src/core/draftingSplit.js')
    const ready=await kernel.initializeRustSplitKernel()
    const piece={points:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],curves:{0:{cx:18,cy:20}}}
    return {
      ready,status:kernel.rustSplitKernelStatus(),
      fractions:drafting.draftingSplitFractions(piece,0,{method:'uniform',count:4}),
      curved:drafting.splitParameterAtArcFraction(piece,0,0.25),
    }
  })
  assert.equal(actual.ready,true,JSON.stringify(actual.status))
  assert.equal(actual.status.backend,'rust-wasm')
  assert.deepEqual(actual.fractions,[0.25,0.5,0.75])
  assert.ok(actual.curved>0 && actual.curved<1)
  assert.deepEqual(pageErrors,[])
  console.log(JSON.stringify({pass:true,origin,...actual}))
} finally { await browser.close() }
