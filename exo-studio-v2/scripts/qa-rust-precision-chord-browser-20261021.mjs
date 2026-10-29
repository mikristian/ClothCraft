// Source-only Chrome acceptance; disposable in-memory project, no saved garments.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustPrecisionChordKernel.js')
    const drafting=await import('/src/core/draftingPrecision.js')
    const loaded=await kernel.initializeRustPrecisionChordKernel()
    const piece={id:'isolated-browser',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],curves:{}}
    const before=JSON.stringify(piece)
    const inverse=drafting.preciseCurveEdit(piece,0,{mode:'chord',alongCm:2.5,depthCm:6})
    const forward=drafting.curveChordCoordinates(piece.points[0],{x:inverse.cx,y:inverse.cy},piece.points[1])
    let error=''
    try{drafting.preciseCurveEdit(piece,0,{mode:'chord',alongCm:Infinity,depthCm:3})}
    catch(e){error=e.message}
    return {loaded,status:kernel.rustPrecisionChordStatus(),inverse,forward,error,unchanged:JSON.stringify(piece)===before}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,1)
  assert.deepEqual(result.inverse,{cx:7.5,cy:6})
  assert.deepEqual(result.forward,{alongCm:2.5,depthCm:6})
  assert.equal(result.unchanged,true)
  assert.equal(result.error,'Along chord must be a finite length in centimeters')
  console.log(JSON.stringify({pass:true,url,...result}))
}finally{await browser.close()}
