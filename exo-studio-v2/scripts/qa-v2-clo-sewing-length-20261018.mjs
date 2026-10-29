// Regression from the direct CLO 7 Edit Sewing / Check Sewing Length test.
// Runs against the actual installed native V2 web server on :5386 by default.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {inspectSewingLengths} from '../src/core/sewingLengthDiagnostics.js'

const observedClo=inspectSewingLengths([
  {seamId:'clo-observed',first:{length2DCm:26.17},second:{length2DCm:26.18}},
  {seamId:'clo-curve-edit',first:{length2DCm:26.18},second:{length2DCm:28.48}},
],{lengthThreshold:.5,ratioThreshold:10})
assert.equal(observedClo.measured,2)
assert.equal(observedClo.warnings,1)
assert.ok(Math.abs(observedClo.rows[0].signedDifferenceCm+.01)<1e-9)
assert.equal(inspectSewingLengths([{seamId:'missing',first:{},second:{length2DCm:26}}]).unavailable,1)
assert.equal(inspectSewingLengths([{seamId:'clo-observed',first:{length2DCm:26.17},second:{length2DCm:26.18}}],{lengthOn:false,ratioOn:false}).warnings,0)

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({
  headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
try{
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`${origin}/?desktop=1&engine=clothcraft&testSession=clo-sewing-inspection`,
    {waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
  const input=page.locator('button[data-clo-slot="2d:B04"]')
  await input.click()
  const dialog=page.getByRole('dialog',{name:'Check Sewing Length'})
  await dialog.waitFor({state:'visible',timeout:12000})
  const review=dialog.locator('[data-native-sewing-length-review="true"]')
  await review.waitFor({state:'visible',timeout:15000})
  const count=await review.locator('[data-sew-length-state]').count()
  assert.ok(count>0,'Native sewing review should show measured rows for current garment')
  const lengthField=dialog.getByRole('spinbutton',{name:'Length Difference threshold'})
  const ratioField=dialog.getByRole('spinbutton',{name:'Ratio Difference threshold'})
  assert.equal(await lengthField.inputValue(),'0.5')
  assert.equal(await ratioField.inputValue(),'10')
  const selected=review.locator('button[data-sew-length-state]').first()
  const id=(await selected.locator('.clo-finishing-seam-pair-name').innerText()).trim()
  await selected.click()
  await page.waitForFunction(expected=>document.querySelector('[data-native-sewing-length-review] button[aria-pressed=true] .clo-finishing-seam-pair-name')?.textContent.trim()===expected,id,{timeout:10000})
  await lengthField.fill('0')
  await ratioField.fill('0')
  const after=await review.locator('[data-sew-length-state]').count()
  assert.equal(after,count,'Changing thresholds should update existing native seam rows')
  await dialog.getByRole('button',{name:'Close Check Sewing Length'}).click()
  await page.locator('button[data-clo-slot="2d:B01"]').click()
  await page.locator('.cc-board[data-edit-sewing="true"]').waitFor({state:'visible',timeout:10000})
  const sewnEdge=page.locator('.cc-board [data-seam-link]').first()
  assert.ok(await sewnEdge.count(),'Native board should expose a real sewing-connected edge')
  await sewnEdge.dispatchEvent('click')
  const readout=page.locator('[data-native-selected-sewing-length]')
  await readout.waitFor({state:'visible',timeout:12000})
  assert.match(await readout.innerText(),/\d+\.\d{2} \/ \d+\.\d{2} cm/)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,origin,measuredRows:count,selectedSeam:id,
    editSewingReadout:await readout.getAttribute('data-native-selected-sewing-length'),
    liveThresholds:true,pageErrors:0}))
}finally{await browser.close()}
