/** Disposable Chrome/Vite acceptance for the user-facing Modaris Tool Index. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from 'playwright-core'

const port=5668
const origin=`http://127.0.0.1:${port}`
const child=spawn('./node_modules/.bin/vite',['--host','127.0.0.1','--port',String(port),'--strictPort'],{
  cwd:process.cwd(),detached:true,stdio:'ignore',env:process.env,
})
let browser
let stage='vite startup'
const pageErrors=[]
// A congested shared Mac must never leave an orphan Vite/Chrome pair.
const deadline=setTimeout(()=>{
  console.error(JSON.stringify({passed:false,stage,error:'90-second browser acceptance deadline exceeded',pageErrors}))
  try{process.kill(-child.pid,'SIGTERM')}catch{}
  void browser?.close().catch(()=>{})
  process.exit(124)
},90000)
async function ready(){
  for(let attempt=0;attempt<90;attempt++){
    try{if((await fetch(origin,{signal:AbortSignal.timeout(700)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Disposable Vite server did not respond')
}

try{
  await ready()
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--ignore-gpu-blocklist','--disable-gpu']})
  const context=await browser.newContext({viewport:{width:1560,height:940}})
  const page=await context.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(20000)
  page.on('pageerror',error=>pageErrors.push(error.message))

  stage='open Studio Settings and browse F1–F8'
  await page.goto(`${origin}/?desktop=1&engine=legacy&testSession=modaris-toolbar-catalog-20261028`,{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open Studio Settings'}).waitFor({timeout:45000})
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-toolIndex').click()
  await page.getByTestId('tool-index-modaris').waitFor()
  const palettes=page.locator('[data-modaris-palette]')
  assert.ok(await palettes.count()>=9,'Expected F1–F8 and Modaris upper-menu groups')

  stage='search one Modaris F1 command and add it'
  const search=page.getByRole('textbox',{name:'Search Modaris tools'})
  await search.fill('developed point')
  const developed=page.locator('[data-tool-index-id="modaris:f1:developed-point"]')
  await developed.waitFor()
  await developed.getByRole('button',{name:'+ Toolbar'}).click()
  await page.getByTestId('visual-toolbar-builder').waitFor()
  assert.equal(await page.getByRole('button',{name:'Remove Developed point from custom toolbar'}).count(),1)

  stage='create all missing F1–F8 and menu toolbars'
  await page.getByTestId('settings-tab-toolIndex').click()
  await page.getByRole('button',{name:'+ Build complete Modaris toolbar set'}).click()
  await page.getByTestId('visual-toolbar-builder').waitFor()
  const tabs=page.locator('.exo-builder-tabs [role="tab"]')
  const total=await tabs.count()
  assert.ok(total>=10&&total<=16,`Expected complete palette set, got ${total} toolbars`)

  stage='repeat complete-set action without duplicate toolbars'
  await page.getByTestId('settings-tab-toolIndex').click()
  await page.getByRole('button',{name:'+ Build complete Modaris toolbar set'}).click()
  await page.getByTestId('visual-toolbar-builder').waitFor()
  assert.equal(await tabs.count(),total,'Repeated complete-set action duplicated toolbars')

  stage='save complete toolbar set and show a live custom toolbar'
  await page.getByRole('button',{name:'Save all active toolbars to library'}).click()
  assert.ok(await page.getByTestId('saved-toolbar-library').locator('article').count()>=total,'Saved toolbar collection is incomplete')
  await page.getByRole('checkbox',{name:'Show in workspace'}).check()
  // Studio Settings now applies through its stable footer action; the old
  // visible "Done" label is no longer present in the actual workspace.
  await page.getByTestId('studio-settings-apply').click()

  stage='collapse and expand the live toolbar'
  const live=page.locator('[data-custom-bar]').first()
  await live.waitFor()
  assert.ok(await live.locator('.exo-builder-livebar__tools button').count()>0)
  await live.getByRole('button',{name:/Collapse .* toolbar/}).click()
  assert.equal(await live.locator('.exo-builder-livebar__tools').count(),0)
  await live.getByRole('button',{name:/Expand .* toolbar/}).click()
  assert.ok(await live.locator('.exo-builder-livebar__tools button').count()>0)

  stage='verify toolbar persistence after reload'
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('[data-custom-bar]').first().waitFor({timeout:45000})
  assert.equal(pageErrors.length,0,`Unexpected page errors: ${pageErrors.join(' | ')}`)
  console.log(JSON.stringify({passed:true,toolbars:total,settingsCatalogVisible:true,search:true,noDuplicates:true,saved:true,liveCollapse:true,reopen:true,reload:true,pageErrors},null,2))
  await context.close()
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:String(error?.message||error),pageErrors},null,2))
  process.exitCode=1
}finally{
  clearTimeout(deadline)
  await browser?.close().catch(()=>{})
  try{process.kill(-child.pid,'SIGTERM')}catch{}
}
