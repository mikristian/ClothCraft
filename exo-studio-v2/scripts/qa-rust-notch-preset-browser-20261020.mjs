// Read-only acceptance for 2D sewing balance notches in the live source browser.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const context=await browser.newContext({viewport:{width:1280,height:800}})
  const page=await context.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustNotchPresetKernel.js')
    const preset=await import('/src/core/patternSewingNotches.js')
    const loaded=await kernel.initializeRustNotchPresetKernel()
    const template={panels:[
      {id:'front',polygon:{edges:['hem','armhole-left','sleeve-under-right']}},
      {id:'back',polygon:{edges:['side','underarm_left','sleeve-under-right'],
        notches:{'underarm_left':[{t:.5}]}}},
      {id:'sleeve',polygon:{edges:['armhole-left']}},
    ]}
    return {loaded,status:kernel.rustNotchPresetKernelStatus(),
      commands:preset.teeBalanceNotchCommands(template)}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.deepEqual(result.commands,[
    {kind:'Notch',panel:'front',edge:'armhole-left',t:.53,depth_m:.006},
    {kind:'Notch',panel:'front',edge:'sleeve-under-right',t:.53,depth_m:.006},
    {kind:'Notch',panel:'back',edge:'sleeve-under-right',t:.5125,depth_m:.006},
    {kind:'Notch',panel:'back',edge:'sleeve-under-right',t:.5475,depth_m:.006},
  ])
  console.log(JSON.stringify({pass:true,...result}))
}finally{await browser.close()}
