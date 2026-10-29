/**
 * Read-only native integration smoke against already running 5174/5193.
 * Grade rules and POM edits remain in the disposable browser context.
 * No Rust mutation, server launch, save, or packaged app interaction.
 */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const nativeSnapshot=async()=>{
  const response=await fetch('http://127.0.0.1:5193/workspace',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'snapshot'}),
  })
  const result=await response.json()
  assert(result.ok,result.error||'Native snapshot unavailable')
  return result.data
}
const before=await nativeSnapshot()
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
let page
try {
  const context=await browser.newContext({viewport:{width:1650,height:1040}})
  page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5174/?desktop=1&engine=clothcraft&testSession=gradePomSecondLoop',
    {waitUntil:'domcontentloaded',timeout:25000})
  await page.locator('.cc-board svg[data-native-tool]').first().waitFor({state:'visible',timeout:30000})
  const edit=page.getByRole('button',{name:'Edit Grading'})
  await edit.click()
  const grading=page.getByRole('dialog',{name:'Pattern Grading'})
  await grading.waitFor({state:'visible',timeout:10000})
  const tabs=grading.getByRole('tablist',{name:'Grading studio tools'})
  await tabs.getByRole('tab',{name:'Grade Points'}).click()
  const zero=grading.getByRole('button',{name:'Start zero-offset grading'})
  if(await zero.count())await zero.click()
  await grading.getByRole('table',{name:'Independent editable grade movements by size'}).waitFor()
  await tabs.getByRole('tab',{name:'Measurements'}).click()
  const pom=grading.getByRole('region',{name:'Native graded point of measure editor'})
  await pom.waitFor({state:'visible'})
  await pom.getByRole('textbox',{name:'POM measurement name'}).fill('Second loop front width')
  await pom.getByRole('button',{name:'+ Add measured specification'}).click()
  const overlay=page.locator('[data-2d-grading-pom]').first()
  await overlay.waitFor({state:'attached',timeout:12000})
  assert.equal(await overlay.getAttribute('data-grade-pom-size'),'L')
  assert.equal(await overlay.getAttribute('data-grade-pom-status'),'unset')
  await pom.getByRole('combobox',{name:'POM selected graded size'}).selectOption('XL')
  await page.waitForFunction(()=>document.querySelector('[data-2d-grading-pom]')?.dataset.gradePomSize==='XL')
  await pom.getByRole('button',{name:'Use current measured run as draft targets'}).click()
  assert.equal(await overlay.getAttribute('data-grade-pom-status'),'unset',
    'Bulk copy must not replace authored targets without explicit confirmation')
  await pom.getByRole('button',{name:'Confirm replace six draft targets'}).click()
  await page.waitForFunction(()=>document.querySelector('[data-2d-grading-pom]')?.dataset.gradePomStatus==='pass')
  const target=pom.locator('input[aria-label="POM target XL millimetres"]')
  if(await target.count()!==1)throw Error('Missing XL target input: '+
    JSON.stringify(await pom.locator('input').evaluateAll(elements=>
      elements.map(element=>({label:element.getAttribute('aria-label'),type:element.type}))))
  )
  let original
  try {original=await target.inputValue({timeout:4500})}
  catch(error){
    console.error('POM_INPUT_DISAPPEARED',JSON.stringify(await page.evaluate(()=>({
      grades:[...document.querySelectorAll('[data-native-grade-pattern]')].map(el=>({tab:el.dataset.gradeStep,visible:el.getBoundingClientRect().width>0})),
      overlays:document.querySelectorAll('[data-2d-grading-pom]').length,
      targets:[...document.querySelectorAll('[aria-label^="POM target "]')].map(el=>({label:el.getAttribute('aria-label'),value:el.value})),
      tabs:[...document.querySelectorAll('.exo-grade-studio-nav button')].map(el=>({label:el.textContent,selected:el.getAttribute('aria-selected')})),
      body:document.body.innerText.slice(-550),
    }))))
    throw error
  }
  await target.fill('201.25')
  await target.press('Tab')
  await page.waitForFunction(()=>document.querySelector('[data-2d-grading-pom]')?.dataset.gradePomTargetMm==='201.25')
  await target.fill('199.75')
  await target.press('Escape')
  assert.equal(await target.inputValue(),'201.25','Escape must cancel the editable target draft')
  const tolerance=pom.getByRole('spinbutton',{name:'POM tolerance millimetres'})
  await tolerance.fill('6.75')
  await tolerance.press('Escape')
  assert.equal(await tolerance.inputValue(),'2','Escape must cancel unsaved tolerance edits')
  await tabs.getByRole('tab',{name:'Seams & QA'}).click()
  const qa=grading.getByRole('region',{name:'Unified native size grading quality'})
  await qa.waitFor()
  await qa.getByRole('button',{name:'Inspect S graded measurements'}).click()
  assert.equal(await qa.locator('[data-grade-selected-size]').getAttribute('data-grade-selected-size'),'S')
  await qa.getByRole('button',{name:'Edit Second loop front width for S'}).click()
  assert.equal(await pom.getByRole('combobox',{name:'POM selected graded size'}).inputValue(),'S')
  assert.match(await pom.getByRole('combobox',{name:'Selected POM specification'}).inputValue(),/front:/)
  const after=await nativeSnapshot()
  assert.equal(after.revision,before.revision,'POM draft UI must not mutate native garment')
  assert.deepEqual(after.template,before.template,'POM draft must preserve native source')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({ok:true,nativeRevision:before.revision,selectedSizeSynced:true,
    overlayAppeared:true,targetPreviewMatched:true,bulkReplaceConfirmed:true,
    escapeDraftPreserved:true,toleranceEscapePreserved:true,
    qualityNavigation:true,qaDirectPOMNavigation:true,pageErrors:errors.length}))
} finally {
  await browser.close()
}
