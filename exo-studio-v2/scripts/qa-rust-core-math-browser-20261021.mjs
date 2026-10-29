// Real source Chrome WASM acceptance. No localStorage or authored garment writes.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const results=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustCoreMathKernel.js')
    const guide=await import('/src/core/patternGuideHalfCurves.js')
    const vector=await import('/src/core/vectorPatternBezier.js')
    const mesh=await import('/src/core/clothMeshing.js')
    const drape=await import('/src/core/liveDrapeTransfer.js')
    const paging=await import('/src/core/garmentPreviewPaging.js')
    const camera=await import('/src/core/sceneCameraViewport.js')
    const wash=await import('/src/core/clothWashProcedurals.js')
    const hardware=await import('/src/core/importedCloHardwareDimensions.js')
    const THREE=await import('/node_modules/three/build/three.module.js')
    const loaded=await kernel.initializeRustCoreMathKernel()
    const g=guide.sampleGuideHalfCurve([0,0],[10,0],[0,2],0,10)
    const cubic=vector.cubicAt([0,0],[1,1],[2,1],[3,0],.5)
    const outline=Array.from({length:60},(_,i)=>({x:10*Math.cos(i*Math.PI/30),y:10*Math.sin(i*Math.PI/30)}))
    const simplified=mesh.simplifiedClothBoundary(outline)
    const prior=new Map([['test',{vertices:[
      {x:0,y:0,position:{x:0,y:0,z:0}},
      {x:10,y:0,position:{x:1,y:0,z:0}},
      {x:0,y:10,position:{x:0,y:1,z:0}}],faces:[[0,1,2]]}]])
    const piece={flatVertices:[{x:2,y:2}],particles:[{position:{x:0,y:0,z:0}}]}
    const drapeResult=drape.transferDrape(prior,{pieces:new Map([['test',piece]])})
    const pageResult=paging.garmentPreviewPage(Array.from({length:29},(_,i)=>({id:String(i),points:[{}, {}, {}]})),1,14)
    const view=new THREE.PerspectiveCamera(34,1.5,.005,150)
    const controls={target:new THREE.Vector3(0,1,0),minDistance:.5,maxDistance:50,update(){}}
    const canvas={dataset:{}}
    const cameraApplied=camera.applySceneCameraViewport(view,controls,
      {distanceMm:4000,horizontalAngle:40,verticalAngle:10,fieldOfView:34,nearClipMm:5,farClipMm:150000},canvas)
    const rgb=wash.washRgbMultiplier(.2,.3,{type:'enzyme',strength:.4})
    const hardwareAxis=hardware.importedCloHardwareDimensions({dimensionsMm:[12,2,13]})
    return {loaded,status:kernel.rustCoreMathStatus(),guidePoints:g.points.length,cubic,
      simplifiedVertices:simplified.length,drapeResult,particle:piece.particles[0].position,
      page:{page:pageResult.page,pageCount:pageResult.pageCount},cameraApplied,
      distance:canvas.dataset.cameraDistanceMm,rgb,hardwareAxis}
  })
  assert.equal(results.loaded,true)
  assert.equal(results.status.backend,'rust-wasm')
  assert.equal(results.status.abiVersion,1)
  assert.equal(results.guidePoints,11)
  assert.deepEqual(results.cubic,[1.5,.75])
  assert.ok(results.simplifiedVertices>=3&&results.simplifiedVertices<=60)
  assert.equal(results.drapeResult.transferred,1)
  assert.equal(results.drapeResult.interpolated,1)
  assert.deepEqual(results.page,{page:1,pageCount:3})
  assert.equal(results.cameraApplied,true)
  assert.equal(results.distance,'4000')
  assert.ok(results.rgb.every(Number.isFinite))
  assert.deepEqual(results.hardwareAxis,[12,13,2])
  console.log(JSON.stringify({pass:true,source,modules:8,abi:results.status.abiVersion,
    backend:results.status.backend,sourceFixtures:true,garmentWrites:0}))
}finally{await browser.close()}
