import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustMarkerKernel.js')
    const {markerToPdf}=await import('/src/core/markerArtifacts.js')
    const {createZipHoodieTemplate}=await import('/src/data/templates.js')
    const {buildFabricMarkers}=await import('/src/core/marker.js')
    if(!await kernel.initializeRustMarkerKernel())throw Error('Rust marker WASM unavailable')
    const project=createZipHoodieTemplate()
    const marker=Object.values(buildFabricMarkers(project))[0]
    const digest=await crypto.subtle.digest('SHA-256',markerToPdf(marker,{marker,size:'M',pageLengthCm:400,project}))
    const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')
    return {backend:kernel.rustMarkerKernelStatus().backend,hash,mapped:kernel.markerPdfCoordinates([{x:2,y:399}],400,400)}
  })
  assert.equal(result.backend,'rust-wasm')
  assert.equal(result.hash,'f177d1aca09bff19ec570d916a9f2ba4b6f22cf11d7e87b6d08fb12f1006a508')
  assert.ok(Math.abs(result.mapped[0].y-401*(72/2.54))<1e-12)
  console.log(JSON.stringify({pass:true,backend:result.backend,byteChecks:1}))
} finally {await browser.close()}
