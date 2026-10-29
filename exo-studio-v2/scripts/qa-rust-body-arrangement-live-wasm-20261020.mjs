import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
// Read-only browser computation. Source Vite is used; no saved garment edit.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const context=await browser.newContext({viewport:{width:1280,height:720}})
  const page=await context.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustBodyArrangementKernel.js')
    const arrangement=await import('/src/core/patternBodyArrangement.js')
    const loaded=await kernel.initializeRustBodyArrangementKernel()
    const project={templateId:'jeans',pieces:[]}
    const infer=(name,extra={})=>arrangement.inferPatternBodyRole({id:name,name,...extra},project)
    const sleeve={id:'sleeve-left',points:[{x:0,y:0},{x:20,y:60},{x:0,y:60}]}
    const sleeveResult=arrangement.resolvePatternArrangement(sleeve,project)
    const authored=arrangement.resolvePatternArrangement({
      ...sleeve,arrangement3d:{wrap:'left-arm',x:-.42,y:1.1,z:.05}},project)
    return {loaded,status:kernel.rustBodyArrangementKernelStatus(),
      roles:{left:infer('left-front-leg'),right:infer('right-back-leg'),
        pocket:infer('right-pocket'),sleeve:infer('left-sleeve')},
      sleeveResult,authored}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.deepEqual(result.roles,{left:'left-leg-front',right:'right-leg-back',pocket:null,sleeve:'left-arm'})
  assert.equal(result.sleeveResult.wrap,'left-arm')
  assert.equal(result.sleeveResult.x,-.285)
  assert.deepEqual(result.authored,{wrap:'left-arm',x:-.42,y:1.1,z:.05})
  console.log(JSON.stringify({pass:true,...result}))
}finally{await browser.close()}
