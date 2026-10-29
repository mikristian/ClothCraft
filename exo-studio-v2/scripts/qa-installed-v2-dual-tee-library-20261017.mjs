// Read-only test of BOTH real installed EXO V2 Library previews. Do not click
// a garment card or send native Rust operations; the user's project stays put.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const out=path.join(root,'research/screenshots/tee-dual-library-20261017')
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:true,
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
const report={origin,checks:[],errors:[]}
try {
 const page=await browser.newPage({viewport:{width:1520,height:970}})
 page.on('pageerror',e=>report.errors.push(e.message))
 await page.goto(origin+'/?desktop=1&engine=clothcraft&qa=dual-tee-readonly-20261017',{waitUntil:'domcontentloaded',timeout:60000})
 await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
 await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
 const entries=[
  {id:'clo-male-tshirt',sourcePieces:'7',meshCount:'21',angles:'0,1.570796,3.141593'},
  {id:'avatar-worn-tee',sourcePieces:'3',meshCount:'18',angles:'0.000000,1.570796,3.141593'},
 ]
 for(const expected of entries){
  const tile=page.locator(`[data-library-hover-id="Garment:${expected.id}"]`)
  await tile.scrollIntoViewIfNeeded()
  // Keyboard focus opens the same preview without pointer timing or an
  // accidental garment-card activation. This is safer for the live Rust app.
  await tile.focus()
  const preview=page.locator(`[data-library-preview="Garment:${expected.id}"]`)
  await preview.waitFor({state:'visible',timeout:25000})
  const canvas=preview.locator('canvas')
  await page.waitForFunction(id=>document.querySelector(`[data-library-preview="Garment:${id}"] canvas`)?.dataset.previewStatus==='ready',expected.id,{timeout:30000})
  const d=await canvas.evaluate(node=>({...node.dataset}))
  assert.equal(d.previewSourcePieceCount,expected.sourcePieces)
  assert.equal(d.previewHiddenPieceCount,'0')
  assert.equal(d.previewMeshCount,expected.meshCount)
  assert.equal(d.previewViews,'front,side,back')
  assert.equal(d.previewCameraAngles,expected.angles)
  assert.equal(d.previewCloneCount,'2')
  if(expected.id==='clo-male-tshirt'){
   assert.equal(d.previewSourceVertexCount,'3661')
   assert.equal(d.previewSourceTriangleCount,'6876')
   assert.equal(d.previewSourcePanelCount,'7')
   assert.equal(d.previewArrangement,'assembled')
  }else{
   assert.equal(d.previewAssembly,'avatar-worn-tee-source-derived-display')
  }
  await preview.screenshot({path:path.join(out,`installed-${expected.id}-front-side-back.png`)})
  report.checks.push({name:expected.id,sourcePieces:d.previewSourcePieceCount,renderedMeshes:d.previewMeshCount,views:d.previewViews,angles:d.previewCameraAngles,assembly:d.previewAssembly||d.previewArrangement})
  await tile.press('Escape')
 }
 assert.deepEqual(report.errors,[],'Unexpected browser errors in installed app')
 report.pass=true
}catch(error){
 report.pass=false
 report.error=error.stack||String(error)
 process.exitCode=1
}finally{
 await browser.close()
}
console.log(JSON.stringify(report,null,2))
