// Installed-app CSS acceptance for contiguous tool rails and preset-colored
// library/object/property panels. Uses an isolated page; project is read-only.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
const report={origin,pass:false,checks:[]}
try {
  const page=await browser.newPage({viewport:{width:1690,height:990}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/?desktop=1&engine=clothcraft&qa=theme-clean-rails-20261017',{waitUntil:'domcontentloaded'})
  await page.locator('.app-shell[data-studio-customized="true"]').waitFor({timeout:30000})
  const before=await page.locator('.clo-reference-column').first().evaluate(el=>getComputedStyle(el).backgroundColor)
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-theme').click()
  await page.getByRole('button',{name:'Sapphire Studio theme'}).click()
  await page.getByTestId('studio-settings-apply').click()
  const computed=await page.evaluate(()=>{
    const style=s=>{const el=document.querySelector(s);if(!el)return null;const cs=getComputedStyle(el);return {background:cs.backgroundColor,border:cs.borderTopColor,color:cs.color,shadow:cs.boxShadow}}
    return {
      theme:document.querySelector('.app-shell')?.dataset.studioTheme,
      library:style('.asset-library-content'),folder:style('.clo-library-categories'),
      tree:style('.clo-object-list'),row:style('.clo-object-select'),
      property:style('.clo-pe-content'),
      accordion:style('.clo-pe-section:not(.expanded) > .clo-pe-trigger'),
      expandedAccordion:style('.clo-pe-section.expanded > .clo-pe-trigger'),
      rail:style('.clo-reference-column'),rail2:style('.clo-reference-column:nth-child(2)'),
      rightRail:style('.clo-right-tool-grid'),
      idle:style('.clo-reference-column button:not(.active):not([aria-pressed="true"])'),
      selected:style('.clo-reference-column button.active'),
    }
  })
  report.inspected=computed
  assert.equal(computed.theme,'sapphire')
  assert.notEqual(computed.rail.background,before,'Theme did not recolor native 3D tool rail')
  assert.equal(computed.rail.background,computed.rail2.background,'Two tool columns have different idle colors')
  assert(computed.library&&computed.folder&&computed.tree&&computed.property,'Missing nested panels')
  assert.equal(computed.library.background,computed.folder.background,'Library folders stayed a different color')
  assert.equal(computed.row.background,'rgba(0, 0, 0, 0)','Object row is still boxed while idle')
  assert.equal(computed.property.background,computed.accordion.background,'Idle Property Editor section has unmatched color')
  if(computed.expandedAccordion)assert.notEqual(computed.expandedAccordion.background,computed.accordion.background,'Expanded section has no selection highlight')
  assert.equal(computed.idle.background,'rgba(0, 0, 0, 0)','Inactive toolbar has highlighted background')
  assert.equal(computed.idle.border,'rgba(0, 0, 0, 0)','Inactive toolbar still has an outline')
  if(computed.selected)assert.notEqual(computed.selected.background,computed.idle.background,'Active tool has no visual selection')
  report.checks.push({name:'Clean native rails and palette-driven nested panels',computed})
  assert.deepEqual(errors,[],'Browser errors during theme changes')
  report.pass=true
} catch(error) {
  report.error=error.stack||String(error)
  process.exitCode=1
} finally {await browser.close()}
console.log(JSON.stringify(report,null,2))
