import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.QA_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const bridge=await import('/src/core/rustPreDrapeCurvatureKernel.js')
    const {preDrapeDisplayPositions}=await import('/src/core/nativePreDrapeCurvature.js')
    const loaded=await bridge.initializeRustPreDrapeCurvatureKernel()
    const positions=Array.from({length:24},(_,i)=>[-.24+(i%6)*.096,1.2+Math.floor(i/6)*.12,-.12])
    const snapshot={positions,triangles:Array.from({length:22},(_,i)=>[i,i+1,i+2]),panels:[{triangles:[0,22]}],time:0}
    const shaped=preDrapeDisplayPositions(snapshot)
    const unchanged=preDrapeDisplayPositions({...snapshot,time:.1})===positions
    return {loaded,status:bridge.rustPreDrapeCurvatureStatus(),shaped:shaped!==positions,unchanged,
      difference:shaped.reduce((a,p,i)=>Math.max(a,Math.abs(p[2]-positions[i][2])),0),original:positions[0][2]}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.shaped,true)
  assert.equal(result.unchanged,true)
  assert.ok(result.difference>.01)
  assert.equal(result.original,-.12)
  console.log(JSON.stringify({pass:true,...result}))
} finally {await browser.close()}
