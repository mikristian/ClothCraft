import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustUnfoldKernel.js')
    const {unfoldDraftPiece}=await import('/src/core/draftingUnfold.js')
    if(!await kernel.initializeRustUnfoldKernel())throw Error('Rust unfold WASM not loaded')
    const piece={id:'half',name:'Half',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20},{x:0,y:20}],notches:[{id:'n',edgeIndex:1,t:.3}],curves:{},edgeSeamAllowances:{}}
    const before=JSON.stringify(piece)
    const unfolded=unfoldDraftPiece(piece,3)
    return {backend:kernel.rustUnfoldKernelStatus().backend,points:unfolded.piece.points.length,notches:unfolded.piece.notches,area:unfolded.areaCm2,unchanged:JSON.stringify(piece)===before}
  })
  assert.equal(result.backend,'rust-wasm')
  assert.equal(result.points,6)
  assert.equal(result.notches.length,2)
  assert.ok(Math.abs(result.notches[1].t-.7)<1e-12)
  assert.ok(Math.abs(result.area-400)<1e-6)
  assert.equal(result.unchanged,true)
  console.log(JSON.stringify({pass:true,backend:result.backend,areaCm2:result.area,notches:result.notches.length}))
} finally {await browser.close()}
