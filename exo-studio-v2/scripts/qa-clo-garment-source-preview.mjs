import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const base=process.env.EXO_QA_URL || 'http://127.0.0.1:5194'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:width===390?844:900}})
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto(`${base}/docs/qa/garment-preview-20261017/harness.html?templateId=clo-male-tshirt`,{waitUntil:'domcontentloaded',timeout:60000})
    const canvas=page.locator('.exo-garment-mini-canvas canvas')
    await canvas.waitFor({state:'attached',timeout:30000})
    await page.waitForFunction(()=>document.querySelector('.exo-garment-mini-canvas canvas')?.dataset.previewStatus==='ready',{timeout:30000})
    const diagnostics=await canvas.evaluate(node=>({...node.dataset}))
    assert.deepEqual(errors,[])
    assert.equal(diagnostics.previewRenderMode,'clo-source-three-instances')
    assert.equal(diagnostics.previewViewCount,'3')
    assert.equal(diagnostics.previewCloneCount,'2')
    assert.equal(diagnostics.previewSharedGeometry,'true')
    assert.equal(diagnostics.previewRenderedPanelCount,'21')
    assert.equal(diagnostics.previewViews,'front,side,back')
    assert.equal(diagnostics.previewArrangement,'assembled')
    assert.equal(diagnostics.previewSourcePanelCount,'7')
    assert.deepEqual(new Set(diagnostics.previewRenderedPieceIds.split(',')),new Set([
      'clo-front','clo-back','clo-left-sleeve','clo-right-sleeve','clo-neck-a','clo-neck-b','clo-neck-c',
    ]))
    assert.equal(diagnostics.previewSourceVertexCount,'3661')
    assert.equal(diagnostics.previewCloSewingPaths,'46')
    assert.equal(diagnostics.previewSourcePieceCount,'7')
    assert.equal(diagnostics.previewDisplayedPieceCount,'7')
    assert.equal(diagnostics.previewSourceTriangleCount,'6876')
    assert.equal(diagnostics.previewTriangleCount,'20628')
    assert.equal(diagnostics.previewMeshCount,'21')
    assert.equal(diagnostics.previewFitCertified,'false')
    const lineBefore=Number(diagnostics.previewVisibleDetails)
    await page.getByRole('button',{name:'CLO sewing guides'}).click()
    const lineAfter=Number(await canvas.getAttribute('data-preview-visible-details'))
    assert.equal(lineBefore-lineAfter,138)
    assert.equal(diagnostics.previewCameraAngles,'0,1.570796,3.141593')
    const assembledShot=`/tmp/exo-clo-male-tshirt-three-view-${width}.png`
    await page.locator('.exo-garment-mini').screenshot({path:assembledShot})
    await page.getByRole('button',{name:'Separated 7 pieces · 3 views'}).click()
    assert.equal(await canvas.getAttribute('data-preview-arrangement'),'separated')
    const separatedShot=`/tmp/exo-clo-male-tshirt-separated-${width}.png`
    await page.locator('.exo-garment-mini').screenshot({path:separatedShot})
    await page.getByRole('button',{name:'CLO source placement · front / side / back'}).click()
    assert.equal(await canvas.getAttribute('data-preview-arrangement'),'assembled')
    assert.equal(await canvas.getAttribute('data-preview-source-panel-count'),'7')
    const shot=`/tmp/exo-clo-male-tshirt-preview-${width}.png`
    await page.locator('.exo-garment-mini').screenshot({path:shot})
    console.log(JSON.stringify({width,status:diagnostics.previewStatus,pieces:7,meshSource:diagnostics.previewSourceGeometry,triangles:diagnostics.previewTriangleCount,stitchGuides:diagnostics.previewCloSewingPaths,shot,separatedShot,assembledShot}))
    await page.close()
  }
} finally {await browser.close()}
