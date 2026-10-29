// File-menu and themed File Library smoke, isolated browser profile only.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const origin=process.env.EXO_TECHPACK_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const checks=[],errors=[]
try {
  const context=await browser.newContext({viewport:{width:1480,height:920}})
  const page=await context.newPage()
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/?desktop=1&testSession=tee',{waitUntil:'domcontentloaded',timeout:45000})
  const file=page.getByRole('button',{name:'File',exact:true})
  await file.click()
  await page.getByRole('menuitem',{name:'Open & Save'}).hover()
  await page.getByRole('menuitem',{name:'Open Tech Pack Studio…'}).click()
  const dialog=page.getByRole('dialog',{name:'Digital tech pack'})
  await dialog.waitFor()
  assert(await dialog.locator('.dtp-paper-frame').isVisible())
  checks.push('File > Open Tech Pack Studio opens embedded factory document')
  await dialog.getByRole('button',{name:'Close tech pack'}).click()
  await file.click()
  await page.getByRole('menuitem',{name:'Open & Save'}).hover()
  await page.getByRole('menuitem',{name:'Open File Library…'}).click()
  const library=page.getByRole('dialog',{name:'File Library'})
  await library.waitFor({timeout:20000})
  await library.getByRole('button',{name:/Manufacturing \/ Tech Packs/}).click()
  await library.getByRole('region',{name:'Current project Tech Pack'}).waitFor()
  assert(await library.getByRole('button',{name:/Open current Tech Pack/}).isEnabled())
  checks.push('File Library > Manufacturing / Tech Packs has current project action')
  const theme=await page.evaluate(()=>{
    const shell=document.querySelector('.app-shell'),library=document.querySelector('.exo-files')
    return{studio:getComputedStyle(shell).getPropertyValue('--studio-panel').trim(),file:getComputedStyle(library).backgroundColor}
  })
  assert(theme.studio&&theme.file&&theme.file!=='rgba(0, 0, 0, 0)',JSON.stringify(theme))
  checks.push('File Library resolves active studio theme surface')
  await library.getByRole('button',{name:/Open current Tech Pack/}).click()
  await dialog.waitFor()
  checks.push('File Library action reopens embedded Tech Pack Studio')
  assert.deepEqual(errors,[])
  checks.push('No browser JavaScript errors')
  console.log(JSON.stringify({pass:true,origin,checks,theme},null,2))
}catch(error){console.log(JSON.stringify({pass:false,origin,checks,errors,error:error.stack||String(error)},null,2));process.exitCode=1}
finally{await browser.close()}
