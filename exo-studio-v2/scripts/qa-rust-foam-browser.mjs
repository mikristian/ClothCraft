import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Launch once in an isolated context. The live Vite server is expected at
// 5188, matching existing V2 real-browser QA. No edits to saved garments.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-foam-qa',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const core=await import('/src/core/foamCompressionModel.js')
    const wasm=await import('/src/core/rustFoamKernel.js')
    const loaded=await wasm.initializeRustFoamKernel()
    const sample=core.stepFoamCompressionState({},
      {pressStrength:1,pressureKpa:45,depthCm:2,distanceCm:1,radiusCm:4},1/60,{memory:0.2})
    return {loaded,backend:wasm.rustFoamStatus().backend,sample}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.backend,'rust-wasm')
  assert(result.sample.compression>0 && result.sample.displacementCm>0)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,view:'EXO V2 live browser',...result}))
}finally{await browser.close()}
