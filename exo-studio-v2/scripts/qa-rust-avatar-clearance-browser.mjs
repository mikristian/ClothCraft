import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.EXO_QA_URL || 'http://127.0.0.1:5297/', {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const k=await import('/src/core/rustAvatarClearanceKernel.js')
    const physics=await import('/src/core/physics.js')
    const THREE=await import('/node_modules/three/build/three.module.js')
    const loaded=await k.initializeRustAvatarClearanceKernel()
    const before=k.rustAvatarClearanceKernelStatus().calls
    const values=[]
    for(const avatar of [{},{heightCm:145,chestCm:60,armAngleDeg:90},{heightCm:195,chestCm:115,armAngleDeg:35}]) {
      for(const p of [[0,1.25,0],[.3,1.1,.1],[0,1.85,0]]) {
        values.push(physics.avatarClearance(new THREE.Vector3(...p),avatar))
      }
    }
    return {loaded,before,status:k.rustAvatarClearanceKernelStatus(),values}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.ok(result.status.calls>result.before)
  assert.ok(result.values.every(Number.isFinite))
  console.log(JSON.stringify({pass:true,productionCallPath:'physics.avatarClearance',...result}))
} finally {await browser.close()}
