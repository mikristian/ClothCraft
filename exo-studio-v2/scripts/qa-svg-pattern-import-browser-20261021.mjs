// Real Chrome SVG import regression: in-memory inputs, no garment writes.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const {parseSvgPattern}=await import('/src/core/svgPatternImport.js')
    const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="10cm" viewBox="0 0 100 100">${body}</svg>`
    const basic=parseSvgPattern(svg('<g transform="translate(10,20)"><g transform="scale(2)"><rect id="body" x="0" y="0" width="10" height="20"/></g></g><polygon id="triangle" points="10,10 20,10 20,20"/>'))
    const rotated=parseSvgPattern(svg('<g transform="rotate(90)"><rect x="10" y="20" width="20" height="10"/></g>'))
    const errors={}
    for(const [name,input] of Object.entries({
      matrix:svg('<rect transform="matrix(1,2,3)" width="20" height="20"/>'),
      pivot:svg('<rect transform="rotate(90,10,10)" width="20" height="20"/>'),
      nonfinite:svg('<rect transform="matrix(1,0,0,1,Infinity,0)" width="20" height="20"/>'),
      empty:svg('<rect width="0" height="20"/>'),
    }))try{parseSvgPattern(input);errors[name]='unexpected success'}catch(error){errors[name]=error.message}
    return {basic,rotated,errors}
  })
  assert.equal(result.basic.pieces.length,2)
  assert.deepEqual(result.basic.pieces[0].points.map(p=>[p.x,p.y]),[[-1,4],[1,4],[1,0],[-1,0]])
  assert.deepEqual(result.basic.pieces[1].points.map(p=>[p.x,p.y]),[[-.5,1],[.5,1],[.5,0]])
  assert.ok(Math.abs(result.rotated.pieces[0].sourceSvg.originalWidthCm-1)<1e-10)
  assert.equal(result.errors.matrix,'Invalid SVG matrix')
  assert.match(result.errors.pivot,/Rotate around pivot/)
  assert.equal(result.errors.nonfinite,'Invalid SVG transformation')
  assert.match(result.errors.empty,/no closed, valid pattern outlines/)
  console.log(JSON.stringify({pass:true,pieces:3,errors:result.errors}))
} finally {await browser.close()}
