import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Read-only browser probe against the existing source Vite app. No garment
// transaction, persistence write, or installed-app installation is performed.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const context=await browser.newContext({viewport:{width:1280,height:800}})
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5297/?testSession=rust-board-view-20261020',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const [allowance,guide,label,material,preflight,preview,sample,placement,tracks,production]=await Promise.all([
      import('/src/core/rustAllowancePreviewKernel.js'),
      import('/src/core/rustSewingGuideKernel.js'),
      import('/src/core/rustLabelLayoutKernel.js'),
      import('/src/core/rustMaterialGuideKernel.js'),
      import('/src/core/rustPreflightCrossingKernel.js'),
      import('/src/core/patternAllowancePreview.js'),
      import('/src/core/patternSewingGuideSampling.js'),
      import('/src/core/patternLabelPlacement.js'),
      import('/src/core/patternGuideTracks.js'),
      import('/src/core/productionPreflight.js'),
    ])
    const loaded=await Promise.all([
      allowance.initializeRustAllowancePreviewKernel(),
      guide.initializeRustSewingGuideKernel(),
      label.initializeRustLabelLayoutKernel(),
      material.initializeRustMaterialGuideKernel(),
      preflight.initializeRustPreflightCrossingKernel(),
    ])
    return {
      loaded,
      allowanceBackend:allowance.rustAllowancePreviewKernelStatus().backend,
      guideBackend:guide.rustSewingGuideKernelStatus().backend,
      labelReady:label.rustLabelLayoutReady(),
      materialBackend:material.rustMaterialGuideKernelStatus().backend,
      preflightReady:preflight.rustPreflightCrossingReady(),
      offset:preview.seamAllowancePreviewPoints([[0,0],[.2,0],[.2,.2]],.01),
      indices:sample.samplePatternSewingGuideIndices(100,{emphasized:true}),
      placed:placement.placePatternLabel([.5,.5],[0,1],'Armhole',.01,[],[0,0,1,1]),
      spans:tracks.materialGuideSpans([[0,1,2]],[[0,0],[1,0],[0,1]],.2),
      crossing:production.hasCrossingSampled([
        {x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}]),
      boardPresent:Boolean(document.querySelector('[data-native-tool]')),
    }
  })
  assert.deepEqual(result.loaded,[true,true,true,true,true])
  assert.equal(result.allowanceBackend,'rust-wasm')
  assert.equal(result.guideBackend,'rust-wasm')
  assert.equal(result.labelReady,true)
  assert.equal(result.materialBackend,'rust-wasm')
  assert.equal(result.preflightReady,true)
  assert.equal(result.offset.length,3)
  assert.ok(Math.abs(result.offset[1][0]-.21)<1e-10)
  assert.equal(result.indices.length,48)
  assert.equal(result.indices[0],0)
  assert.equal(result.indices.at(-1),99)
  assert.equal(result.placed.collisions,0)
  assert.ok(Number.isFinite(result.placed.x)&&Number.isFinite(result.placed.y))
  assert.equal(result.spans.length,1)
  assert.ok(Math.abs(result.spans[0][0]-0)<1e-10)
  assert.ok(Math.abs(result.spans[0][1]-.8)<1e-10)
  assert.equal(result.crossing,true)
  console.log(JSON.stringify({pass:true,sourcePort:5297,...result}))
}finally{await browser.close()}
