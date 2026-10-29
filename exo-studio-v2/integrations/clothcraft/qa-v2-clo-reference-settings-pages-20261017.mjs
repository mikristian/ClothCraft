// Verify every screenshot-derived CLO reference page appears in the shared V2
// Settings window without displacing the existing EXO pages. Run against an
// independently served production build: EXO_QA_URL=http://127.0.0.1:5189 node …
import assert from 'node:assert/strict'
import {mkdirSync} from 'node:fs'
import path from 'node:path'
import {chromium} from 'playwright-core'

const host=process.env.EXO_QA_URL||'http://127.0.0.1:5189'
const screenshots=path.resolve('research/screenshots/exo-clo-settings-reference-20261017')
mkdirSync(screenshots,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1560,height:980}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
const screenshotPages=[
 ['cloGraphicOptions','Graphic Options',['Antialiasing','Normal Blending']],
 ['cloViewControls','View Controls',['Pan','Zoom','Rotate','Pop-Up Menu']],
 ['cloShortcuts','Shortcuts',['Function','Shortcut']],
 ['cloUserInterface','User Interface',['Unit System','Mode & Toolbar']],
 ['clo3d','3D',['Mesh','Arrangement','Gizmo']],
 ['clo2d','2D',['Pattern','Notch']],
 ['cloOther','Other',['Modular Configurator','DM|x']],
 ['cloDefaultFiles','Default Files',['Project','Avatar','Materials']],
 ['cloApi','ClothCraft API',['Live connection','Automation catalog']],
 ['closet','CLOSET',[]],
]
try{
  await page.goto(`${host}/?desktop=1&engine=legacy&testSession=clo-reference-settings-20261017`,{waitUntil:'domcontentloaded'})
  const settings=page.getByRole('button',{name:'Open Studio Settings'})
  await settings.waitFor({timeout:30000})
  await settings.click()
  for(const [id,title,labels] of screenshotPages){
    const tab=page.getByTestId(`settings-tab-${id}`)
    await tab.click({timeout:15000})
    assert.equal(await tab.getAttribute('aria-current'),'page',`${title} is not the active page`)
    const body=await page.locator('.studio-settings-body').innerText()
    for(const label of labels)assert(body.includes(label),`${title} missing ${label}`)
    await page.getByTestId('studio-settings-dialog').screenshot({path:path.join(screenshots,`${id}.png`)})
  }
  for(const id of ['workspace','toolIndex','theme','environment','profile','preferences','filesApi','plugins'])
    assert.equal(await page.getByTestId(`settings-tab-${id}`).count(),1,`Original ${id} settings missing`)
  await page.getByTestId('settings-tab-theme').click()
  await page.getByRole('button',{name:'Reset defaults'}).click()
  await page.getByRole('button',{name:'Reset everything'}).click()
  const appearance=await page.evaluate(()=>({theme:document.querySelector('.app-shell')?.dataset.studioTheme,
    accent:document.querySelector('.app-shell')?.style.getPropertyValue('--studio-accent')}))
  assert.equal(appearance.theme,'graphite','Reset default no longer returns to Graphite')
  assert.equal(appearance.accent,'#c9cbcf','Neutral grey reset accent changed')
  assert.deepEqual(errors,[],'Unexpected browser errors')
  console.log(JSON.stringify({pass:true,captured:screenshotPages.length,appearance,images:screenshots},null,2))
} finally {await browser.close()}
