import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1000}})
try{
 await page.goto('http://127.0.0.1:5984/?desktop=1&engine=clothcraft&testSession=right-collapse-specific-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.main-layout').waitFor()
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const snapshot=()=>page.evaluate(()=>{const root=document.querySelector('.main-layout'),button=root.querySelector('.exo-right-independent-tools-arrow'),drag=root.querySelector('.clo-right-tool-palette [data-panel-handle="right"]'),palette=root.querySelector('.clo-right-tool-palette'),r=button.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{collapsed:root.dataset.rightToolsCollapsed,button:{x:r.x,y:r.y,w:r.width,h:r.height,display:getComputedStyle(button).display,visibility:getComputedStyle(button).visibility,hit:at===button||button.contains(at)||at?.closest?.('button')===button,top:at?.outerHTML?.slice(0,300),ancestor:at?.closest?.('button')?.outerHTML?.slice(0,220),z:getComputedStyle(button).zIndex},drag:drag?.getBoundingClientRect().toJSON(),palette:palette?.getBoundingClientRect().toJSON()}})
 const before=await snapshot();console.log('BEFORE',JSON.stringify(before));assert(before.button.w>18&&before.button.h>18&&before.button.hit,'visible, clickable collapse control')
 await page.getByRole('button',{name:'Collapse right tools toolbar'}).click()
 const after=await snapshot();console.log('CLOSED',JSON.stringify(after));assert.equal(after.collapsed,'true');assert.equal(after.palette,undefined);assert(after.button.hit)
 await page.getByRole('button',{name:'Expand right tools toolbar'}).click()
 const reopened=await snapshot();console.log('REOPENED',JSON.stringify(reopened));assert.equal(reopened.collapsed,'false');assert(reopened.palette?.width>40)
 console.log('PASS 2D toolbar collapse and reopen')
}finally{await browser.close()}
