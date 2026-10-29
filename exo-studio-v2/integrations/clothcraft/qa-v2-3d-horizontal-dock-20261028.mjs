import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 for(const edge of ['top','bottom']) for(const width of ['board','workspace']){
  const page=await browser.newPage({viewport:{width:1660,height:1000}})
  try{
   await page.goto((process.env.EXO_TEST_URL||'http://127.0.0.1:5991/?desktop=1&engine=clothcraft&testSession=3d')+'-'+edge+'-'+width,{waitUntil:'domcontentloaded'})
   await page.locator('.main-layout').waitFor()
   if(edge==='top')await page.getByRole('button',{name:'Dock 3D tools horizontally above viewer'}).first().click()
   else {await page.getByRole('button',{name:'Drag Left tools panel'}).first().click({button:'right',force:true});await page.getByRole('menuitem',{name:'Dock toolbar at bottom'}).click()}
   if(width==='workspace')await page.getByRole('combobox',{name:'3D toolbar width'}).selectOption('workspace')
   const result=await page.evaluate(()=>{const root=document.querySelector('.main-layout'),b=s=>root.querySelector(s)?.getBoundingClientRect().toJSON();return {placement:root.dataset.exoLeftToolsPlacement,grid:getComputedStyle(root).gridTemplateRows,rail:b('.tool-rail'),workspace:b('.workspaces'),library:b('.asset-browser'),inspector:b('.clo-object-browser')}})
   console.log(edge,width,JSON.stringify(result))
   assert(result.rail.width>200)
   assert(result.workspace.height>500)
   assert(result.library.height>500)
   assert(result.inspector.height>150)
   if(width==='workspace')assert(Math.abs(result.rail.width-result.workspace.width)<5)
   if(edge==='top')assert(result.rail.bottom<=result.workspace.top+2)
   else assert(result.rail.top>=result.workspace.bottom-2)
  }finally{await page.close()}
 }
}finally{await browser.close()}
