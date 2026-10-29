/** Verify Tool Index includes the entire CLO + EXO library, not extra side rails. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={origin,checks:[],errors:[]}
const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name)}
try{
  const page=await browser.newPage({viewport:{width:1450,height:960}})
  page.on('pageerror',e=>report.errors.push(e.message))
  await page.goto(`${origin}/?desktop=1&engine=clothcraft&testSession=tool-index-library-qa`,{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-clo-slot="2d:A01"]').waitFor({state:'visible',timeout:40000})
  check('Native 3D reference toolbar retained',await page.locator('[data-clo-slot^="3d:"]').count()>=38)
  check('Native 2D reference toolbar retained',await page.locator('[data-clo-slot^="2d:"]').count()>=32)
  check('Left EXO extra rail removed',await page.getByText('EXO · 3D EXTRAS',{exact:true}).count()===0)
  check('Right EXO extra rail removed',await page.locator('.clo-right-tool-palette').getByText('EXO TOOLS',{exact:true}).count()===0)
  check('Extra controls absent from right rail',await page.locator('.clo-right-tool-palette [aria-label="Additional EXO tools selected in Settings"]').count()===0)
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.locator('[data-testid="settings-tab-toolIndex"]').click()
  const dialog=page.locator('[data-testid="studio-settings-dialog"]')
  check('Settings has clearly titled Tool Index',await dialog.getByRole('heading',{name:'Tool Index'}).count()===1)
  const cards=dialog.locator('[data-tool-index-id]')
  const ids=await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-tool-index-id')))
  check('Whole catalog has over one hundred categorized tool entries',ids.length>=105)
  check('Native 3D and 2D tools all indexed',ids.filter(id=>id.startsWith('native:')).length===70)
  check('EXO extras preserved in library',ids.filter(id=>id.startsWith('extra:')).length>=35)
  const identifiers=await cards.evaluateAll(nodes=>nodes.map(node=>`${node.closest('[data-testid^="tool-index-"]')?.getAttribute('data-testid')}:${node.getAttribute('data-tool-index-id')}`))
  check('Every catalog entry unique within its side',new Set(identifiers).size===identifiers.length)
  const gridColumns=await dialog.locator('.studio-index-list').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)
  check('Tool Index uses a multi-column grid',gridColumns>=2)
  const sample=dialog.locator('[data-tool-index-id="native:2d:A05"]')
  check('Internal Polygon clearly labeled',await sample.getByText('Internal Polygon/Line').count()===1)
  const filter=dialog.getByRole('textbox',{name:'Search all tools'})
  await filter.fill('internal polygon')
  check('Search filters native pattern tools',await dialog.locator('[data-tool-index-id="native:2d:A05"]').count()===1)
  check('Unrelated tool cards filter out',await dialog.locator('[data-tool-index-id="native:3d:A01"]').count()===0)
  await filter.fill('')
  await dialog.getByRole('button',{name:'Left · 3D'}).click()
  check('3D filter shows 3D cards',await dialog.locator('[data-tool-index-id="native:3d:A01"]').count()===1)
  check('3D filter hides 2D cards',await dialog.locator('[data-tool-index-id="native:2d:A05"]').count()===0)
  await dialog.getByRole('button',{name:'All',exact:true}).click()
  const nativeCard=dialog.locator('[data-tool-index-id="native:2d:A05"]')
  const active=await nativeCard.getByRole('button',{name:/Remove Internal Polygon\/Line from right toolbar/}).count()
  if(active){
    await nativeCard.getByRole('button',{name:/Remove Internal Polygon\/Line from right toolbar/}).click()
    check('Native tool can be removed from toolbar in Settings',await nativeCard.getByRole('button',{name:/Add Internal Polygon\/Line to right toolbar/}).count()===1)
    await nativeCard.getByRole('button',{name:/Add Internal Polygon\/Line to right toolbar/}).click()
    check('Native tool can be restored from index',await nativeCard.getByRole('button',{name:/Remove Internal Polygon\/Line from right toolbar/}).count()===1)
  }
  check('EXO cards clearly marked Library only',await dialog.locator('[data-tool-index-id^="extra:"] .studio-index-library-status').count()>=35)
  const image='/tmp/exo-v2-installed-tool-index-grid-20261017.png'
  await dialog.screenshot({path:image})
  report.screenshot=image
  check('No runtime errors',report.errors.length===0)
  console.log(JSON.stringify({pass:true,entries:ids.length,native:ids.filter(i=>i.startsWith('native:')).length,extras:ids.filter(i=>i.startsWith('extra:')).length,gridColumns,...report},null,2))
}finally{await browser.close()}
