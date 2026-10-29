import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1000}})
try{
 await page.goto('http://127.0.0.1:5991/?desktop=1&engine=clothcraft&testSession=bottom-dock-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.main-layout').waitFor()
 const grip=page.getByRole('button',{name:'Drag Right tools panel'}).first()
 await grip.click({button:'right',force:true})
 console.log('MENU',await page.locator('.exo-universal-context-menu').allTextContents())
 await page.getByRole('menuitem',{name:'Dock toolbar at bottom'}).click()
 await page.waitForTimeout(150)
 console.log('BOTTOM',JSON.stringify(await page.evaluate(()=>{const q=x=>document.querySelector(x)?.getBoundingClientRect().toJSON();return {grid:getComputedStyle(document.querySelector('.main-layout')).gridTemplateRows,bar:q('.clo-right-tool-palette'),viewer:q('.workspaces'),library:q('.asset-browser')}})))
}finally{await browser.close()}
