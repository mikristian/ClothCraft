import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const base=process.env.EXO_QA_URL || 'http://127.0.0.1:5194'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  for(const templateId of ['pants','jeans-501-fit','jeans-501','hoodie','zip-hoodie']) {
    const page=await browser.newPage({viewport:{width:1440,height:900}})
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`${base}/docs/qa/garment-preview-20261017/harness.html?templateId=${templateId}`,{waitUntil:'domcontentloaded',timeout:45000})
    const canvas=page.locator('.exo-garment-mini-canvas canvas')
    await canvas.waitFor({state:'attached',timeout:20000})
    await page.waitForFunction(()=>document.querySelector('.exo-garment-mini-canvas canvas')?.dataset.previewStatus==='ready',{timeout:25000})
    const dataset=await canvas.evaluate(node=>({...node.dataset}))
    assert.equal(errors.length,0,`${templateId}: ${errors.join('; ')}`)
    assert.ok(Number(dataset.previewSourcePieceCount)>=4)
    assert.ok(Number(dataset.previewTriangleCount)>800)
    assert.ok(dataset.previewFabricIds,`${templateId}: missing authored fabric assignment`)
    const file=`screenshots/qa-${templateId}-3d-arrangement-20261018.png`
    await page.locator('.exo-garment-mini').screenshot({path:file})
    console.log(JSON.stringify({templateId,sourcePanels:dataset.previewSourcePieceCount,displayedPanels:dataset.previewDisplayedPieceCount,triangles:dataset.previewTriangleCount,fabrics:dataset.previewFabricIds,screenshot:file}))
    await page.close()
  }
  console.log('PASS garment library 3D source-derived garment preview in live Chromium')
}finally{await browser.close()}
