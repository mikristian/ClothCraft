import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1000}})
try{
 await page.goto(process.env.EXO_TEST_URL||'http://127.0.0.1:5971/?desktop=1&engine=clothcraft&testSession=dock-loop',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.main-layout').waitFor()
 const dock=page.getByRole('button',{name:'Dock 2D tools horizontally above viewer'})
 await dock.first().click({timeout:20000})
 for (const scope of ['board','workspace']){
  const switcher=page.getByRole('button',{name:scope==='board'?'Switch toolbar to full board':'Switch toolbar to center workspace only'})
  if(scope==='workspace')await page.getByRole('button',{name:'Switch toolbar to center workspace only'}).click()
  await page.waitForTimeout(120)
  const data=await page.evaluate(()=>{const root=document.querySelector('.main-layout'),bar=root.querySelector('.clo-right-tool-palette'),workspace=root.querySelector('.workspaces'),library=root.querySelector('.asset-browser'),inspector=root.querySelector('.clo-object-browser'),rect=x=>x?.getBoundingClientRect().toJSON();return{scope:getComputedStyle(root).getPropertyValue('--exo-ribbon-width'),bar:rect(bar),workspace:rect(workspace),library:rect(library),inspector:rect(inspector),grid:getComputedStyle(root).gridTemplateRows,first:bar?.querySelector('button')?.getBoundingClientRect().toJSON()}})
  console.log(scope,JSON.stringify(data))
  assert(data.bar.width>200)
  assert(data.bar.bottom<=data.workspace.top+2)
  assert(data.workspace.height>500,'viewer cannot collapse')
  assert(data.library.height>500,'library cannot collapse')
  assert(data.inspector.height>150,'Object Browser cannot collapse')
  if(scope==='workspace')assert(Math.abs(data.bar.width-data.workspace.width)<5)
  else assert(data.bar.width>data.workspace.width+300)
 }
 await page.getByRole('button',{name:'Restore vertical 2D tools'}).first().click()
 const state=await page.evaluate(()=>({placement:document.querySelector('.main-layout')?.dataset.exoRightToolsPlacement,toolbar:document.querySelector('.clo-right-tool-palette')?.getBoundingClientRect().toJSON(),viewer:document.querySelector('.workspaces')?.getBoundingClientRect().toJSON()}))
 assert.equal(state.placement,'right');assert(state.viewer.height>500);console.log('RESTORE',JSON.stringify(state))
}finally{await browser.close()}
