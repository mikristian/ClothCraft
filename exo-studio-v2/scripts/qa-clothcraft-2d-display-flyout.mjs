import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser = await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist']})
try {
  const page=await browser.newPage({viewport:{width:1536,height:960},reducedMotion:'reduce'})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(process.env.CLOTHCRAFT_QA_URL||'http://127.0.0.1:5188/?desktop=1&engine=clothcraft',
    {waitUntil:'domcontentloaded'})
  const group=page.locator('.cc-board .clo-corner-toolkit-2d .cc-2d-display-host')
  await group.waitFor({state:'visible',timeout:18000})
  const trigger=group.getByRole('button',{name:'2D Pattern Display'})
  const menu=group.getByRole('group',{name:'2D Pattern Display options'})
  assert.equal(await group.locator('.clo-corner-tool-options > button').count(),4)
  assert.equal(await page.locator('.cc-board .cc-2d-display-host').count(),1)
  assert.equal(await menu.isVisible(),false)
  const idleGlass=await page.evaluate(()=>{
    const rail=document.querySelector('.cc-board .clo-corner-toolkit-2d')
    const display=getComputedStyle(rail.querySelector('.cc-2d-display-trigger'))
    const sibling=getComputedStyle(rail.querySelector('.clo-corner-tool-group[data-tool-family="measure"] > button'))
    return {background:display.backgroundColor===sibling.backgroundColor,
      radius:display.borderRadius===sibling.borderRadius}
  })
  assert.equal(idleGlass.background,true,'Display button should inherit the same idle liquid-glass tile')
  assert.equal(idleGlass.radius,true,'Display button should have the same rounded glass corners')
  await trigger.hover()
  assert.equal(await menu.isVisible(),true,'Pattern Display should open on hover')
  const geometry=await page.evaluate(()=>{
    const rail=document.querySelector('.cc-board .clo-corner-toolkit-2d')
    const last=rail.querySelector('.cc-2d-display-host > button').getBoundingClientRect()
    const prior=rail.querySelector('.clo-corner-tool-group[data-tool-family="measure"] > button').getBoundingClientRect()
    const row=rail.querySelector('.cc-2d-display-menu').getBoundingClientRect()
    const CSS=getComputedStyle(rail.querySelector('.cc-2d-display-menu'))
    return {railCount:rail.querySelectorAll(':scope > .clo-corner-tool-group').length,
      equalX:Math.abs(prior.x-last.x),width:last.width,height:last.height,rowX:row.x,rowY:row.y,
      flexDirection:CSS.flexDirection,backdrop:CSS.backgroundColor,buttons:row.width}
  })
  assert.equal(geometry.railCount,9,'Display must be ninth shared rail group')
  assert.ok(geometry.equalX<2,'Pattern Display must align with other rail buttons: '+JSON.stringify(geometry))
  assert.equal(geometry.width,30)
  assert.ok(geometry.rowX>30&&geometry.buttons>125,'Flyout should be horizontal: '+JSON.stringify(geometry))
  assert.equal(geometry.flexDirection,'row')
  const reference=menu.getByRole('button',{name:'Show Reference Lines'})
  const before=await reference.getAttribute('aria-pressed')
  const boardBefore=await page.locator('.cc-board').getAttribute('data-reference-guides-visible')
  await reference.click()
  assert.notEqual(await reference.getAttribute('aria-pressed'),before,'Display toggle did not update')
  assert.notEqual(await page.locator('.cc-board').getAttribute('data-reference-guides-visible'),boardBefore,'Display toggle did not affect the native board')
  await trigger.focus()
  await page.keyboard.press('Escape')
  assert.equal(await menu.isVisible(),false,'Escape should dismiss flyout')
  await page.mouse.move(750,700)
  await trigger.hover()
  assert.equal(await menu.isVisible(),true,'Hover should reopen dismissed flyout')
  assert.deepEqual(errors,[],errors.join('; '))
  console.log('PASS native 2D Pattern Display: hover horizontal glass flyout, four real toggles, keyboard close/reopen; '+JSON.stringify(geometry))
} finally {await browser.close()}
