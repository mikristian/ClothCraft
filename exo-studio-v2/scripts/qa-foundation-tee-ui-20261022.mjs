#!/usr/bin/env node
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_PREVIEW_URL||'http://127.0.0.1:6200/?desktop=1'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={route:url,browserErrors:[],factoryCertified:false}
try{
  // Always use a disposable, isolated browser profile: no user garment or
  // live localStorage may be changed by this UI test.
  const context=await browser.newContext({viewport:{width:1600,height:990}})
  const page=await context.newPage()
  page.on('pageerror',error=>report.browserErrors.push(error.message))
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000})
  const workspace=page.getByRole('combobox',{name:'Workspace',exact:true})
  await workspace.waitFor({timeout:18000})
  await workspace.selectOption('Production')
  const qa=page.locator('[data-industrial-pattern-qa="true"]')
  await qa.waitFor({state:'visible',timeout:16000})
  const before=await qa.innerText()
  assert.match(before,/44 contour, seam or POM blocker/,'Legacy fixture must still expose its 44 real seam errors')
  report.legacyBlockers=44
  const action=page.getByRole('button',{name:'OPEN CORRECTED FOUNDATION TEE · UNDOABLE'})
  await action.waitFor({state:'visible',timeout:10000})
  await action.click()
  // The template action does not navigate away from Production; if future
  // navigation behavior changes, select Production again in the new draft.
  const chooser=page.getByRole('combobox',{name:'Workspace',exact:true})
  if(await chooser.inputValue()!=='Production')await chooser.selectOption('Production')
  await page.waitForFunction(()=>{
    const panel=document.querySelector('[data-industrial-pattern-qa="true"]')
    return panel?.textContent?.includes('0 contour, seam or POM blocker') && panel.textContent.includes('84 stitched-edge size checks')
  },null,{timeout:20000})
  const after=await qa.innerText()
  report.templateName='Foundation Tee · First Fit Test'
  report.templateBlockers=0
  report.allSizeSeamChecks=84
  report.legacyCorrectionAction='visible_and_used_in_disposable_browser'
  report.externalFactoryApproval=(await page.getByLabel('External factory sample approval requirements').innerText()).includes('PENDING')?'PENDING':'MISSING'
  assert.equal(report.externalFactoryApproval,'PENDING')
  assert.equal(report.browserErrors.length,0,JSON.stringify(report.browserErrors))
  assert.match(after,/XS, S, M, L, XL, XXL/)
  console.log(JSON.stringify({status:'PASS',...report},null,2))
}finally{await browser.close()}
