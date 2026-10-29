/** Installed-app E3 UI contract: clickability and reversible panels.
 * Does not establish production CAD interoperability or physical fit approval.
 * Usage: node scripts/qa-exo-2d-accumark-ui-contract-20261023.mjs
 */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const BASE=process.env.EXO_INSTALLED_URL||'http://127.0.0.1:5386/?desktop=1&engine=clothcraft'
const CHROME=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:CHROME})
const errors=[]
let page
try {
  page=await browser.newPage({viewport:{width:1720,height:1040},deviceScaleFactor:1})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:25000})
  await page.locator('.cc-v2-board-orientation').waitFor({timeout:30000})
  const glass=page.locator('.cc-v2-board-orientation > .cc-pattern-studio-glass-arrow')
  assert.equal(await glass.count(),1,'The studio arrow must belong INSIDE the real glass toolbar')
  assert.equal(await glass.getAttribute('title'),'Open Pattern Studio')
  await glass.click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='2d')
  const result={glassArrowInNativeToolbar:true,collapses:{}}
  assert.equal(await glass.getAttribute('title'),'Return to main studio')
  const left=page.locator('.tool-rail')
  const labels=[
    'Freehand pencil · draw a fitted editable pattern',
    'Bézier pen · place precision pattern anchors',
    'Physical cut-and-sewn dart · adjustable intake and depth',
    'Edit pattern curve and dart-related points',
    'Manufacturing grading QA',
    'Show or hide all graded sizes',
  ]
  for(const name of labels){
    const control=left.getByRole('button',{name,exact:true})
    await control.waitFor({state:'visible'})
    await control.click({timeout:7000})
    result[name]='clicked'
  }
  result.factoryQa=await page.locator('.exo-grade-workbench-actions').getByRole('button',{name:'Manufacturing grading QA'}).getAttribute('aria-label')
  result.gradeNestActive=await page.getByRole('button',{name:'Show or hide all graded sizes'}).getAttribute('aria-pressed')
  assert.equal(result.gradeNestActive,'true')
  result.rightTools=await page.locator('.clo-right-tool-palette').isVisible()
  result.objectBrowser=await page.locator('.clo-object-browser').isVisible()
  assert(result.rightTools&&result.objectBrowser,'Right tools and Object Browser must survive entering 2D')
  for(const [close,open] of [
    ['Collapse library panel','Expand library panel'],
    ['Collapse left tools panel','Expand left tools panel'],
    ['Collapse right inspector','Expand right inspector'],
    ['Collapse right tools bar','Expand right tools bar'],
  ]){
    const control=page.getByRole('button',{name:close,exact:true})
    await control.click({timeout:7000})
    const restore=page.getByRole('button',{name:open,exact:true})
    await restore.click({timeout:7000})
    await control.waitFor({state:'visible'})
    result.collapses[open]=true
  }
  await glass.click()
  await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout!=='2d')
  result.restoredOriginalStudio=true
  result.pageErrors=errors
  assert.equal(errors.length,0,JSON.stringify(errors))
  console.log(JSON.stringify({pass:true,...result},null,2))
} finally {await browser.close()}
