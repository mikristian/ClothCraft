import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.QA_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const bridge=await import('/src/core/rustAutoFitPlacementKernel.js')
    const core=await import('/src/core/autoFitPlacement.js')
    const loaded=await bridge.initializeRustAutoFitPlacementKernel()
    const piece={particles:[{position:{x:1,y:2,z:3},previous:{copy(p){Object.assign(this,p)}}}]}
    const report=core.applyAutoFitPlacement(piece,{userPlacementDeltaX:2,userPlacementDeltaY:-2})
    return {loaded,status:bridge.rustAutoFitPlacementStatus(),report,
      position:piece.particles[0].position,previous:{x:piece.particles[0].previous.x,y:piece.particles[0].previous.y,z:piece.particles[0].previous.z}}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.ok(Math.abs(result.report.appliedMagnitudeM-.027)<1e-14)
  assert.deepEqual(result.position,result.previous)
  console.log(JSON.stringify({pass:true,...result}))
} finally { await browser.close() }
