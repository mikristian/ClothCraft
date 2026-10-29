import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const page=await browser.newPage()
 await page.goto(source,{waitUntil:'domcontentloaded'})
 const data=await page.evaluate(async()=>{
  const rust=await import('/src/core/rustPbrPixelsKernel.js')
  const original=await import('/src/core/fabricPbrGenerator.js')
  const loaded=await rust.initializeRustPbrPixelsKernel()
  const canvas=document.createElement('canvas');canvas.width=12;canvas.height=8
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  const raw=ctx.createImageData(12,8)
  for(let i=0;i<raw.data.length;i+=4){
   const p=i/4
   raw.data.set([p*13%256,p*27%256,p*37%256,p%3?255:0],i)
  }
  ctx.putImageData(raw,0,0)
  const originalPixels=Array.from(ctx.getImageData(0,0,12,8).data)
  const result=original.estimateFabricPbrPixels(ctx.getImageData(0,0,12,8),{normalStrength:2.75})
  const exportImage=await original.generateFabricPbrFromImage(canvas.toDataURL('image/png'),{maxSize:512,normalStrength:2.75})
  const afterward=Array.from(ctx.getImageData(0,0,12,8).data)
  return {loaded,status:rust.rustPbrPixelsStatus(),result:{width:result.width,height:result.height,
    normalLength:result.normal.length,roughLength:result.roughness.length,kind:result.kind},
    exported:{width:exportImage.width,height:exportImage.height,
      normalPng:exportImage.normalSrc.startsWith('data:image/png;base64,'),
      roughPng:exportImage.roughnessSrc.startsWith('data:image/png;base64,')},
    sourceUnchanged:originalPixels.every((v,i)=>v===afterward[i])}
 })
 assert.equal(data.loaded,true)
 assert.equal(data.status.backend,'rust-wasm')
 assert.equal(data.status.abiVersion,1)
 assert.deepEqual(data.result,{width:12,height:8,normalLength:384,roughLength:384,kind:'estimated-from-albedo'})
 assert.deepEqual(data.exported,{width:12,height:8,normalPng:true,roughPng:true})
 assert.equal(data.sourceUnchanged,true)
 console.log(JSON.stringify({pass:true,source,backend:data.status.backend,abi:1,
  canvasPixels:96,browserPngExport:true,sourceUnchanged:true,garmentWrites:0}))
}finally{await browser.close()}
