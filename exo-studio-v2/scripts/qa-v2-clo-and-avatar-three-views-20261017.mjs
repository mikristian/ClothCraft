// Independent source-safe visual browser regression for the CLO male source
// shirt and the EXACT garment loaded on the active avatar by default.
// View-only harness: never calls the native garment write endpoint.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5194'
const output=path.join(root,'research/screenshots/tee-dual-library-20261017')
mkdirSync(output,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const report={origin,output,checks:[],errors:[]}
try {
 for(const templateId of ['clo-male-tshirt','avatar-worn-tee','tee']){
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}})
   const errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   await page.goto(origin+`/docs/qa/garment-preview-20261017/harness.html?templateId=${templateId}`,{waitUntil:'domcontentloaded',timeout:35000})
   const canvas=page.locator('.exo-garment-mini-canvas canvas')
   await canvas.waitFor({timeout:30000})
   await page.waitForFunction(()=>document.querySelector('.exo-garment-mini-canvas canvas')?.dataset.previewStatus==='ready',null,{timeout:30000})
   const meta=await canvas.evaluate(c=>({...c.dataset}))
   assert.deepEqual(errors,[],`JavaScript errors in ${templateId} (${width}px)`)
   assert.equal(meta.previewStatus,'ready')
   assert.equal(meta.previewViews,'front,side,back')
   assert.equal(meta.previewCloneCount,'2')
   const originalCount=templateId==='clo-male-tshirt'?7:templateId==='avatar-worn-tee'?3:4
   assert.equal(Number(meta.previewSourcePieceCount),originalCount,`${templateId} source piece count`)
   assert.equal(Number(meta.previewHiddenPieceCount),0,`${templateId} missing original pattern`)
   await page.locator('.exo-garment-mini').screenshot({path:path.join(output,`${templateId}-front-side-back-${width}.png`)})
   if(templateId==='clo-male-tshirt'){
    assert.equal(meta.previewSourcePanelCount,'7')
    assert.equal(meta.previewMeshCount,'21')
    assert.equal(meta.previewSourceVertexCount,'3661')
    assert.equal(meta.previewSourceTriangleCount,'6876')
    assert.equal(meta.previewCameraAngles,'3.141593,1.570796,0')
   } else {
    assert.equal(meta.previewDisplayedPieceCount,String(originalCount))
    // One procedural pattern panel may be rendered as a fabric mesh plus a
    // lining/edge surface; unlike CLO's source OBJ this is 8 meshes per
    // complete four-piece shirt and 24 across the three display instances.
    assert.equal(meta.previewMeshCount,String(originalCount*2*3))
    assert.equal(meta.previewCameraAngles,'0.000000,1.570796,3.141593')
   }
   if(templateId==='clo-male-tshirt'){
    await page.getByRole('button',{name:/Separated 7 pieces/}).click()
    assert.equal(await canvas.getAttribute('data-preview-arrangement'),'separated')
    await page.getByRole('button',{name:/Three shirts/}).click()
    assert.equal(await canvas.getAttribute('data-preview-arrangement'),'assembled')
   }
   report.checks.push({templateId,width,sourcePieces:meta.previewSourcePieceCount,renderedMeshes:meta.previewMeshCount,views:meta.previewViews,angles:meta.previewCameraAngles})
   await page.close()
  }
 }
 report.pass=true
} catch(e) {
 report.pass=false
 report.error=e.stack||String(e)
 process.exitCode=1
} finally {
 await browser.close()
}
console.log(JSON.stringify(report,null,2))
