import {chromium} from 'playwright-core'
import assert from 'node:assert/strict'
const url=process.env.EXO_TEST_URL||'http://127.0.0.1:5991/?desktop=1&engine=clothcraft&testSession=matrix-20261028'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const rows=[]
try {
 for (const edge of ['top','bottom']) for (const width of ['board','workspace']) {
  const page=await browser.newPage({viewport:{width:1660,height:1000}})
  try {
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000})
   await page.locator('.main-layout').waitFor()
   if(edge==='top')await page.getByRole('button',{name:'Dock 2D tools horizontally above viewer'}).first().click()
   else {
    await page.getByRole('button',{name:'Drag Right tools panel'}).first().click({button:'right',force:true})
    await page.getByRole('menuitem',{name:'Dock toolbar at bottom'}).click()
   }
   if(width==='workspace')await page.getByRole('combobox',{name:'2D toolbar width'}).selectOption('workspace')
   const geo=await page.evaluate(()=>{
    const root=document.querySelector('.main-layout'),rect=selector=>root.querySelector(selector)?.getBoundingClientRect().toJSON()
    return {grid:getComputedStyle(root).gridTemplateRows,toolbar:rect('.clo-right-tool-palette'),viewer:rect('.workspaces'),library:rect('.asset-browser'),inspector:rect('.clo-object-browser')}
   })
   assert(geo.viewer.height>500,JSON.stringify(geo))
   assert(geo.library.height>500,JSON.stringify(geo))
   assert(geo.inspector.height>150,JSON.stringify(geo))
   if(edge==='top') assert(geo.toolbar.bottom<=Math.min(geo.viewer.top,geo.library.top,geo.inspector.top)+2,JSON.stringify(geo))
   else assert(geo.toolbar.top>=geo.viewer.bottom-2 && (width==='workspace'||geo.toolbar.top>=geo.library.bottom-2),JSON.stringify(geo))
   if(width==='workspace')assert(Math.abs(geo.toolbar.width-geo.viewer.width)<5,JSON.stringify(geo))
   else assert(geo.toolbar.width>geo.viewer.width+300,JSON.stringify(geo))
   rows.push({edge,width,grid:geo.grid,toolbarHeight:geo.toolbar.height,viewerHeight:geo.viewer.height,inspectorHeight:geo.inspector.height})
  }finally{await page.close()}
 }
 console.log(JSON.stringify({passed:true,rows},null,2))
}finally{await browser.close()}
