// Isolated read-only verification that EXO's actual browser uses the
// Rust/WASM curve drafting kernel without saving or mutating a garment.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const page=await context.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustCurveDraftKernel.js')
    const draft=await import('/src/core/patternCurveDrafting.js')
    const loaded=await kernel.initializeRustCurveDraftKernel()
    const polygon={
      edges:['hem','side-left','shoulder','side-right'],
      points:[[.8,.7],[.2,.7],[.2,.25],[.8,.25]],
      curves:{'side-left':[[.14,.57],[.14,.36]],
        'side-right':[[.86,.36],[.86,.57]]},
    }
    const station=draft.sideCurveStation(polygon,'side-left',.52)
    const stationReversed=draft.sideCurveStation(polygon,'side-right',.52)
    const dims=draft.curveDraftDimensions(polygon,{samples:128})
    const y=.52,selected=dims.find(d=>d.edge==='side-left')
    return {loaded,status:kernel.rustCurveDraftKernelStatus(),
      station,stationReversed,
      dimensionCount:dims.length,sideLength:selected?.length,
      sideBounds:selected?.bounds,
      explicitBrackets:kernel.rustCurveDraftBrackets([[0,0],[1,1],[2,0]],y),
      declaredBackend:kernel.rustCurveDraftKernelStatus().backend,
    }
  })
  assert.equal(result.loaded,true)
  assert.equal(result.declaredBackend,'rust-wasm')
  assert.ok(result.station && result.stationReversed)
  assert.ok(Math.abs(result.station.position[1]-.52)<1e-7)
  assert.ok(Math.abs(result.stationReversed.position[1]-.52)<1e-7)
  assert.equal(result.dimensionCount,4)
  assert.ok(result.sideLength>.45)
  assert.ok(result.sideBounds.minX<.16)
  assert.deepEqual(result.explicitBrackets,[0,1])
  console.log(JSON.stringify({pass:true,source, ...result}))
} finally {await browser.close()}
