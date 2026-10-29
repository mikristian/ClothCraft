import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustFabricBallGeometryKernel.js')
    const source=await import('/src/core/fabricBallGeometry.js')
    const loaded=await kernel.initializeRustFabricBallGeometryKernel()
    const samples=[{gsm:95,bend:.42},{gsm:390,bend:.91},{gsm:60,bend:.08},{gsm:1000,bend:1.8}]
    const results=samples.map(fabric=>{
      const g=source.createFabricBallGeometry(fabric,{segments:42,rings:42})
      const p=g.getAttribute('position'),uv=g.getAttribute('uv')
      const d=source.fabricBallGeometryDiagnostics(g)
      const result={vertices:p.count,triangles:g.getIndex().count/3,finite:Array.from(p.array).every(Number.isFinite),uvFinite:Array.from(uv.array).every(Number.isFinite),invalidTriangles:d.invalidTriangles,visualOnly:d.illustrativeOnly}
      g.dispose();return result
    })
    return {loaded,status:kernel.rustFabricBallGeometryKernelStatus(),results}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,1)
  for(const sample of result.results){
    assert.equal(sample.vertices,43*43)
    assert.equal(sample.triangles,42*42*2)
    assert.equal(sample.finite,true)
    assert.equal(sample.uvFinite,true)
    assert.equal(sample.invalidTriangles,0)
    assert.equal(sample.visualOnly,true)
  }
  console.log(JSON.stringify({pass:true,url,backend:result.status.backend,samples:result.results.length,visualOnly:true,garmentWrites:0}))
}finally{await browser.close()}
