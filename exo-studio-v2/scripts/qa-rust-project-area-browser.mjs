import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustProjectAreaKernel.js')
    const project=await import('/src/core/project.js')
    const piece={id:'in-memory',seamAllowance:1,points:[{id:'a',x:0,y:0},{id:'b',x:8,y:0},{id:'c',x:8,y:8},{id:'d',x:0,y:8}]}
    const before=JSON.stringify(piece)
    const loaded=await kernel.initializeRustProjectAreaKernel()
    return {loaded,backend:kernel.rustProjectAreaStatus().backend,area:project.pieceArea(piece),projectArea:project.projectArea({pieces:[piece]}),boundary:project.seamAllowanceBoundary(piece),length:project.edgeLength(piece,0),unchanged:JSON.stringify(piece)===before}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.backend,'rust-wasm')
  assert.equal(result.area,64)
  assert.equal(result.projectArea,64)
  assert.equal(result.length,8)
  assert.equal(result.boundary.length,4)
  assert.equal(result.unchanged,true)
  console.log(JSON.stringify({pass:true,url,backend:result.backend,area:result.area,pointIDsPreserved:true}))
}finally{await browser.close()}
