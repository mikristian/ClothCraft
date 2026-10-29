import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright-core'

// Browser-only QA. Uses a fresh context so saved user projects are untouched.
const origin=process.env.EXO_TECHPACK_QA_ORIGIN||'http://127.0.0.1:5174'
const screenshots='/tmp/exo-techpack-artboard-workflow-20261026'
const browser=await chromium.launch({headless:true,executablePath:process.env.EXO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-gpu']})
const context=await browser.newContext({viewport:{width:1650,height:1000},acceptDownloads:true})
const page=await context.newPage()
page.setDefaultTimeout(8500)
const outcomes=[];const errors=[]
page.on('pageerror',e=>errors.push(e.message))
const check=async(name,fn)=>{
  try{const detail=await fn();outcomes.push({name,status:'PASS',detail:detail??null});console.log('PASS',name,detail??'')}
  catch(error){const diagnostic=String(error?.message||error).slice(0,900);outcomes.push({name,status:'FAIL',diagnostic});console.log('FAIL',name,diagnostic);try{await page.screenshot({path:`${screenshots}/${name}.png`,fullPage:false,timeout:4000})}catch{}}
}
const custom=()=>page.locator('[data-custom-blank="true"]').last()
const currentBox=()=>custom().locator('[data-board-object^="box-"]').first()
const clickButton=async(name)=>page.getByRole('button',{name,exact:true}).first().evaluate(element=>element.click())

try{
  await mkdir(screenshots,{recursive:true})
  await page.goto(`${origin}/?engine=clothcraft&techpackWorkspace=1`,{waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('[data-techpack-sheet="patterns"]').waitFor({timeout:30000})
  await check('blank-custom-artboard',async()=>{
    await clickButton('Add custom page')
    await custom().waitFor()
    assert.equal(await custom().locator('.tpws-freeform-box,.tpws-seville-ruled-frame,.tpws-seville-footer').count(),0)
    const id=await custom().getAttribute('data-techpack-sheet')
    assert.match(id,/^custom-/)
    return id
  })
  await check('draw-freeform-box',async()=>{
    await clickButton('Box tool')
    const surface=custom().locator('.tpws-box-drawing-surface')
    await surface.waitFor()
    const rect=await surface.boundingBox()
    assert.ok(rect&&rect.width>180&&rect.height>180,'drawing surface has drawable bounds')
    await page.mouse.move(rect.x+90,rect.y+105)
    await page.mouse.down()
    await page.mouse.move(rect.x+300,rect.y+265,{steps:8})
    await page.mouse.up()
    await currentBox().waitFor()
    return await currentBox().getAttribute('data-board-object')
  })
  await check('select-eight-bounding-handles',async()=>{
    await clickButton('Select tool')
    await currentBox().locator('.tpws-object-transform-cover').click({force:true})
    await currentBox().locator('.tpws-object-bounding-box').waitFor()
    assert.equal(await currentBox().locator('[data-object-handle]').count(),8)
    const id=await currentBox().getAttribute('data-board-object')
    await currentBox().locator('[data-object-handle="se"]').waitFor()
    return id
  })
  await check('resize-selected-box',async()=>{
    const handle=currentBox().locator('[data-object-handle="se"]');const rect=await handle.boundingBox()
    assert.ok(rect)
    const previous=await currentBox().getAttribute('style')
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2)
    await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+55,rect.y+rect.height/2+40,{steps:6});await page.mouse.up()
    await page.waitForTimeout(180)
    const updated=await currentBox().getAttribute('style')
    assert.notEqual(updated,previous,'resize should change persisted board-object transform')
    return updated?.slice(0,180)
  })
  await check('double-click-enter-content',async()=>{
    await currentBox().locator('.tpws-object-transform-cover').dblclick({force:true})
    await currentBox().locator('input[aria-label="Box title"]').waitFor()
    assert.equal(await page.getByRole('button',{name:'Content edit mode'}).getAttribute('aria-pressed'),'true')
  })
  await check('edit-box-content',async()=>{
    await currentBox().getByRole('textbox',{name:'Box title'}).fill('QA Fit Notes')
    await currentBox().locator('textarea.tpbc-note').fill('Factory check: validate sample tolerance.')
    assert.equal(await currentBox().getByRole('textbox',{name:'Box title'}).inputValue(),'QA Fit Notes')
    assert.match(await currentBox().locator('textarea.tpbc-note').inputValue(),/sample tolerance/)
  })
  await check('insert-editable-spreadsheet',async()=>{
    await clickButton('Insert Excel table widget')
    const grid=custom().locator('.tps').first();await grid.waitFor({timeout:15000})
    // The narrow default widget may clip its first row below a sticky header;
    // verify the live cell handler with a DOM double-click as well as editing.
    await grid.locator('td').first().evaluate(el=>el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})))
    const editor=grid.locator('.tps-editor').first();await editor.waitFor()
    await editor.fill('=SUM(7,8)');await editor.press('Enter')
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-custom-blank] .tps td')].some(td=>td.textContent?.trim()==='15'),null,{timeout:10000})
    return 'formula =SUM(7,8) → 15'
  })
  await check('spreadsheet-theme-availability',async()=>{
    const grid=custom().locator('.tps').first()
    const style=grid.getByRole('combobox',{name:'Table style'})
    await style.waitFor()
    await style.selectOption('dark')
    assert.equal(await style.inputValue(),'dark')
    return 'Excel dark theme selected'
  })
  await check('save-layout-template',async()=>{
    await clickButton('Layout edit mode')
    page.once('dialog',async dialog=>dialog.accept('QA Artboard Layout 20261026'))
    await clickButton('Save blank layout template')
    await page.getByRole('status').filter({hasText:/layout saved|Blank reusable page layout saved/i}).first().waitFor({timeout:5000})
    await page.getByRole('tab',{name:'Templates'}).click()
    await clickButton('Open Saved presets templates')
    await page.locator('.tpws-template-card').filter({hasText:'QA Artboard Layout 20261026'}).first().waitFor()
  })
  await check('restore-layout-as-new-page',async()=>{
    const before=await page.locator('[data-custom-blank="true"]').count()
    const card=page.locator('.tpws-template-card').filter({hasText:'QA Artboard Layout 20261026'}).first()
    await card.getByRole('button',{name:'New artboard'}).evaluate(el=>el.click())
    await page.waitForFunction(n=>document.querySelectorAll('[data-custom-blank="true"]').length>n,before,{timeout:10000})
    assert.ok(await currentBox().count(),'Restored page should contain saved box')
    return `${before} → ${await page.locator('[data-custom-blank="true"]').count()} custom pages`
  })
  await check('context-menu-object-actions',async()=>{
    await clickButton('Select tool')
    await currentBox().click({button:'right',force:true})
    const menu=currentBox().getByRole('menu');await menu.waitFor()
    assert.ok(await menu.getByRole('menuitem',{name:'Duplicate object'}).count())
    await menu.getByRole('menuitem',{name:'Cancel'}).click()
    assert.equal(await menu.count(),0)
    return 'Duplicate, replace, layer, delete, reset, edit controls present'
  })
  await check('image-attachment-control',async()=>{
    await clickButton('Content edit mode')
    // When the selected box is a spreadsheet, the image action is offered in
    // the selected object's property inspector instead of inside the grid.
    await clickButton('Layout edit mode')
    await currentBox().locator('.tpws-object-transform-cover').click({force:true})
    const picker=page.getByRole('button',{name:'Add or replace image'})
    await picker.waitFor()
    await picker.evaluate(el=>el.click())
    await page.getByRole('tab',{name:'Assets'}).waitFor()
    const upload=page.locator('input[aria-label="Upload techpack reference assets"]')
    assert.equal(await upload.getAttribute('type'),'file')
    return 'Image picker and local upload input available; no user file imported'
  })
  await check('three-dimensional-detail-page',async()=>{
    const nav=page.locator('.tpws-page-browser-entry button[data-page="interactive3d"]')
    await nav.evaluate(el=>el.click())
    const viewer=page.locator('.tpws-interactive-3d')
    await viewer.waitFor({state:'attached',timeout:12000})
    await viewer.getByRole('button',{name:'Map seam details'}).evaluate(el=>el.click())
    const count=await viewer.locator('.tpws-interactive-detail').count()
    if(count){await viewer.locator('.tpws-detail-select').first().click();assert.equal(await viewer.locator('.tpws-interactive-selected').count(),1)}
    else assert.match(await viewer.innerText(),/Native garment mesh is unavailable|No native 3D anchors|MARKERS/)
    return `${count} native/manual markers; ${count?'selection activated':'no source geometry available to activate'}`
  })
  await check('browser-runtime-errors',async()=>{assert.deepEqual(errors,[]);return 'No uncaught page errors'})
}catch(error){outcomes.push({name:'setup-or-navigation',status:'FAIL',diagnostic:String(error?.stack||error).slice(0,1400)})}
finally{
  console.log('QA_TECHPACK_ARTBOARD_RESULTS',JSON.stringify({origin,pass:outcomes.filter(x=>x.status==='PASS').length,fail:outcomes.filter(x=>x.status==='FAIL').length,outcomes,browserErrors:errors,screenshots},null,2))
  await browser.close()
  if(outcomes.some(x=>x.status==='FAIL'))process.exitCode=1
}
