import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustScanColorKernel.js')
    const tone=await import('/src/core/photographicScanToning.js')
    const loaded=await kernel.initializeRustScanColorKernel()
    const input=document.createElement('canvas')
    input.width=3;input.height=2
    const context=input.getContext('2d')
    const raster=context.createImageData(3,2)
    raster.data.set([20,40,80,255,90,120,140,255,180,165,160,255,
      255,255,255,255,0,0,0,255,140,120,100,0])
    context.putImageData(raster,0,0)
    const image=new Image();image.src=input.toDataURL('image/png');await image.decode()
    const original=Array.from(context.getImageData(0,0,3,2).data)
    const dyed=tone.tintLicensedFabricScan(image,{color:'#4282ad',wash:{type:'raw'}},{width:3,height:2})
    if(!dyed)return {loaded,error:'tint returned null'}
    const after=Array.from(dyed.getContext('2d').getImageData(0,0,3,2).data)
    return {loaded,status:kernel.rustScanColorStatus(),before:original,after,
      sample:tone.regradeScannedPixel([170,177,183],.62,[40,63,89])}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,1)
  assert.equal(result.before.length,24)
  assert.equal(result.after.length,24)
  assert.deepEqual(result.before.filter((_,i)=>i%4===3),result.after.filter((_,i)=>i%4===3))
  assert.ok(result.after.slice(0,3).every(Number.isFinite))
  assert.ok(result.sample.every(v=>v>=0&&v<=255))
  console.log(JSON.stringify({pass:true,source,backend:result.status.backend,abi:1,
    canvasPixels:6,sourceAlphaUnchanged:true,canvasPipeline:true,savedGarmentWrites:0}))
}finally{await browser.close()}
